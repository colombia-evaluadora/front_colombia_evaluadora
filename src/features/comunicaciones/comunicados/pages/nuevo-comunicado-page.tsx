import { useRef, useState } from "react"
import { addDays, format } from "date-fns"
import { useNavigate } from "@tanstack/react-router"

import { ConfirmDiscardDialog } from "@/components/confirm-discard-dialog"
import {
  TableScreen,
  TableScreenBody,
  TableScreenFooter,
  TableScreenHeader,
  TableScreenTitle,
} from "@/components/layout/table-screen"
import { DatePicker } from "@/components/date-picker"
import { ErrorNoticeBanner } from "@/components/notice/error-notice-banner"
import { NoticeOutlet, NoticeProvider, queueNotice, useNotify } from "@/components/notice/notice-context"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import {
  ControlPointIcon,
  EyeIcon,
  InfoIcon,
  WarningCircleIcon,
} from "@/components/ui/icons"
import { Input } from "@/components/ui/input"
import { Textarea, TEXTAREA_OUTLINED } from "@/components/ui/textarea"
import { CharacterCounter } from "@/components/ui/character-counter"
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import { paths } from "@/config/paths"
import { minLength, required } from "@/lib/forms/messages"
import {
  LISTA_FORMA_PUBLICACION,
  predeterminadoDe,
  useListaComunicado,
} from "@/features/comunicaciones/comunicados/api/listas-valor"
import { FORMA_PROGRAMADA } from "@/features/comunicaciones/comunicados/api/comunicado-documento"
import { textoFallidos } from "@/features/comunicaciones/chat/api/mutations/use-crear-comunicado"
import {
  CONJUNTO_VACIO,
  TIPOS,
  esAspirantes,
  usePrevisualizarDocumento,
  usePublicarDocumento,
  type Cascada,
  type ComunicadoDocumentoInput,
  type Conjunto,
  type PrevisualizacionDocumento,
} from "@/features/comunicaciones/comunicados/api/comunicado-documento"
import { AdjuntosComunicadoCampo } from "@/features/comunicaciones/chat/components/adjuntos-comunicado"
import { ConjuntoDestinatarios, Etiqueta } from "@/features/comunicaciones/comunicados/components/conjunto-destinatarios"
import { SeccionPlegable } from "@/components/seccion-plegable"
import {
  enfocarPrimerError,
  erroresConjunto,
  ERRORES_MENSAJE,
  numeroDeCampo,
  resumenConjunto,
  sinPeriodos,
  soloFuncionariosInactivos,
  textoFiltros,
  textoPeriodo,
  type ErroresCampos,
} from "@/features/comunicaciones/comunicados/lib/conjunto"

const MAX_TITULO = 100
const MIN_MENSAJE = 10
const MAX_MENSAJE = 1000
const MAX_DIAS_PROGRAMADO = 90
const MAX_CONJUNTOS = 10

/** Ids de los controles de Contenido y Publicación: claves de sus errores (y destino del foco). */
const CAMPO = {
  titulo: "comunicado-titulo",
  mensaje: "comunicado-mensaje",
  fecha: "comunicado-fecha",
  visibleHasta: "comunicado-visible-hasta",
} as const

/**
 * Nuevo comunicado (informe de Comunicaciones §3.1; prototipo M.1.AGR.1 a M.1.AGR.5): una tarjeta
 * con paneles plegables —un "Destinatarios · conjunto N" por conjunto, Contenido y Publicación— y
 * Cancelar / Previsualizar arriba. Publicar o Programar solo se ofrece desde la previsualización.
 */
export function NuevoComunicadoPage() {
  // Con el proveedor montado, los errores salen en el banner de la página y no además como toast.
  return (
    <NoticeProvider>
      <NuevoComunicadoContent />
    </NoticeProvider>
  )
}

