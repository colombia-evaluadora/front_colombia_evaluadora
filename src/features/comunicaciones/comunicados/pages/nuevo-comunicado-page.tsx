import { useRef, useState, type ReactNode } from "react"
import { addDays, format } from "date-fns"
import { useNavigate } from "@tanstack/react-router"

import { ConfirmDiscardDialog } from "@/components/confirm-discard-dialog"
import { DatePicker } from "@/components/date-picker"
import { ErrorNoticeBanner } from "@/components/notice/error-notice-banner"
import { NoticeProvider, queueNotice } from "@/components/notice/notice-context"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import {
  CaretDownIcon,
  CaretRightIcon,
  ControlPointIcon,
  EyeIcon,
  InfoIcon,
  WarningCircleIcon,
  XIcon,
} from "@/components/ui/icons"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { paths } from "@/config/paths"
import { textoFallidos } from "@/features/comunicaciones/chat/api/mutations/use-crear-comunicado"
import { validarAdjunto } from "@/features/comunicaciones/chat/lib/archivo-adjunto"
import {
  CONJUNTO_VACIO,
  TIPOS,
  usePrevisualizarDocumento,
  usePublicarDocumento,
  type Cascada,
  type ComunicadoDocumentoInput,
  type Conjunto,
  type PrevisualizacionDocumento,
} from "@/features/comunicaciones/comunicados/api/comunicado-documento"
import { ConjuntoDestinatarios, Etiqueta } from "@/features/comunicaciones/comunicados/components/conjunto-destinatarios"
import {
  faltantesConjunto,
  resumenConjunto,
  sinPeriodos,
  textoFiltros,
  textoPeriodo,
} from "@/features/comunicaciones/comunicados/lib/conjunto"

