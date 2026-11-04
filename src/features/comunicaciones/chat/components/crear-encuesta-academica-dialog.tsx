import { useState } from "react"
import { useStore } from "@tanstack/react-form"
import { format } from "date-fns"
import { z } from "zod"

import { ConfirmDiscardDialog } from "@/components/confirm-discard-dialog"
import { DatePicker } from "@/components/date-picker"
import { ErrorNoticeBanner } from "@/components/notice/error-notice-banner"
import { useNotify } from "@/components/notice/notice-context"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import { ControlPointIcon, TrashIcon } from "@/components/ui/icons"
import { Input } from "@/components/ui/input"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { getErrorMessage } from "@/lib/api-client"
import { useAppForm } from "@/lib/forms"
import { maxLength, required } from "@/lib/forms/messages"
import {
  useAutoguardadoActividad,
  useEliminarBorradorActividad,
} from "@/features/comunicaciones/chat/api/mutations/use-borrador-actividad"
import { useCrearEncuesta, useEditarEncuesta } from "@/features/comunicaciones/chat/api/mutations/use-crear-encuesta"
import type { Encuesta } from "@/features/comunicaciones/chat/api/types"
import { BarraBorrador } from "@/features/comunicaciones/chat/components/estado-autoguardado"
import { SelectorVotantes } from "@/features/comunicaciones/chat/components/selector-votantes"
import { datosDe, hayContenido, idsDe } from "@/features/comunicaciones/chat/lib/borrador-actividad"
import {
  AVISO_NO_ANONIMA,
  MAX_OPCION,
  MAX_OPCIONES,
  MAX_PREGUNTA,
  MIN_OPCIONES,
  opcionesValidas,
  validarOpciones,
} from "@/features/comunicaciones/chat/lib/encuesta-academica"
import { isoALocal } from "@/features/comunicaciones/chat/lib/fechas-canal"
import { caracteresPermitidos } from "@/features/comunicaciones/chat/lib/texto-actividad"

const schema = z.object({
  nombre: z.string().trim().min(1, required("El nombre")).max(80, maxLength(80, "El nombre")).superRefine(caracteresPermitidos("El nombre")),
  pregunta: z.string().trim().min(1, required("La pregunta")).max(MAX_PREGUNTA, maxLength(MAX_PREGUNTA, "La pregunta")),
  fechaCierre: z
    .string()
    .nullable()
    .refine((v) => !!v, required("La fecha de cierre"))
    .refine((v) => !v || new Date(v).getTime() > Date.now(), "La fecha de cierre debe ser futura."),
})

type TipoRespuesta = "UNICA" | "MULTIPLE"
type Resumen = "PUBLICOS" | "AL_CIERRE"