function NuevoComunicadoContent() {
  const navigate = useNavigate()
  const { notify } = useNotify()
  const [conjuntos, setConjuntos] = useState<Conjunto[]>([CONJUNTO_VACIO])
  // Opciones cargadas de cada conjunto: dan las etiquetas de la previsualización y el bloqueo de M.1.AGR.5.
  const datos = useRef<(Cascada | undefined)[]>([])
  const [, refrescar] = useState(0)
  const [abierto, setAbierto] = useState(0)
  const [titulo, setTitulo] = useState("")
  const [mensaje, setMensaje] = useState("")
  const [archivos, setArchivos] = useState<File[]>([])
  // Lista FORMA_PUBLICACION: sin elección explícita vale su predeterminado (Inmediata).
  const formas = useListaComunicado(LISTA_FORMA_PUBLICACION).data ?? []
  const [formaElegida, setPublicacion] = useState("")
  const publicacion = formaElegida || predeterminadoDe(formas)
  const [fecha, setFecha] = useState<Date | undefined>()
  const [visibleHasta, setVisibleHasta] = useState<Date | undefined>()
  const [intentado, setIntentado] = useState(false)
  const [descartar, setDescartar] = useState(false)
  const previsualizar = usePrevisualizarDocumento()
  const publicar = usePublicarDocumento()

  // Cancelar vuelve al listado de Comunicados institucionales (de donde se entra), no a la mensajería.
  const volver = () => void navigate({ to: paths.app.comunicacionesComunicados.getHref() })
  const sucio = !!titulo || !!mensaje || archivos.length > 0 || conjuntos.some((c) => c.tipos.length > 0 || !!c.sede)
  // También si todos los funcionarios elegidos de un conjunto están Inactivos en el EE (Regla 101).
  const bloqueado = conjuntos.some(
    (c, i) => sinPeriodos(c, datos.current[i]) || soloFuncionariosInactivos(c, datos.current[i]),
  )
  const mensajeLimpio = mensaje.trim()
  // Errores por id de control y en orden visual (conjuntos, Contenido, Publicación): el primero es
  // el que se enfoca. Se recalculan en cada render, así se van apagando al corregir.
  const errores: ErroresCampos = conjuntos.reduce<ErroresCampos>((acc, c, i) => ({ ...acc, ...erroresConjunto(c, i + 1) }), {})
  if (!titulo.trim()) errores[CAMPO.titulo] = required("El título")
  if (mensajeLimpio.length < MIN_MENSAJE) errores[CAMPO.mensaje] = mensajeLimpio ? minLength(MIN_MENSAJE, "El mensaje") : required("El mensaje")
  if (publicacion === FORMA_PROGRAMADA && !fecha) errores[CAMPO.fecha] = required("La fecha y hora programada", { femenino: true })
  else if (publicacion === FORMA_PROGRAMADA && fecha && fecha <= new Date()) {
    errores[CAMPO.fecha] = "La fecha y hora programada debe ser posterior a la actual."
  }
  if (visibleHasta && format(visibleHasta, "yyyy-MM-dd") <= format(fecha ?? new Date(), "yyyy-MM-dd")) {
    errores[CAMPO.visibleHasta] = "Visible hasta debe ser posterior a la fecha de publicación."
  }
  // Como en planeador: los campos se marcan en rojo recién tras el primer intento.
  const visibles: ErroresCampos = intentado ? errores : {}

  const entrada = (): ComunicadoDocumentoInput => ({
    titulo: titulo.trim(),
    mensaje: mensajeLimpio,
    conjuntos: conjuntos.map((c, i) => ({ conjunto: c, resumen: resumenConjunto(c, datos.current[i]) })),
    publicacion,
    publicarEn: publicacion === FORMA_PROGRAMADA && fecha ? fecha.toISOString() : null,
    visibleHasta: visibleHasta ? format(visibleHasta, "yyyy-MM-dd") : null,
    archivos,
  })

  return (
    <TableScreen>
      <TableScreenHeader>
        <TableScreenTitle description="Comunicados institucionales">Nuevo comunicado</TableScreenTitle>
      </TableScreenHeader>

      <TableScreenBody className="rounded-b-none border-b-0" contentClassName="space-y-3">
          <ErrorNoticeBanner error={previsualizar.isError ? previsualizar.error : null} />
          <NoticeOutlet />

          <div className="overflow-hidden rounded-lg border">
            {conjuntos.map((c, i) => (
              <SeccionPlegable
                // El orden no cambia salvo al quitar; el índice basta como clave junto con el total.
                key={`${i}-${conjuntos.length}`}
                titulo={`Destinatarios · conjunto ${i + 1}`}
                abierto={abierto === i}
                onAlternar={() => setAbierto(abierto === i ? -1 : i)}
                accion={
                  conjuntos.length > 1 ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      color="destructive"
                      onClick={() => {
                        datos.current.splice(i, 1)
                        setConjuntos((prev) => prev.filter((_, j) => j !== i))
                        setAbierto(0)
                      }}
                    >
                      Quitar
                    </Button>
                  ) : undefined
                }
              >
                <ConjuntoDestinatarios
                  numero={i + 1}
                  conjunto={c}
                  onChange={(nuevo) => setConjuntos((prev) => prev.map((x, j) => (j === i ? nuevo : x)))}
                  errores={visibles}
                  onDatos={(d) => {
                    datos.current[i] = d
                    refrescar((n) => n + 1)
                  }}
                />
              </SeccionPlegable>
            ))}

            <SeccionPlegable titulo="Contenido">
              <div className="space-y-4">
                <Field variant="outlined" data-invalid={visibles[CAMPO.titulo] ? true : undefined}>
                  <FieldLabel htmlFor={CAMPO.titulo}>
                    Título<span className="text-red"> *</span>
                  </FieldLabel>
                  <Input
                    id={CAMPO.titulo}
                    placeholder="Agregar"
                    value={titulo}
                    maxLength={MAX_TITULO}
                    aria-invalid={!!visibles[CAMPO.titulo]}
                    onChange={(e) => setTitulo(e.target.value)}
                  />
                  <CharacterCounter value={titulo} max={MAX_TITULO} />
                  {visibles[CAMPO.titulo] && <FieldError>{visibles[CAMPO.titulo]}</FieldError>}
                </Field>
                <Field
                  variant="outlined"
                  data-invalid={visibles[CAMPO.mensaje] ? true : undefined}
                >
                  <FieldLabel htmlFor={CAMPO.mensaje}>
                    Mensaje<span className="text-red"> *</span>
                  </FieldLabel>
                  <Textarea
                    id={CAMPO.mensaje}
                    placeholder="Agregar"
                    className={TEXTAREA_OUTLINED}
                    value={mensaje}
                    rows={4}
                    maxLength={MAX_MENSAJE}
                    aria-invalid={!!visibles[CAMPO.mensaje]}
                    onChange={(e) => setMensaje(e.target.value)}
                  />
                  <CharacterCounter value={mensaje} max={MAX_MENSAJE} />
                  {visibles[CAMPO.mensaje] && <FieldError>{visibles[CAMPO.mensaje]}</FieldError>}
                </Field>
                <AdjuntosComunicadoCampo variante="chips" archivos={archivos} onArchivos={setArchivos} deshabilitado={publicar.isPending} />
              </div>
            </SeccionPlegable>

            <SeccionPlegable titulo="Publicación">
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="min-w-0 space-y-2">
                  <Etiqueta>Publicación</Etiqueta>
                  <div className="flex min-h-9 flex-wrap items-center gap-x-4 gap-y-2 text-sm" role="radiogroup" aria-label="Publicación">
                    {formas.map((o) => (
                      <label key={o.valor} className="flex items-center gap-2">
                        <input
                          type="radio"
                          name="comunicado-publicacion"
                          checked={publicacion === o.valor}
                          onChange={() => {
                            setPublicacion(o.valor)
                            if (o.valor !== FORMA_PROGRAMADA) setFecha(undefined)
                          }}
                        />
                        {o.etiqueta}
                      </label>
                    ))}
                  </div>
                </div>
                <Field variant="outlined" className="min-w-0" data-invalid={visibles[CAMPO.fecha] ? true : undefined}>
                  <FieldLabel htmlFor={CAMPO.fecha}>
                    Fecha y hora<span className="text-red"> *</span>
                  </FieldLabel>
                  <DatePicker
                    id={CAMPO.fecha}
                    mode="datetime"
                    aria-invalid={!!visibles[CAMPO.fecha]}
                    value={fecha}
                    onChange={setFecha}
                    disabled={publicacion !== FORMA_PROGRAMADA}
                    minDate={new Date()}
                    maxDate={addDays(new Date(), MAX_DIAS_PROGRAMADO)}
                  />
                  {visibles[CAMPO.fecha] && <FieldError>{visibles[CAMPO.fecha]}</FieldError>}
                </Field>
                <Field
                  variant="outlined"
                  className="min-w-0"
                  data-invalid={visibles[CAMPO.visibleHasta] ? true : undefined}
                >
                  <FieldLabel htmlFor={CAMPO.visibleHasta}>Visible hasta</FieldLabel>
                  <DatePicker
                    id={CAMPO.visibleHasta}
                    aria-invalid={!!visibles[CAMPO.visibleHasta]}
                    value={visibleHasta}
                    onChange={setVisibleHasta}
                    minDate={addDays(fecha ?? new Date(), 1)}
                  />
                  {visibles[CAMPO.visibleHasta] && <FieldError>{visibles[CAMPO.visibleHasta]}</FieldError>}
                </Field>
              </div>
            </SeccionPlegable>
          </div>

          <div>
            <Button
              type="button"
              variant="outline"
              color="neutral"
              disabled={conjuntos.length >= MAX_CONJUNTOS}
              onClick={() => {
                setConjuntos((prev) => [...prev, CONJUNTO_VACIO])
                setAbierto(conjuntos.length)
              }}
            >
              <ControlPointIcon data-icon="inline-start" />
              Agregar otro conjunto
            </Button>
            <p className="mt-2 text-xs text-muted-foreground">Los campos marcados con * son obligatorios</p>
          </div>
      </TableScreenBody>
      <TableScreenFooter>
        <span />
        <div className="flex gap-2">
          <Button type="button" variant="outline" color="neutral" onClick={() => (sucio ? setDescartar(true) : volver())}>
            Cancelar
          </Button>
          <Button
            type="button"
            // Sin períodos Abiertos en algún conjunto no se publica para esa audiencia (M.1.AGR.5).
            disabled={bloqueado || previsualizar.isPending}
            aria-busy={previsualizar.isPending}
            onClick={() => {
              setIntentado(true)
              const primero = Object.keys(errores)[0]
              if (primero) {
                // Aviso único arriba; el detalle va en cada campo. Si el primer error está en un
                // conjunto plegado, se abre ese panel antes de llevar el foco.
                notify(ERRORES_MENSAJE, { variant: "error" })
                const numero = numeroDeCampo(primero)
                if (numero != null) setAbierto(numero - 1)
                enfocarPrimerError(errores)
                return
              }
              previsualizar.mutate(entrada())
            }}
          >
            <EyeIcon data-icon="inline-start" />
            Previsualizar
          </Button>
        </div>
      </TableScreenFooter>

      {previsualizar.data && (
        <PrevisualizarDialog
          datos={previsualizar.data}
          titulo={titulo.trim()}
          conjuntos={conjuntos.map((c, i) => ({
            periodo: textoPeriodo(c, datos.current[i]),
            filtros: textoFiltros(c, datos.current[i]),
            inscripciones: esAspirantes(c),
          }))}
          // Tipos que no se eligieron en ningún conjunto: la previsualización lo dice antes de confirmar.
          tiposSinElegir={TIPOS.filter((t) => !conjuntos.some((c) => c.tipos.includes(t.valor))).map((t) => t.etiqueta)}
          programada={publicacion === FORMA_PROGRAMADA}
          pendiente={publicar.isPending}
          conArchivos={archivos.length > 0}
          error={publicar.isError ? publicar.error : null}
          onVolver={() => {
            publicar.reset()
            previsualizar.reset()
          }}
          onPublicar={() =>
            publicar.mutate(
              { ...entrada(), unicosConfirmados: previsualizar.data?.unicos },
              {
                onSuccess: ({ canal, fallidos }) => {
                  const aviso =
                    publicacion === FORMA_PROGRAMADA
                      ? `Se programó el comunicado ${canal.nombre}.`
                      : `Se publicó el comunicado ${canal.nombre}.`
                  const adjuntos = textoFallidos(fallidos)
                  queueNotice(adjuntos ? `${aviso} ${adjuntos}` : aviso, adjuntos ? { variant: "warning" } : undefined)
                  // Tras publicar o programar se vuelve al listado (pestaña Publicados), donde se ve el nuevo comunicado.
                  void navigate({ to: paths.app.comunicacionesComunicados.getHref(), search: { pestana: "PUBLICADOS" } })
                },
              },
            )
          }
        />
      )}

      <ConfirmDiscardDialog
        open={descartar}
        onOpenChange={setDescartar}
        onConfirm={() => {
          setDescartar(false)
          volver()
        }}
      />
    </TableScreen>
  )
}

