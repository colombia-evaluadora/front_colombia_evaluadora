import { useState } from "react"
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { useNotify } from "@/components/notice/notice-context"
import { getErrorMessage } from "@/lib/api-client"
import { useAppForm } from "@/lib/forms"
import { maxLength, required } from "@/lib/forms/messages"
import { cn } from "@/lib/utils"
import type { MostrarResultados } from "@/features/comunicaciones/chat/api/types"
import { useCrearEvaluacion } from "@/features/comunicaciones/chat/api/mutations/use-acciones-evaluacion"
import { ListaPreguntas } from "@/features/comunicaciones/chat/components/editor-preguntas"
import {
  errorPregunta,
  nuevaPregunta,
  type PreguntaLocal,
} from "@/features/comunicaciones/chat/lib/preguntas"
import { diaMinimo, errorCierre, validarRangoFechas } from "@/features/comunicaciones/chat/lib/fechas-canal"

// 0 = sin límite / ilimitados; -1 = sin elegir.
const SIN_ELEGIR = -1

const TIEMPOS = [
  { value: 15, label: "15 minutos" },
  { value: 30, label: "30 minutos" },
  { value: 45, label: "45 minutos" },
  { value: 60, label: "1 hora" },
  { value: 90, label: "1 hora y 30 minutos" },
  { value: 120, label: "2 horas" },
  { value: 0, label: "Sin límite" },
]
const PUNTAJES = [10, 20, 50, 100].map((v) => ({ value: v, label: String(v) }))
const INTENTOS = [
  { value: 1, label: "1" },
  { value: 2, label: "2" },
  { value: 3, label: "3" },
  { value: 0, label: "Ilimitado" },
]

const datosSchema = z
  .object({
    nombre: z.string().trim().min(1, required("El nombre")).max(80, maxLength(80, "El nombre")),
    descripcion: z.string().max(500, maxLength(500, "La descripción")),
    fechaInicio: z.string().nullable(),
    fechaCierre: z.string().nullable(),
    tiempoLimiteMin: z.number().min(0, required("El tiempo límite")),
    puntajeTotal: z.number().min(1, required("El puntaje total")),
    intentos: z.number().min(0, "Elige los intentos permitidos."),
    mostrarResultados: z.enum(["INMEDIATO", "AL_CIERRE"]),
  })
  .superRefine((v, ctx) => validarRangoFechas(v, ctx))

type Datos = z.infer<typeof datosSchema>

const DATOS_INICIALES: Datos = {
  nombre: "",
  descripcion: "",
  fechaInicio: null,
  fechaCierre: null,
  tiempoLimiteMin: SIN_ELEGIR,
  puntajeTotal: SIN_ELEGIR,
  intentos: SIN_ELEGIR,
  mostrarResultados: "AL_CIERRE",
}

const aIso = (v: string | null) => (v ? new Date(v).toISOString() : null)

