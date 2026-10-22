import { useState } from "react"
import { useStore } from "@tanstack/react-form"
import { z } from "zod"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
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
import type { Encuesta, VisibilidadResultados } from "@/features/comunicaciones/chat/api/types"
import { useCrearEncuesta, useEditarEncuesta } from "@/features/comunicaciones/chat/api/mutations/use-crear-encuesta"
import { OPCIONES_SI_NO } from "@/features/comunicaciones/chat/lib/encuesta"
import {
  aPreguntaLocal,
  errorPregunta,
  nuevaPregunta,
  type PreguntaLocal,
} from "@/features/comunicaciones/chat/lib/preguntas"
import { ListaPreguntas } from "@/features/comunicaciones/chat/components/editor-preguntas"
import { SelectorVotantes } from "@/features/comunicaciones/chat/components/selector-votantes"
import { isoALocal, validarRangoFechas } from "@/features/comunicaciones/chat/lib/fechas-canal"
import { DateRangeField } from "@/features/establishment/academic-period/components/fields/date-range-field"
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import {
  useAutoguardadoActividad,
  useEliminarBorradorActividad,
} from "@/features/comunicaciones/chat/api/mutations/use-borrador-actividad"
import { BarraBorrador } from "@/features/comunicaciones/chat/components/estado-autoguardado"
import { datosDe, hayContenido, idsDe, preguntasGuardables, revivirPreguntas } from "@/features/comunicaciones/chat/lib/borrador-actividad"

const datosSchema = z
  .object({
    nombre: z.string().trim().min(1, required("El nombre")).max(80, maxLength(80, "El nombre")),
    descripcion: z.string().max(500, maxLength(500, "La descripción")),
    fechaInicio: z.string().nullable(),
    fechaCierre: z.string().nullable(),
  })
  .superRefine((v, ctx) => validarRangoFechas(v, ctx))

type Datos = z.infer<typeof datosSchema>

const DATOS_INICIALES: Datos = { nombre: "", descripcion: "", fechaInicio: null, fechaCierre: null }

const aIso = (v: string | null) => (v ? new Date(v).toISOString() : null)