/** Previsualizar y publicar (prototipo M.1.AGR.2). */
function PrevisualizarDialog({
  datos: d,
  titulo,
  conjuntos,
  tiposSinElegir,
  programada,
  pendiente,
  conArchivos,
  error,
  onVolver,
  onPublicar,
}: {
  datos: PrevisualizacionDocumento
  titulo: string
  // `inscripciones`: conjunto de Aspirantes (período en Inscripciones, no Abierto).
  conjuntos: { periodo: string | null; filtros: string; inscripciones: boolean }[]
  tiposSinElegir: string[]
  programada: boolean
  pendiente: boolean
  conArchivos: boolean
  error: unknown
  onVolver: () => void
  onPublicar: () => void
}) {
  const [verSinCanal, setVerSinCanal] = useState(false)
  const tipos = [
    d.estudiantes > 0 && `Estudiantes ${d.estudiantes}`,
    d.acudientes > 0 &&
      `Acudientes ${d.acudientes} (de ${d.estudiantesReferencia} ${d.estudiantesReferencia === 1 ? "estudiante" : "estudiantes"})`,
    d.funcionarios > 0 && `Funcionarios ${d.funcionarios}`,
  ].filter(Boolean)

  return (
    <Dialog open onOpenChange={(o) => !o && !pendiente && onVolver()}>
      {/* Sin X: el pie ya tiene Volver; Escape cierra salvo mientras se publica (onOpenChange). */}
      <DialogContent showCloseButton={false} className="flex max-h-[90dvh] flex-col overflow-hidden sm:max-w-xl">
        {/* Cabecera y pie fijos: solo el cuerpo hace scroll. */}
        <DialogHeader className="shrink-0">
          <DialogTitle>Previsualizar — {titulo}</DialogTitle>
        </DialogHeader>
        <div className="min-h-0 flex-1 space-y-2 overflow-y-auto text-sm">
          <ErrorNoticeBanner error={error ?? null} />
          <p className="text-base font-semibold">Destinatarios únicos: {d.unicos}</p>
          {tipos.length > 0 && <p>{tipos.join(" · ")}</p>}
          <p>
            Con aviso en la plataforma {d.conAviso} · Solo por correo {d.soloCorreo} · Sin canal {d.sinCanal.length}
            {d.sinCanal.length > 0 && (
              <button
                type="button"
                className="ml-3 font-medium text-primary"
                aria-expanded={verSinCanal}
                onClick={() => setVerSinCanal((v) => !v)}
              >
                {verSinCanal ? "Ocultar" : "Ver"}
              </button>
            )}
          </p>
          {verSinCanal && (
            <ul className="rounded-md border p-2 text-xs">
              {d.sinCanal.map((p, i) => (
                <li key={`${p.nombre}-${i}`} className="break-words">
                  {p.nombre} · {p.tipo} · {p.motivo}
                  {p.grupo ? ` · ${p.grupo}` : ""}
                </li>
              ))}
            </ul>
          )}
          <hr />
          {conjuntos.map((c, i) => (
            <div key={`${c.filtros}-${i}`} className="space-y-2">
              {c.periodo && (
                <p className="flex flex-wrap items-center gap-2">
                  <span className="min-w-0 break-words">
                    <span className="font-semibold">Período:</span> {c.periodo}
                  </span>
                  {c.inscripciones ? (
                    <Badge variant="soft" color="info">
                      Inscripciones
                    </Badge>
                  ) : (
                    <Badge variant="soft" color="success">
                      Abierto
                    </Badge>
                  )}
                </p>
              )}
              {c.filtros && (
                <p className="break-words">
                  <span className="font-semibold">Filtros:</span> {c.filtros}
                </p>
              )}
            </div>
          ))}
          {[...tiposSinElegir.map((t) => `${t}: no se eligió ese tipo.`), ...d.avisos].map((a) => (
            <p key={a} className="flex items-start gap-2 text-yellow">
              <WarningCircleIcon aria-hidden className="mt-0.5 size-4 shrink-0" />
              {a}
            </p>
          ))}
          {d.unicos === 0 && (
            <p role="alert" className="text-red">
              No hay personas en los destinatarios elegidos.
            </p>
          )}
          <p className="flex items-start gap-2">
            <InfoIcon aria-hidden className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
            Un acudiente de varios estudiantes recibe una sola copia.
          </p>
        </div>
        <DialogFooter className="shrink-0">
          <Button type="button" variant="outline" color="neutral" disabled={pendiente} onClick={onVolver}>
            Volver
          </Button>
          <Button type="button" disabled={pendiente || d.conAviso + d.soloCorreo === 0} aria-busy={pendiente} onClick={onPublicar}>
            {pendiente && conArchivos ? "Subiendo archivos…" : programada ? "Programar" : "Publicar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