// Encuesta del manual: todos sus campos caben en un paso (prototipo M.3.HER.2). "Dirigida a" todo el
// espacio o un equipo llega con Espacios académicos (fase 4); mientras tanto se elige a las personas.
export function CrearEncuestaAcademicaDialog({
  open,
  onClose,
  onCreada,
  editar,
  borrador,
}: {
  open: boolean
  onClose: () => void
  onCreada: (conversacionId: number) => void
  editar?: Encuesta
  borrador?: { id: number; datos: Record<string, unknown> | null }
}) {
  const { notify } = useNotify()
  const previa = editar?.preguntas[0]
  const guardado = borrador?.datos
  const [tipo, setTipo] = useState<TipoRespuesta>(
    guardado?.tipo === "MULTIPLE" || previa?.tipo === "MULTIPLE" ? "MULTIPLE" : "UNICA",
  )
  const [resumen, setResumen] = useState<Resumen>(
    guardado?.resumen === "AL_CIERRE" || editar?.resultados === "AL_CIERRE" ? "AL_CIERRE" : "PUBLICOS",
  )
  const [opciones, setOpciones] = useState<string[]>(() =>
    Array.isArray(guardado?.opciones) ? (guardado.opciones as string[]) : (previa?.opciones.map((o) => o.texto) ?? ["", ""]),
  )
  const [participantes, setParticipantes] = useState<Set<number>>(() => idsDe(guardado?.participantes))
  const [intentado, setIntentado] = useState(false)
  const [descartar, setDescartar] = useState(false)
  const crearNueva = useCrearEncuesta()
  const editarEncuesta = useEditarEncuesta(editar?.conversacionId ?? 0)
  const crear = editar ? editarEncuesta : crearNueva
  const eliminarBorrador = useEliminarBorradorActividad()

  const form = useAppForm({
    defaultValues: datosDe(guardado, {
      nombre: editar?.nombre ?? "",
      pregunta: previa?.texto ?? "",
      fechaCierre: isoALocal(editar?.fechaCierre),
    }),
    validators: { onSubmit: schema },
    onSubmit: async ({ value }) => {
      if (!opcionesValidas(opciones) || (!editar && participantes.size === 0)) return
      const cuerpo = {
        modalidad: "ACADEMICA" as const,
        nombre: value.nombre.trim(),
        descripcion: "",
        fechaInicio: null,
        fechaCierre: new Date(value.fechaCierre as string).toISOString(),
        resultados: resumen,
        preguntas: [{ tipo, texto: value.pregunta.trim(), opciones: opciones.map((o) => o.trim()) }],
      }
      const borradorId = await autoguardado.guardarYa()
      if (editar) {
        editarEncuesta.mutate({ ...cuerpo, borradorId }, {
          onSuccess: (e) => {
            notify(`Se guardaron los cambios de ${e.nombre}.`)
            onClose()
          },
        })
        return
      }
      crearNueva.mutate({ ...cuerpo, participantes: [...participantes], borradorId }, {
        onSuccess: (canal) => {
          notify(`Se publicó la encuesta ${canal.nombre}.`)
          onClose()
          onCreada(canal.id)
        },
      })
    },
  })

  const valores = useStore(form.store, (s) => s.values)
  const autoguardado = useAutoguardadoActividad({
    tipo: "ENCUESTA",
    habilitado: open,
    titulo: valores.nombre,
    // `modalidad` en el borrador: al retomarlo se abre este formulario y no el institucional.
    datos: { ...valores, modalidad: "ACADEMICA", tipo, resumen, opciones, participantes: [...participantes] },
    conContenido: hayContenido(valores.nombre, valores.pregunta, ...opciones, participantes),
    borradorInicial: borrador?.id,
    conversacionId: editar?.conversacionId,
  })

  const cerrar = async () => {
    if (crear.isPending) return
    // Cerrar no pierde nada: lo escrito queda en "Borradores y enviados".
    const id = await autoguardado.guardarYa()
    if (id) notify("La encuesta quedó guardada en Borradores y enviados.")
    autoguardado.reiniciar()
    onClose()
  }

  const errores = validarOpciones(opciones)

  return (
    <>
      <Dialog open={open} onOpenChange={(o) => !o && void cerrar()}>
        <DialogContent className="flex max-h-[90dvh] flex-col sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editar ? "Editar encuesta" : "Nueva encuesta"}</DialogTitle>
          </DialogHeader>
          <form
            id="encuesta-academica"
            noValidate
            onSubmit={(e) => {
              e.preventDefault()
              setIntentado(true)
              void form.handleSubmit()
            }}
            className="-mx-1 space-y-4 overflow-y-auto px-1 py-1"
          >
            <form.AppField name="nombre">
              {(f) => <f.TextField label="Nombre" required maxLength={80} showCounter />}
            </form.AppField>
            <form.AppField name="pregunta">
              {(f) => <f.TextareaField label="Pregunta" required maxLength={MAX_PREGUNTA} />}
            </form.AppField>

            <fieldset className="space-y-2">
              <legend className="text-sm font-medium">Opciones</legend>
              {opciones.map((o, i) => (
                <Field key={i} data-invalid={(intentado && !!errores.porOpcion[i]) || undefined}>
                  <div className="flex items-center gap-2">
                    <Input
                      aria-label={`Opción ${i + 1}`}
                      value={o}
                      maxLength={MAX_OPCION}
                      onChange={(ev) => setOpciones((l) => l.map((x, j) => (j === i ? ev.target.value : x)))}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      color="neutral"
                      aria-label={`Quitar opción ${i + 1}`}
                      disabled={opciones.length <= MIN_OPCIONES}
                      onClick={() => setOpciones((l) => l.filter((_, j) => j !== i))}
                    >
                      <TrashIcon />
                    </Button>
                  </div>
                  {intentado && errores.porOpcion[i] && <FieldError>{errores.porOpcion[i]}</FieldError>}
                </Field>
              ))}
              <Button
                type="button"
                variant="ghost"
                disabled={opciones.length >= MAX_OPCIONES}
                onClick={() => setOpciones((l) => [...l, ""])}
              >
                <ControlPointIcon data-icon="inline-start" />
                Agregar opción
              </Button>
            </fieldset>

            <fieldset className="space-y-1">
              <legend className="text-sm font-medium">Respuesta</legend>
              <RadioGroup value={tipo} onValueChange={(v) => setTipo(v as TipoRespuesta)} className="flex gap-6">
                <label className="flex items-center gap-2 text-sm"><RadioGroupItem value="UNICA" />Única</label>
                <label className="flex items-center gap-2 text-sm"><RadioGroupItem value="MULTIPLE" />Múltiple</label>
              </RadioGroup>
            </fieldset>

            <form.Field name="fechaCierre">
              {(f) => {
                const error = f.state.meta.errors[0]
                const mensaje = typeof error === "string" ? error : error?.message
                return (
                  <Field data-invalid={!!mensaje || undefined}>
                    <FieldLabel>Cierra<span aria-hidden className="text-red">*</span></FieldLabel>
                    <DatePicker mode="datetime" value={f.state.value ? new Date(f.state.value) : undefined} onChange={(d) => f.handleChange(d ? format(d, "yyyy-MM-dd'T'HH:mm") : null)} />
                    {mensaje && <FieldError>{mensaje}</FieldError>}
                  </Field>
                )
              }}
            </form.Field>

            <fieldset className="space-y-1">
              <legend className="text-sm font-medium">Resumen para los participantes</legend>
              <RadioGroup value={resumen} onValueChange={(v) => setResumen(v as Resumen)} className="flex gap-6">
                <label className="flex items-center gap-2 text-sm"><RadioGroupItem value="PUBLICOS" />Al responder</label>
                <label className="flex items-center gap-2 text-sm"><RadioGroupItem value="AL_CIERRE" />Solo al cierre</label>
              </RadioGroup>
            </fieldset>

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
            <p className="text-xs text-muted-foreground">{AVISO_NO_ANONIMA} No genera calificación.</p>
          </form>

          <ErrorNoticeBanner error={crear.isError ? crear.error : null} />
          <BarraBorrador
            estado={autoguardado.estado}
            hayBorrador={!!autoguardado.borradorId}
            onDescartar={() => setDescartar(true)}
            deshabilitado={crear.isPending}
            edicion={!!editar}
          />
          <DialogFooter>
            <Button type="button" color="neutral" onClick={() => void cerrar()} disabled={crear.isPending}>
              Cancelar
            </Button>
            <Button type="submit" form="encuesta-academica" disabled={crear.isPending} aria-busy={crear.isPending}>
              {editar ? "Guardar" : "Publicar encuesta"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDiscardDialog
        open={descartar}
        onOpenChange={setDescartar}
        onConfirm={() => {
          setDescartar(false)
          if (autoguardado.borradorId) {
            eliminarBorrador
              .mutateAsync(autoguardado.borradorId)
              .then(() => notify("Borrador descartado."))
              .catch((error: unknown) => notify(getErrorMessage(error), { variant: "error" }))
          }
          autoguardado.reiniciar()
          onClose()
        }}
      />
    </>
  )
}
