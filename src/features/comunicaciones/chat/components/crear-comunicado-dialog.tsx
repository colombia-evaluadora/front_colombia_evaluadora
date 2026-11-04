import { useState } from "react"
import { ErrorNoticeBanner } from "@/components/notice/error-notice-banner"
import { useStore } from "@tanstack/react-form"
import { addDays } from "date-fns"
import { z } from "zod"

import { Button } from "@/components/ui/button"
import { ConfirmDiscardDialog } from "@/components/confirm-discard-dialog"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { ArrowLeftIcon, ArrowRightIcon, XIcon } from "@/components/ui/icons"
import { useNotify } from "@/components/notice/notice-context"
import { getErrorMessage } from "@/lib/api-client"
import { useAppForm } from "@/lib/forms"
import { maxLength, required } from "@/lib/forms/messages"
import type { Audiencia, Comunicado } from "@/features/comunicaciones/chat/api/types"
import {
  textoFallidos,
  useCrearComunicado,
  useEditarComunicado,
} from "@/features/comunicaciones/chat/api/mutations/use-crear-comunicado"
import { EditorTexto } from "@/features/comunicaciones/chat/components/editor-texto"
import { DestinatariosComunicado } from "@/features/comunicaciones/chat/components/destinatarios-comunicado"
import { AdjuntosComunicadoCampo } from "@/features/comunicaciones/chat/components/adjuntos-comunicado"
import { htmlSeguro, htmlVacio } from "@/features/comunicaciones/chat/lib/html-seguro"
import { ahoraLocal, isoALocal } from "@/features/comunicaciones/chat/lib/fechas-canal"
import {
  aDestinos,
  deDestinos,
  DESTINOS_VACIOS,
  FILTROS_VACIOS,
  hayDestinos,
  resumenDestinatarios,
  type DestinosLocal,
} from "@/features/comunicaciones/chat/lib/destinos-comunicado"
import {
  useAutoguardadoActividad,
  useEliminarBorradorActividad,
} from "@/features/comunicaciones/chat/api/mutations/use-borrador-actividad"
import { BarraBorrador } from "@/features/comunicaciones/chat/components/estado-autoguardado"
import { datosDe, hayContenido } from "@/features/comunicaciones/chat/lib/borrador-actividad"


// Fecha y hora programada: como máximo 90 días después de hoy (comms-service valida igual).
const MAX_DIAS_PROGRAMADO = 90

const datosSchema = z
  .object({
  titulo: z.string().trim().min(1, required("El título")).max(100, maxLength(100, "El título")),
  descripcion: z.string().max(300, maxLength(300, "La descripción")),
  // La audiencia por rol puede ir vacía si hay otros destinatarios (se valida aparte).
  audiencia: z.array(z.string()),
  publicarEn: z
    .string()
    .nullable()
    .refine((v) => !!v, required("La fecha de publicación", { femenino: true })),
  importante: z.boolean(),
  permitirRespuestas: z.boolean(),
  visibleHasta: z.string().nullable(),
})
  .superRefine((v, ctx) => {
    if (v.visibleHasta && v.publicarEn && v.visibleHasta.slice(0, 10) <= v.publicarEn.slice(0, 10)) {
      ctx.addIssue({
        code: "custom",
        path: ["visibleHasta"],
        message: "Visible hasta debe ser posterior a la fecha de publicación.",
      })
    }
  })

type Datos = z.infer<typeof datosSchema>