export function CrearEvaluacionDialog({
  open,
  onClose,
  onCreada,
}: {
  open: boolean
  onClose: () => void
  onCreada: (conversacionId: number) => void
}) {
  const { notify } = useNotify()
  const [paso, setPaso] = useState<1 | 2>(1)
  const [preguntas, setPreguntas] = useState<PreguntaLocal[]>([])
  const [tope, setTope] = useState(false)
  const [intentado, setIntentado] = useState(false)
  const [descartar, setDescartar] = useState(false)
  const crear = useCrearEvaluacion()

  const datos = useAppForm({
    defaultValues: DATOS_INICIALES,
    validators: { onSubmit: datosSchema },
    onSubmit: () => {
      if (preguntas.length === 0) setPreguntas([nuevaPregunta("MULTIPLE", "EVALUACION")])
      setPaso(2)
    },
  })

  const total = datos.state.values.puntajeTotal
  const asignados = preguntas.reduce((s, p) => s + (Number(p.puntos) || 0), 0)
  const cuadra = asignados === total

  // Nunca se deja pasar del puntaje total: el valor de la pregunta editada se recorta a lo que queda.
  const cambiarPreguntas = (fn: (ps: PreguntaLocal[]) => PreguntaLocal[]) => {
    const nuevas = fn(preguntas)
    const suma = nuevas.reduce((s, p) => s + (Number(p.puntos) || 0), 0)
    const editada = nuevas.findIndex(
      (p) => p.puntos !== preguntas.find((x) => x.clave === p.clave)?.puntos,
    )
    if (suma <= total || editada < 0) {
      setPreguntas(nuevas)
      setTope(false)
      return
    }
    const otros = suma - (Number(nuevas[editada].puntos) || 0)
    const tope = Math.max(0, total - otros)
    setPreguntas(nuevas.map((p, i) => (i === editada ? { ...p, puntos: String(tope) } : p)))
    setTope(true)
  }

  const reiniciar = () => {
    datos.reset()
    setPreguntas([])
    setIntentado(false)
    setPaso(1)
    crear.reset()
    onClose()
  }

  const intentarCerrar = () => {
    if (crear.isPending) return
    if (datos.state.isDirty || preguntas.some((p) => p.texto.trim())) setDescartar(true)
    else reiniciar()
  }

  const crearEvaluacion = () => {
    setIntentado(true)
    if (preguntas.some((p) => errorPregunta(p, "EVALUACION")) || !cuadra) return
    const v = datos.state.values
    crear.mutate(
      {
        nombre: v.nombre.trim(),
        descripcion: v.descripcion.trim(),
        fechaInicio: aIso(v.fechaInicio),
        fechaCierre: aIso(v.fechaCierre),
        tiempoLimiteMin: v.tiempoLimiteMin || null,
        puntajeTotal: v.puntajeTotal,
        intentos: v.intentos || null,
        mostrarResultados: v.mostrarResultados,
        preguntas: preguntas.map((p) => ({
          tipo: p.tipo,
          texto: p.texto.trim(),
          puntos: Number(p.puntos),
          opciones: p.opciones.map((o) => ({ texto: o.texto.trim(), correcta: o.correcta })),
        })),
      },
      {
        onSuccess: (canal) => {
          notify(`Se creó la evaluación ${canal.nombre}.`)
          reiniciar()
          onCreada(canal.id)
        },
      },
    )
  }

  return (
    <>
      <Dialog open={open} onOpenChange={(o) => !o && intentarCerrar()}>
        <DialogContent className="flex max-h-[90dvh] flex-col sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Crear una Evaluación</DialogTitle>
          </DialogHeader>

          {paso === 1 ? (
            <form
              id="evaluacion-datos"
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
                    placeholder="Por ejemplo, Examen Matemáticas"
                  />
                )}
              </datos.AppField>
              <datos.AppField name="descripcion">
                {(f) => <f.TextareaField label="Descripción" maxLength={500} />}
              </datos.AppField>
              <div className="grid gap-4 sm:grid-cols-2">
                <datos.AppField name="fechaInicio">
                  {(f) => <f.DateField label="Fecha inicio" required mode="datetime" minDate={new Date()} />}
                </datos.AppField>
                {/* El día mínimo del cierre sigue a la fecha de inicio. */}
                <datos.Subscribe selector={(st) => st.values.fechaInicio}>
                  {(inicio) => (
                    <datos.AppField
                      name="fechaCierre"
                      // Se valida al momento, también cuando cambia el inicio.
                      validators={{
                        onChangeListenTo: ["fechaInicio"],
                        onChange: ({ value, fieldApi }) =>
                          errorCierre(fieldApi.form.getFieldValue("fechaInicio"), value),
                      }}
                    >
                      {(f) => <f.DateField label="Fecha final" required mode="datetime" minDate={diaMinimo(inicio)} />}
                    </datos.AppField>
                  )}
                </datos.Subscribe>
                <datos.AppField name="tiempoLimiteMin">
                  {(f) => (
                    <f.SelectField
                      label="Tiempo límite"
                      required
                      emptyValue={SIN_ELEGIR}
                      placeholder="Seleccionar"
                      options={TIEMPOS}
                      description="Cuenta desde que el estudiante abre la evaluación."
                    />
                  )}
                </datos.AppField>
                <datos.AppField name="puntajeTotal">
                  {(f) => (
                    <f.SelectField
                      label="Puntaje total"
                      required
                      emptyValue={SIN_ELEGIR}
                      placeholder="Seleccionar"
                      options={PUNTAJES}
                    />
                  )}
                </datos.AppField>
                <datos.AppField name="intentos">
                  {(f) => (
                    <f.SelectField
                      label="Intentos permitidos"
                      required
                      emptyValue={SIN_ELEGIR}
                      placeholder="Seleccionar"
                      options={INTENTOS}
                    />
                  )}
                </datos.AppField>
              </div>
              <datos.Field name="mostrarResultados">
                {(f) => (
                  <fieldset className="rounded-lg border px-3 pt-1 pb-3">
                    <legend className="px-1 text-sm font-medium">Mostrar resultados</legend>
                    <RadioGroup
                      value={f.state.value}
                      onValueChange={(v) => f.handleChange(v as MostrarResultados)}
                      className="flex flex-wrap gap-x-6 gap-y-2"
                    >
                      {(
                        [
                          ["INMEDIATO", "Inmediato"],
                          ["AL_CIERRE", "Al finalizar fecha"],
                        ] as const
                      ).map(([valor, etiqueta]) => (
                        <label key={valor} className="flex items-center gap-2 text-sm">
                          <RadioGroupItem value={valor} />
                          {etiqueta}
                        </label>
                      ))}
                    </RadioGroup>
                  </fieldset>
                )}
              </datos.Field>
            </form>
          ) : (
            <ListaPreguntas
              modo="EVALUACION"
              preguntas={preguntas}
              onCambio={cambiarPreguntas}
              intentado={intentado}
              pie={
                <p
                  role={intentado && !cuadra ? "alert" : undefined}
                  className={cn(
                    "flex justify-between rounded-lg px-3 py-2 text-sm tabular-nums",
                    cuadra ? "bg-green-22 text-green" : intentado ? "bg-red-22 text-red" : "bg-muted/40",
                  )}
                >
                  <span>
                    Puntos asignados
                    {tope && (
                      <span className="block text-xs">No puedes pasar del puntaje total; ajustamos el valor a lo que quedaba.</span>
                    )}
                  </span>
                  <span className="font-semibold">
                    {asignados} de {total}
                  </span>
                </p>
              }
            />
          )}

          {crear.isError && (
            <p role="alert" className="text-sm text-red">
              {getErrorMessage(crear.error)}
            </p>
          )}

          <DialogFooter className="sm:justify-between">
            {paso === 1 ? (
              <Button type="submit" form="evaluacion-datos" className="sm:ml-auto">
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
                    onClick={crearEvaluacion}
                    disabled={preguntas.length === 0 || crear.isPending}
                    aria-busy={crear.isPending}
                  >
                    Crear
                    <ArrowRightIcon data-icon="inline-end" />
                  </Button>
                  <Button
                    type="button"
                    color="neutral"
                    onClick={intentarCerrar}
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
          reiniciar()
        }}
      />
    </>
  )
}