export function CrearEncuestaDialog({
  open,
  onClose,
  onCreada,
  editar,
  borrador,
}: {
  open: boolean
  onClose: () => void
  onCreada: (conversacionId: number) => void
  // "Editar Encuesta" (diseño 4060:63421): mismos pasos; los participantes no cambian. Quien la
  // abre la monta con `key` para que los valores iniciales se lean una vez.
  editar?: Encuesta
  // Borrador retomado desde "Borradores y enviados" (montado con `key`).
  borrador?: { id: number; datos: Record<string, unknown> | null }
}) {
  const { notify } = useNotify()
  const [paso, setPaso] = useState<1 | 2>(1)
  const [resultados, setResultados] = useState<VisibilidadResultados>(
    editar?.resultados ?? (borrador?.datos?.resultados === "ADMIN" ? "ADMIN" : "PUBLICOS"),
  )
  const [preguntas, setPreguntas] = useState<PreguntaLocal[]>(() =>
    editar ? editar.preguntas.map(aPreguntaLocal) : revivirPreguntas(borrador?.datos?.preguntas),
  )
  const [participantes, setParticipantes] = useState<Set<number>>(() => idsDe(borrador?.datos?.participantes))
  const [intentado, setIntentado] = useState(false)
  const [descartar, setDescartar] = useState(false)
  const crearNueva = useCrearEncuesta()
  const editarEncuesta = useEditarEncuesta(editar?.conversacionId ?? 0)
  const crear = editar ? editarEncuesta : crearNueva

  const datos = useAppForm({
    defaultValues: editar
      ? {
          nombre: editar.nombre,
          descripcion: editar.descripcion,
          fechaInicio: isoALocal(editar.fechaInicio),
          fechaCierre: isoALocal(editar.fechaCierre),
        }
      : datosDe(borrador?.datos, DATOS_INICIALES),
    validators: { onSubmit: datosSchema },
    onSubmit: () => {
      if (preguntas.length === 0) setPreguntas([nuevaPregunta("MULTIPLE", "ENCUESTA")])
      setPaso(2)
    },
  })

  // Actividad nueva: lo escrito se autoguarda como borrador (comms-service).
  const valores = useStore(datos.store, (s) => s.values)
  const autoguardado = useAutoguardadoActividad({
    tipo: "ENCUESTA",
    habilitado: open && !editar,
    titulo: valores.nombre,
    datos: { ...valores, resultados, preguntas: preguntasGuardables(preguntas), participantes: [...participantes] },
    conContenido: hayContenido(valores.nombre, valores.descripcion, ...preguntas.map((p) => p.texto), participantes),
    borradorInicial: borrador?.id,
  })
  const eliminarBorrador = useEliminarBorradorActividad()

  const reiniciar = () => {
    autoguardado.reiniciar()
    datos.reset(DATOS_INICIALES)
    setResultados("PUBLICOS")
    setPreguntas([])
    setParticipantes(new Set())
    setIntentado(false)
    setPaso(1)
    crear.reset()
    onClose()
  }

  const intentarCerrar = async () => {
    if (crear.isPending) return
    if (!editar) {
      // Cerrar no pierde nada: lo escrito queda en "Borradores y enviados".
      const id = await autoguardado.guardarYa()
      if (id) notify("La encuesta quedó guardada en Borradores y enviados.")
      reiniciar()
      return
    }
    if (datos.state.isDirty || preguntas.some((p) => p.texto.trim())) setDescartar(true)
    else reiniciar()
  }

  const crearEncuesta = async () => {
    setIntentado(true)
    if (preguntas.length === 0 || preguntas.some((p) => errorPregunta(p, "ENCUESTA"))) return
    if (!editar && participantes.size === 0) return
    const v = datos.state.values
    const cuerpo = {
      nombre: v.nombre.trim(),
      descripcion: v.descripcion.trim(),
      fechaInicio: aIso(v.fechaInicio),
      fechaCierre: aIso(v.fechaCierre),
      resultados,
      preguntas: preguntas.map((p) => ({
        tipo: p.tipo,
        texto: p.texto.trim(),
        opciones: p.tipo === "SI_NO" ? OPCIONES_SI_NO : p.opciones.map((o) => o.texto.trim()),
      })),
    }
    if (editar) {
      editarEncuesta.mutate(cuerpo, {
        onSuccess: (e) => {
          notify(`Se guardaron los cambios de ${e.nombre}.`)
          reiniciar()
        },
      })
      return
    }
    const borradorId = await autoguardado.guardarYa()
    crearNueva.mutate(
      { ...cuerpo, participantes: [...participantes], borradorId },
      {
        onSuccess: (canal) => {
          notify(`Se creó la encuesta ${canal.nombre}.`)
          reiniciar()
          onCreada(canal.id)
        },
      },
    )
  }

  return (
    <>
      <Dialog open={open} onOpenChange={(o) => !o && void intentarCerrar()}>
        <DialogContent className="flex max-h-[90dvh] flex-col sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editar ? "Editar Encuesta" : "Crear una Encuesta"}</DialogTitle>
          </DialogHeader>

          {paso === 1 ? (
            <form
              id="encuesta-datos"
              noValidate
              onSubmit={(e) => {
                e.preventDefault()
                void datos.handleSubmit()
              }}
              className="-mx-1 space-y-4 overflow-y-auto px-1 py-1"
            >
              <datos.AppField name="nombre">
                {(f) => (
                  <f.TextField
                    label="Nombre"
                    required
                    maxLength={80}
                    placeholder="Por ejemplo, Encuesta Satisfacción"
                  />
                )}
              </datos.AppField>
              <datos.AppField name="descripcion">
                {(f) => <f.TextareaField label="Descripción" maxLength={500} />}
              </datos.AppField>
              {/* Un solo campo "Fecha" de inicio a final, como el diseño (3849:72675): abre al empezar el
                  primer día y cierra al terminar el último. */}
              <datos.Subscribe selector={(st) => [st.values.fechaInicio, st.values.fechaCierre] as const}>
                {([inicio, cierre]) => (
                  <datos.Field name="fechaInicio">
                    {(f) => {
                      const error = f.state.meta.errors[0] ?? datos.getFieldMeta("fechaCierre")?.errors[0]
                      const mensaje = typeof error === "string" ? error : error?.message
                      return (
                        <Field variant="outlined" data-invalid={!!mensaje || undefined}>
                          <FieldLabel>
                            Fecha<span aria-hidden className="text-red">*</span>
                          </FieldLabel>
                          <DateRangeField
                            value={{ startDate: inicio?.slice(0, 10) ?? "", endDate: cierre?.slice(0, 10) ?? "" }}
                            onChange={({ startDate, endDate }) => {
                              f.handleChange(`${startDate}T00:00`)
                              datos.setFieldValue("fechaCierre", `${endDate}T23:59`)
                            }}
                          />
                          {mensaje ? (
                            <FieldError>{mensaje}</FieldError>
                          ) : (
                            <p className="text-xs text-muted-foreground">Las respuestas se cierran al terminar el último día.</p>
                          )}
                        </Field>
                      )
                    }}
                  </datos.Field>
                )}
              </datos.Subscribe>
              <fieldset className="rounded-lg border px-3 pt-1 pb-3">
                <legend className="px-1 text-sm font-medium">Resultados</legend>
                <div role="radiogroup" className="flex flex-wrap gap-x-6 gap-y-2">
                  {(
                    [
                      ["PUBLICOS", "Públicos"],
                      ["ADMIN", "Solo administrador"],
                    ] as const
                  ).map(([valor, etiqueta]) => (
                    <label key={valor} className="flex items-center gap-2 text-sm">
                      <Checkbox
                        checked={resultados === valor}
                        onCheckedChange={(c) => c && setResultados(valor)}
                      />
                      {etiqueta}
                    </label>
                  ))}
                </div>
              </fieldset>
            </form>
          ) : (
            <div className="-mx-1 space-y-4 overflow-y-auto px-1 py-1">
              <ListaPreguntas
                modo="ENCUESTA"
                preguntas={preguntas}
                onCambio={setPreguntas}
                intentado={intentado}
              />
              {/* Quiénes responden: entran al canal y reciben el aviso al abrir. Al editar no cambian. */}
              {!editar && (
              <SelectorVotantes
                titulo="Participantes"
                mensajeInvalido="Selecciona al menos una persona que responda la encuesta."
                accion="para responder"
                seleccion={participantes}
                onCambio={setParticipantes}
                invalido={intentado && participantes.size === 0}
              />
              )}
            </div>
          )}

          {crear.isError && (
            <p role="alert" className="text-sm text-red">
              {getErrorMessage(crear.error)}
            </p>
          )}

          {!editar && (
            <BarraBorrador
              estado={autoguardado.estado}
              hayBorrador={!!autoguardado.borradorId}
              onDescartar={() => setDescartar(true)}
              deshabilitado={crear.isPending}
            />
          )}

          <DialogFooter className="sm:justify-between">
            {paso === 1 ? (
              <Button type="submit" form="encuesta-datos" className="sm:ml-auto">
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
                    onClick={() => void crearEncuesta()}
                    disabled={preguntas.length === 0 || crear.isPending}
                    aria-busy={crear.isPending}
                  >
                    {editar ? "Guardar" : "Crear"}
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
          if (!editar && autoguardado.borradorId) {
            eliminarBorrador.mutate(autoguardado.borradorId, {
              onSuccess: () => notify("Borrador descartado."),
              onError: (error) => notify(getErrorMessage(error), { variant: "error" }),
            })
          }
          reiniciar()
        }}
      />
    </>
  )
}