export function CrearComunicadoDialog({
  open,
  onClose,
  onCreado,
  editar,
  borrador,
}: {
  open: boolean
  onClose: () => void
  onCreado: (conversacionId: number) => void
  // "Editar Comunicado" (diseño 4062:67938). Ya publicado, los destinatarios y la fecha no cambian.
  // Quien lo abre lo monta con `key` para que los valores iniciales se lean una vez.
  editar?: Comunicado
  // Borrador retomado desde "Borradores y enviados" (montado con `key`). Con `editar`, son los
  // cambios sin guardar de esa edición (se aplican sobre lo publicado).
  borrador?: { id: number; datos: Record<string, unknown> | null }
}) {
  const { notify } = useNotify()
  const [paso, setPaso] = useState<1 | 2>(1)
  const [html, setHtml] = useState(
    typeof borrador?.datos?.html === "string" ? borrador.datos.html : (editar?.contenidoHtml ?? ""),
  )
  // Personas, grupos del chat y grados/grupos/cargos (además de la audiencia por rol).
  const [destinos, setDestinos] = useState<DestinosLocal>(() => {
    const local = borrador?.datos?.destinos
      ? deDestinos(borrador.datos.destinos as Parameters<typeof deDestinos>[0])
      : deDestinos(editar?.destinos)
    const modalidad = (borrador?.datos?.modalidad as string | null | undefined) ?? editar?.modalidad
    const ciclo = (borrador?.datos?.ciclo as number | null | undefined) ?? editar?.ciclo
    return {
      ...local,
      filtros: {
        ...(local.filtros ?? FILTROS_VACIOS),
        // El selector muestra la etiqueta de las opciones cargadas; aquí solo importa el valor.
        modalidad: modalidad ? { valor: modalidad, etiqueta: modalidad } : null,
        ciclo: ciclo != null ? { valor: String(ciclo), etiqueta: String(ciclo) } : null,
      },
    }
  })
  // Archivos nuevos (se suben al guardar) y guardados que se quitan (edición).
  const [archivos, setArchivos] = useState<File[]>([])
  const [quitados, setQuitados] = useState<number[]>([])
  const [intentado, setIntentado] = useState(false)
  const [sinDestinatarios, setSinDestinatarios] = useState(false)
  const [sinCiclo, setSinCiclo] = useState(false)
  const [descartar, setDescartar] = useState(false)
  const crearNuevo = useCrearComunicado()
  const editarComunicado = useEditarComunicado(editar?.conversacionId ?? 0)
  const crear = editar ? editarComunicado : crearNuevo
  const contenidoVacio = htmlVacio(html)
  // Ya publicado: los destinatarios y la fecha no cambian.
  const publicado = !!editar && new Date(editar.publicarEn) <= new Date()

  const datos = useAppForm({
    defaultValues: (editar
      ? datosDe(borrador?.datos, {
          titulo: editar.titulo,
          descripcion: editar.descripcion,
          audiencia: editar.audiencia as string[],
          publicarEn: isoALocal(editar.publicarEn) as string | null,
          importante: !!editar.importante,
          permitirRespuestas: !!editar.permiteRespuestas,
          visibleHasta: editar.visibleHasta ?? null,
        })
      : datosDe(borrador?.datos, {
          titulo: "",
          descripcion: "",
          audiencia: [] as string[],
          publicarEn: ahoraLocal() as string | null,
          importante: false,
          permitirRespuestas: false,
          visibleHasta: null as string | null,
        })) as Datos,
    validators: { onSubmit: datosSchema },
    onSubmit: ({ value }) => {
      if (!publicado && value.audiencia.length === 0 && !hayDestinos(destinos)) {
        setSinDestinatarios(true)
        return
      }
      if (!publicado && destinos.filtros?.modalidad && !destinos.filtros.ciclo) {
        setSinCiclo(true)
        return
      }
      setPaso(2)
    },
  })

  // Lo escrito se autoguarda como borrador (comms-service); al editar uno publicado, atado a él.
  // Los archivos no viajan en el borrador (se vuelven a adjuntar al retomarlo).
  const valores = useStore(datos.store, (s) => s.values)
  const autoguardado = useAutoguardadoActividad({
    tipo: "COMUNICADO",
    habilitado: open,
    titulo: valores.titulo,
    datos: {
      ...valores,
      html,
      destinos: aDestinos(destinos),
      modalidad: destinos.filtros?.modalidad?.valor ?? null,
      ciclo: destinos.filtros?.ciclo ? Number(destinos.filtros.ciclo.valor) : null,
    },
    conContenido: hayContenido(
      valores.titulo,
      valores.descripcion,
      valores.audiencia,
      contenidoVacio ? "" : html,
      hayDestinos(destinos) ? "destinos" : "",
    ),
    borradorInicial: borrador?.id,
    conversacionId: editar?.conversacionId,
  })
  const eliminarBorrador = useEliminarBorradorActividad()

  const reiniciar = () => {
    autoguardado.reiniciar()
    datos.reset({
      titulo: "",
      descripcion: "",
      audiencia: [],
      publicarEn: ahoraLocal(),
      importante: false,
      permitirRespuestas: false,
      visibleHasta: null,
    })
    setHtml("")
    setDestinos(DESTINOS_VACIOS)
    setArchivos([])
    setQuitados([])
    setIntentado(false)
    setSinDestinatarios(false)
    setSinCiclo(false)
    setPaso(1)
    crear.reset()
    onClose()
  }

  const intentarCerrar = async () => {
    if (crear.isPending) return
    // Cerrar no pierde nada: lo escrito queda en "Borradores y enviados" (los archivos no).
    const id = await autoguardado.guardarYa()
    if (id) {
      notify(
        editar
          ? "Tus cambios sin guardar quedaron en Borradores y enviados."
          : "El comunicado quedó guardado en Borradores y enviados.",
      )
    }
    reiniciar()
  }

  const avisarFallidos = (fallidos: { nombre: string; error: string }[]) => {
    const texto = textoFallidos(fallidos)
    if (texto) notify(texto, { variant: "warning" })
  }

  const crearComunicado = async () => {
    setIntentado(true)
    if (contenidoVacio) return
    const v = datos.state.values
    const cuerpo = {
      titulo: v.titulo.trim(),
      descripcion: v.descripcion.trim(),
      audiencia: v.audiencia as Audiencia[],
      destinos: aDestinos(destinos),
      // Ya publicado se reenvía la fecha original exacta (el backend rechaza cambiarla).
      publicarEn: publicado && editar ? editar.publicarEn : new Date(v.publicarEn as string).toISOString(),
      contenidoHtml: htmlSeguro(html),
      importante: v.importante,
      permitirRespuestas: v.permitirRespuestas,
      visibleHasta: v.visibleHasta,
      modalidad: destinos.filtros?.modalidad?.valor ?? null,
      ciclo: destinos.filtros?.ciclo ? Number(destinos.filtros.ciclo.valor) : null,
      archivos,
    }
    if (editar) {
      // Guardar desde el borrador de la edición lo elimina (?borrador).
      const borradorId = await autoguardado.guardarYa()
      editarComunicado.mutate(
        // Ya publicado se reenvían los destinatarios guardados tal cual (no cambian).
        publicado && editar.destinos
          ? { ...cuerpo, audiencia: editar.audiencia, destinos: editar.destinos, quitarAdjuntos: quitados, borradorId }
          : { ...cuerpo, quitarAdjuntos: quitados, borradorId },
        {
          onSuccess: ({ dato, fallidos }) => {
            notify(`Se guardaron los cambios de ${dato.titulo}.`)
            avisarFallidos(fallidos)
            reiniciar()
          },
        },
      )
      return
    }
    const borradorId = await autoguardado.guardarYa()
    crearNuevo.mutate(
      { ...cuerpo, borradorId },
      {
        onSuccess: ({ dato: canal, fallidos }) => {
          const programado = new Date(v.publicarEn as string) > new Date()
          notify(
            programado
              ? `Se programó el comunicado ${canal.nombre}.`
              : `Se publicó el comunicado ${canal.nombre}.`,
          )
          avisarFallidos(fallidos)
          reiniciar()
          onCreado(canal.id)
        },
      },
    )
  }

  return (
    <>
      <Dialog open={open} onOpenChange={(o) => !o && void intentarCerrar()}>
        <DialogContent className="flex max-h-[90dvh] flex-col sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>{editar ? "Editar Comunicado" : "Crear un Comunicado"}</DialogTitle>
          </DialogHeader>
          <ErrorNoticeBanner
            error={crear.isError ? crear.error : autoguardado.estado === "error" ? true : null}
            fallback="No se pudo guardar el borrador."
          />

          {paso === 1 ? (
            <form
              id="comunicado-datos"
              noValidate
              onSubmit={(e) => {
                e.preventDefault()
                void datos.handleSubmit()
              }}
              className="-mx-1 space-y-4 overflow-y-auto px-1 py-1"
            >
              <datos.AppField name="titulo">
                {(f) => (
                  <f.TextField
                    label="Título del comunicado"
                    required
                    maxLength={100}
                    placeholder="Por ejemplo, Suspensión de clases por mantenimiento"
                  />
                )}
              </datos.AppField>
              <datos.AppField name="descripcion">
                {(f) => <f.TextareaField label="Descripción" maxLength={300} />}
              </datos.AppField>
              {publicado && editar ? (
                <div className="rounded-lg border px-3 py-2 text-sm">
                  <p className="font-medium">Destinatarios</p>
                  <p className="text-muted-foreground">
                    {resumenDestinatarios(editar.audiencia, editar.destinos) || "—"}
                  </p>
                </div>
              ) : (
                <datos.Field name="audiencia">
                  {(f) => (
                    <DestinatariosComunicado
                      enabled={open && paso === 1}
                      audiencia={f.state.value as Audiencia[]}
                      onAudiencia={(v) => {
                        setSinDestinatarios(false)
                        f.handleChange(v)
                      }}
                      destinos={destinos}
                      onDestinos={(v) => {
                        setSinDestinatarios(false)
                        setSinCiclo(false)
                        setDestinos(v)
                      }}
                      invalido={sinDestinatarios}
                    />
                  )}
                </datos.Field>
              )}
              {sinCiclo && (
                <p role="alert" className="text-xs text-red">
                  Elige el ciclo de la modalidad.
                </p>
              )}
              <datos.AppField name="publicarEn">
                {(f) => (
                  <f.DateField
                    label="Fecha y hora de publicación"
                    required
                    mode="datetime"
                    minDate={publicado ? undefined : new Date()}
                    maxDate={publicado ? undefined : addDays(new Date(), MAX_DIAS_PROGRAMADO)}
                    disabled={publicado}
                    description={
                      publicado
                        ? "Ya se publicó: los destinatarios y la fecha no se pueden cambiar."
                        : "Si eliges una fecha futura, el comunicado queda programado."
                    }
                  />
                )}
              </datos.AppField>
              <datos.AppField name="visibleHasta">
                {(f) => (
                  <f.DateField
                    label="Visible hasta"
                    mode="date"
                    nullable
                    description="Opcional. Al día siguiente pasa a Vencido y sale de la bandeja principal."
                  />
                )}
              </datos.AppField>
              {/* Mismo patrón "Permitir" de la elección (diseño 4062:67999). */}
              <fieldset className="rounded-lg border px-3 pt-1 pb-3">
                <legend className="px-1 text-sm font-medium">Opciones</legend>
                <div className="flex flex-wrap gap-x-6 gap-y-2">
                  <datos.AppField name="importante">
                    {(f) => <f.CheckboxField label="Marcar como importante" />}
                  </datos.AppField>
                  <datos.AppField name="permitirRespuestas">
                    {(f) => <f.CheckboxField label="Permitir respuestas" />}
                  </datos.AppField>
                </div>
              </fieldset>
            </form>
          ) : (
            <div className="-mx-1 flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-1 py-1">
              <div className="flex min-h-64 flex-col gap-1.5">
                <EditorTexto
                  etiqueta="Contenido del comunicado"
                  valor={html}
                  onCambio={setHtml}
                  invalido={intentado && contenidoVacio}
                />
                {intentado && contenidoVacio && (
                  <p role="alert" className="text-xs text-red">
                    Escribe el contenido del comunicado.
                  </p>
                )}
              </div>
              <AdjuntosComunicadoCampo
                archivos={archivos}
                onArchivos={setArchivos}
                guardados={editar?.adjuntos ?? []}
                quitados={quitados}
                onQuitados={setQuitados}
                deshabilitado={crear.isPending}
              />
            </div>
          )}


          <BarraBorrador
            estado={autoguardado.estado}
            hayBorrador={!!autoguardado.borradorId}
            onDescartar={() => setDescartar(true)}
            deshabilitado={crear.isPending}
            edicion={!!editar}
          />

          <DialogFooter className="sm:justify-between">
            {paso === 1 ? (
              <Button type="submit" form="comunicado-datos" className="sm:ml-auto">
                Siguiente
                <ArrowRightIcon data-icon="inline-end" />
              </Button>
            ) : (
              <>
                <Button type="button" onClick={() => setPaso(1)} disabled={crear.isPending}>
                  <ArrowLeftIcon data-icon="inline-start" />
                  Atrás
                </Button>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    onClick={() => void crearComunicado()}
                    disabled={crear.isPending}
                    aria-busy={crear.isPending}
                  >
                    {crear.isPending && archivos.length > 0
                      ? "Subiendo archivos…"
                      : editar
                        ? "Guardar"
                        : "Crear"}
                    <ArrowRightIcon data-icon="inline-end" />
                  </Button>
                  <Button
                    type="button"
                    color="neutral"
                    onClick={() => void intentarCerrar()}
                    disabled={crear.isPending}
                  >
                    <XIcon data-icon="inline-start" />
                    Cancelar
                  </Button>
                </div>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDiscardDialog
        open={descartar}
        onOpenChange={setDescartar}
        onConfirm={() => {
          setDescartar(false)
          if (autoguardado.borradorId) {
            // Promesa y no callbacks de `mutate`: al descartar, el diálogo puede desmontarse (sale de
            // "Borradores y enviados" o cambia su `key`) y React Query no llama los callbacks por llamada.
            eliminarBorrador
              .mutateAsync(autoguardado.borradorId)
              .then(() => notify("Borrador descartado."))
              .catch((error: unknown) => notify(getErrorMessage(error), { variant: "error" }))
          }
          reiniciar()
        }}
      />
    </>
  )
}