const MAX_TITULO = 100
const MIN_MENSAJE = 10
const MAX_MENSAJE = 1000
const MAX_DIAS_PROGRAMADO = 90
const MAX_CONJUNTOS = 10
const MAX_ADJUNTOS = 5
const MAX_ADJUNTO_MB = 10

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
  const [conjuntos, setConjuntos] = useState<Conjunto[]>([CONJUNTO_VACIO])
  // Opciones cargadas de cada conjunto: dan las etiquetas de la previsualización y el bloqueo de M.1.AGR.5.
  const datos = useRef<(Cascada | undefined)[]>([])
  const [, refrescar] = useState(0)
  const [abierto, setAbierto] = useState(0)
  const [titulo, setTitulo] = useState("")
  const [mensaje, setMensaje] = useState("")
  const [archivos, setArchivos] = useState<File[]>([])
  const [rechazo, setRechazo] = useState<string | null>(null)
  const [publicacion, setPublicacion] = useState<"INMEDIATA" | "PROGRAMADA">("INMEDIATA")
  const [fecha, setFecha] = useState<Date | undefined>()
  const [visibleHasta, setVisibleHasta] = useState<Date | undefined>()
  const [intentado, setIntentado] = useState(false)
  const [descartar, setDescartar] = useState(false)
  const selector = useRef<HTMLInputElement>(null)
  const previsualizar = usePrevisualizarDocumento()
  const publicar = usePublicarDocumento()

  const volver = () => void navigate({ to: paths.app.comunicacionesChat.getHref() })
  const sucio = !!titulo || !!mensaje || archivos.length > 0 || conjuntos.some((c) => c.tipos.length > 0 || !!c.sede)
  const bloqueado = conjuntos.some((c, i) => sinPeriodos(c, datos.current[i]))
  const mensajeLimpio = mensaje.trim()
  const faltantes = [
    ...conjuntos.flatMap((c, i) => faltantesConjunto(c).map((f) => `Conjunto ${i + 1}: falta ${f}.`)),
    ...(titulo.trim() ? [] : ["Falta el título."]),
    ...(mensajeLimpio.length < MIN_MENSAJE ? [`El mensaje debe tener al menos ${MIN_MENSAJE} caracteres.`] : []),
    ...(publicacion === "PROGRAMADA" && !fecha ? ["Falta la fecha y hora programada."] : []),
    ...(publicacion === "PROGRAMADA" && fecha && fecha <= new Date()
      ? ["La fecha y hora programada debe ser posterior a la actual."]
      : []),
    ...(visibleHasta && format(visibleHasta, "yyyy-MM-dd") <= format(fecha ?? new Date(), "yyyy-MM-dd")
      ? ["Visible hasta debe ser posterior a la fecha de publicación."]
      : []),
  ]

  const entrada = (): ComunicadoDocumentoInput => ({
    titulo: titulo.trim(),
    mensaje: mensajeLimpio,
    conjuntos: conjuntos.map((c, i) => ({ conjunto: c, resumen: resumenConjunto(c, datos.current[i]) })),
    publicacion,
    publicarEn: publicacion === "PROGRAMADA" && fecha ? fecha.toISOString() : null,
    visibleHasta: visibleHasta ? format(visibleHasta, "yyyy-MM-dd") : null,
    archivos,
  })

  const agregarArchivos = (nuevos: File[]) => {
    setRechazo(null)
    const aceptados = [...archivos]
    for (const f of nuevos) {
      const error = validarAdjunto(f, MAX_ADJUNTO_MB)
      if (error) setRechazo(`${f.name}: ${error}`)
      else if (aceptados.length >= MAX_ADJUNTOS) setRechazo(`Puede adjuntar máximo ${MAX_ADJUNTOS} archivos.`)
      else if (!aceptados.some((x) => x.name === f.name && x.size === f.size)) aceptados.push(f)
    }
    setArchivos(aceptados)
  }

  return (
    <div className="mx-auto w-full max-w-5xl min-w-0 p-4">
      <div className="rounded-lg border bg-card">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3">
          <h1 className="min-w-0 text-base font-medium break-words">Comunicados institucionales › Nuevo comunicado</h1>
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
                if (faltantes.length > 0) return
                previsualizar.mutate(entrada())
              }}
            >
              <EyeIcon data-icon="inline-start" />
              Previsualizar
            </Button>
          </div>
        </header>

        <div className="space-y-3 p-4">
          <ErrorNoticeBanner error={previsualizar.isError ? previsualizar.error : null} />
          {intentado && faltantes.length > 0 && (
            <div role="alert" className="flex items-start gap-2 rounded-md border border-red-stroke bg-red-22 px-3 py-2 text-sm">
              <WarningCircleIcon aria-hidden className="mt-0.5 size-4 shrink-0 text-red" />
              <ul className="min-w-0 list-inside list-disc">
                {faltantes.map((f) => (
                  <li key={f}>{f}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="overflow-hidden rounded-lg border">
            {conjuntos.map((c, i) => (
              <Panel
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
                  onDatos={(d) => {
                    datos.current[i] = d
                    refrescar((n) => n + 1)
                  }}
                />
              </Panel>
            ))}

            <Panel titulo="Contenido">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Etiqueta requerido htmlFor="comunicado-titulo">
                    Título
                  </Etiqueta>
                  <div className="relative">
                    <Input
                      id="comunicado-titulo"
                      className="pr-20"
                      value={titulo}
                      maxLength={MAX_TITULO}
                      aria-invalid={intentado && !titulo.trim()}
                      onChange={(e) => setTitulo(e.target.value)}
                    />
                    <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-muted-foreground tabular-nums">
                      {titulo.length} / {MAX_TITULO}
                    </span>
                  </div>
                </div>
                <div className="space-y-2">
                  <Etiqueta requerido htmlFor="comunicado-mensaje">
                    Mensaje
                  </Etiqueta>
                  <Textarea
                    id="comunicado-mensaje"
                    value={mensaje}
                    rows={4}
                    maxLength={MAX_MENSAJE}
                    aria-invalid={intentado && mensajeLimpio.length < MIN_MENSAJE}
                    onChange={(e) => setMensaje(e.target.value)}
                  />
                  <p className="text-right text-xs text-muted-foreground tabular-nums">
                    {mensaje.length} / {MAX_MENSAJE}
                  </p>
                </div>
                <div className="space-y-2">
                  <Etiqueta>Adjuntos</Etiqueta>
                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      ref={selector}
                      type="file"
                      multiple
                      hidden
                      onChange={(e) => {
                        agregarArchivos(Array.from(e.target.files ?? []))
                        e.target.value = ""
                      }}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      color="neutral"
                      disabled={archivos.length >= MAX_ADJUNTOS || publicar.isPending}
                      onClick={() => selector.current?.click()}
                    >
                      Cargar archivos
                    </Button>
                    {archivos.map((f) => (
                      <span
                        key={`${f.name}-${f.size}`}
                        className="inline-flex max-w-full items-center gap-1 rounded border px-2 py-0.5 text-xs"
                      >
                        <span className="min-w-0 truncate">{f.name}</span>
                        <button
                          type="button"
                          aria-label={`Quitar ${f.name}`}
                          className="rounded hover:bg-muted"
                          onClick={() => setArchivos((prev) => prev.filter((x) => x !== f))}
                        >
                          <XIcon className="size-3.5" />
                        </button>
                      </span>
                    ))}
                    <span className="text-sm text-muted-foreground">
                      {archivos.length} de {MAX_ADJUNTOS} · {MAX_ADJUNTO_MB} MB cada uno
                    </span>
                  </div>
                  {rechazo && (
                    <p role="alert" className="text-xs text-red">
                      {rechazo}
                    </p>
                  )}
                </div>
              </div>
            </Panel>

            <Panel titulo="Publicación">
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="min-w-0 space-y-2">
                  <Etiqueta>Publicación</Etiqueta>
                  <div className="flex min-h-9 flex-wrap items-center gap-x-4 gap-y-2 text-sm" role="radiogroup" aria-label="Publicación">
                    {(
                      [
                        ["INMEDIATA", "Inmediata"],
                        ["PROGRAMADA", "Programada"],
                      ] as const
                    ).map(([valor, etiqueta]) => (
                      <label key={valor} className="flex items-center gap-2">
                        <input
                          type="radio"
                          name="comunicado-publicacion"
                          checked={publicacion === valor}
                          onChange={() => {
                            setPublicacion(valor)
                            if (valor === "INMEDIATA") setFecha(undefined)
                          }}
                        />
                        {etiqueta}
                      </label>
                    ))}
                  </div>
                </div>
                <div className="min-w-0 space-y-2">
                  <Etiqueta requerido>Fecha y hora</Etiqueta>
                  <DatePicker
                    mode="datetime"
                    value={fecha}
                    onChange={setFecha}
                    disabled={publicacion !== "PROGRAMADA"}
                    minDate={new Date()}
                    maxDate={addDays(new Date(), MAX_DIAS_PROGRAMADO)}
                  />
                </div>
                <div className="min-w-0 space-y-2">
                  <Etiqueta>Visible hasta</Etiqueta>
                  <DatePicker value={visibleHasta} onChange={setVisibleHasta} minDate={addDays(fecha ?? new Date(), 1)} />
                </div>
              </div>
            </Panel>
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
        </div>
      </div>

      {previsualizar.data && (
        <PrevisualizarDialog
          datos={previsualizar.data}
          titulo={titulo.trim()}
          conjuntos={conjuntos.map((c, i) => ({
            periodo: textoPeriodo(c, datos.current[i]),
            filtros: textoFiltros(c, datos.current[i]),
          }))}
          // Tipos que no se eligieron en ningún conjunto: la previsualización lo dice antes de confirmar.
          tiposSinElegir={TIPOS.filter((t) => !conjuntos.some((c) => c.tipos.includes(t.valor))).map((t) => t.etiqueta)}
          programada={publicacion === "PROGRAMADA"}
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
                    publicacion === "PROGRAMADA"
                      ? `Se programó el comunicado ${canal.nombre}.`
                      : `Se publicó el comunicado ${canal.nombre}.`
                  const adjuntos = textoFallidos(fallidos)
                  queueNotice(adjuntos ? `${aviso} ${adjuntos}` : aviso, adjuntos ? { variant: "warning" } : undefined)
                  void navigate({ to: paths.app.comunicacionesChat.getHref(), search: { canal: canal.id } })
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
    </div>
  )
}

/** Panel plegable con encabezado gris y flecha, como los del prototipo. Sin `onAlternar` se pliega solo. */
function Panel({
  titulo,
  abierto,
  onAlternar,
  accion,
  children,
}: {
  titulo: string
  abierto?: boolean
  onAlternar?: () => void
  accion?: ReactNode
  children: ReactNode
}) {
  const [propio, setPropio] = useState(true)
  const visible = onAlternar ? !!abierto : propio
  return (
    <section className="border-b last:border-b-0">
      <div className="flex items-center gap-2 bg-muted/40 px-3 py-2">
        <button
          type="button"
          aria-expanded={visible}
          className="flex min-w-0 flex-1 items-center gap-2 py-1 text-left text-sm"
          onClick={() => (onAlternar ? onAlternar() : setPropio((v) => !v))}
        >
          {visible ? <CaretDownIcon aria-hidden className="size-4 shrink-0" /> : <CaretRightIcon aria-hidden className="size-4 shrink-0" />}
          <span className="min-w-0 break-words">{titulo}</span>
        </button>
        {accion}
      </div>
      {/* Plegado se oculta, no se desmonta: el conjunto conserva sus opciones cargadas. */}
      <div className="border-t p-4" hidden={!visible}>
        {children}
      </div>
    </section>
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
  conjuntos: { periodo: string | null; filtros: string }[]
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
      <DialogContent className="flex max-h-[90dvh] flex-col sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Previsualizar — {titulo}</DialogTitle>
        </DialogHeader>
        <ErrorNoticeBanner error={error ?? null} />
        <div className="min-h-0 space-y-2 overflow-y-auto text-sm">
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
                  <Badge variant="soft" color="success">
                    Abierto
                  </Badge>
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
        <DialogFooter>
          <Button type="button" variant="outline" color="neutral" disabled={pendiente} onClick={onVolver}>
            Volver
          </Button>
          <Button type="button" disabled={pendiente || d.conAviso === 0} aria-busy={pendiente} onClick={onPublicar}>
            {pendiente && conArchivos ? "Subiendo archivos…" : programada ? "Programar" : "Publicar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
