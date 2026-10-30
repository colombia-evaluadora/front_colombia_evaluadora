import { useRef, useState } from "react"
import { ErrorNoticeBanner } from "@/components/notice/error-notice-banner"
import { useStore } from "@tanstack/react-form"
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
import type { Evaluacion, MostrarResultados } from "@/features/comunicaciones/chat/api/types"
import { useCrearEvaluacion, useEditarEvaluacion } from "@/features/comunicaciones/chat/api/mutations/use-acciones-evaluacion"
import { ListaPreguntas } from "@/features/comunicaciones/chat/components/editor-preguntas"
import { SelectorVotantes } from "@/features/comunicaciones/chat/components/selector-votantes"
import {
  aPreguntaLocal,
  errorPregunta,
  nuevaPregunta,
  type PreguntaLocal,
} from "@/features/comunicaciones/chat/lib/preguntas"
import { diaMinimo, errorCierre, isoALocal, validarInicioNoPasado, validarRangoFechas } from "@/features/comunicaciones/chat/lib/fechas-canal"
import { caracteresPermitidos } from "@/features/comunicaciones/chat/lib/texto-actividad"
import {
  useAutoguardadoActividad,
  useEliminarBorradorActividad,
} from "@/features/comunicaciones/chat/api/mutations/use-borrador-actividad"
import { BarraBorrador } from "@/features/comunicaciones/chat/components/estado-autoguardado"
import { datosDe, hayContenido, idsDe, preguntasGuardables, revivirPreguntas } from "@/features/comunicaciones/chat/lib/borrador-actividad"

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
    nombre: z.string().trim().min(1, required("El nombre")).max(80, maxLength(80, "El nombre")).superRefine(caracteresPermitidos("El nombre")),
    descripcion: z.string().max(500, maxLength(500, "La descripción")).superRefine(caracteresPermitidos("La descripción", { puntuacion: true })),
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
  editar,
  borrador,
}: {
  open: boolean
  onClose: () => void
  onCreada: (conversacionId: number) => void
  // "Editar Evaluación" (diseño 4062:67466): mismos pasos; los participantes no cambian. Quien la
  // abre la monta con `key` para que los valores iniciales se lean una vez.
  editar?: Evaluacion
  // Borrador retomado desde "Borradores y enviados" (montado con `key`). Con `editar`, son los
  // cambios sin guardar de esa edición (se aplican sobre lo publicado).
  borrador?: { id: number; datos: Record<string, unknown> | null }
}) {
  const { notify } = useNotify()
  const [paso, setPaso] = useState<1 | 2>(1)
  // Paso 1 = datos + preguntas; paso 2 = estudiantes asignados. Arranca con una pregunta para que
  // el editor no quede vacío (antes se agregaba al pasar al paso de preguntas).
  const [preguntas, setPreguntas] = useState<PreguntaLocal[]>(() => {
    const iniciales =
      editar && !Array.isArray(borrador?.datos?.preguntas)
        ? editar.preguntas.map(aPreguntaLocal)
        : revivirPreguntas(borrador?.datos?.preguntas)
    return iniciales.length > 0 ? iniciales : [nuevaPregunta("MULTIPLE", "EVALUACION")]
  })
  const cuerpoRef = useRef<HTMLDivElement>(null)
  const [participantes, setParticipantes] = useState<Set<number>>(() => idsDe(borrador?.datos?.participantes))
  const [tope, setTope] = useState(false)
  const [intentado, setIntentado] = useState(false)
  const [descartar, setDescartar] = useState(false)
  const crearNueva = useCrearEvaluacion()
  const editarEvaluacion = useEditarEvaluacion(editar?.conversacionId ?? 0)
  const crear = editar ? editarEvaluacion : crearNueva

  const datos = useAppForm({
    defaultValues: datosDe(
      borrador?.datos,
      editar
        ? {
            nombre: editar.nombre,
            descripcion: editar.descripcion,
            fechaInicio: isoALocal(editar.fechaInicio),
            fechaCierre: isoALocal(editar.fechaCierre),
            tiempoLimiteMin: editar.tiempoLimiteMin ?? 0,
            puntajeTotal: editar.puntajeTotal,
            intentos: editar.intentos ?? 0,
            mostrarResultados: editar.mostrarResultados,
          }
        : DATOS_INICIALES,
    ),
    // QA 77: inicio no en el pasado (al editar, uno que no cambió se acepta).
    validators: { onSubmit: datosSchema.superRefine((v, ctx) => validarInicioNoPasado(v, ctx, editar ? isoALocal(editar.fechaInicio) : null)) },
    onSubmit: () => {
      setIntentado(true)
      if (preguntasInvalidas()) {
        irAlPrimerError()
        return
      }
      setIntentado(false)
      setPaso(2)
    },
    // Se marcan también las preguntas para mostrar todos los errores del paso de una vez.
    onSubmitInvalid: () => {
      setIntentado(true)
      irAlPrimerError()
    },
  })

  // "Siguiente" lleva al primer error del paso (campo de datos, pregunta o puntos que no cuadran),
  // después del render que lo pinta.
  const irAlPrimerError = () =>
    requestAnimationFrame(() => {
      const el = cuerpoRef.current?.querySelector<HTMLElement>('[aria-invalid="true"], [role="alert"]')
      if (!el) return
      el.scrollIntoView({ block: "center", behavior: "smooth" })
      const foco = el.matches("input, textarea, button, [tabindex]")
        ? el
        : el.querySelector<HTMLElement>("input, textarea, button")
      foco?.focus({ preventScroll: true })
    })

  const total = datos.state.values.puntajeTotal
  const asignados = preguntas.reduce((s, p) => s + (Number(p.puntos) || 0), 0)
  const cuadra = asignados === total
  const preguntasInvalidas = () =>
    preguntas.length === 0 || preguntas.some((p) => errorPregunta(p, "EVALUACION")) || !cuadra

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

  // Lo escrito se autoguarda como borrador (comms-service); al editar una publicada, atado a ella.
  const valores = useStore(datos.store, (s) => s.values)
  const autoguardado = useAutoguardadoActividad({
    tipo: "EVALUACION",
    habilitado: open,
    titulo: valores.nombre,
    datos: { ...valores, preguntas: preguntasGuardables(preguntas), participantes: [...participantes] },
    conContenido: hayContenido(valores.nombre, valores.descripcion, ...preguntas.map((p) => p.texto), participantes),
    borradorInicial: borrador?.id,
    conversacionId: editar?.conversacionId,
  })
  const eliminarBorrador = useEliminarBorradorActividad()

  const reiniciar = () => {
    autoguardado.reiniciar()
    datos.reset(DATOS_INICIALES)
    setPreguntas([nuevaPregunta("MULTIPLE", "EVALUACION")])
    setParticipantes(new Set())
    setIntentado(false)
    setPaso(1)
    crear.reset()
    onClose()
  }

  const intentarCerrar = async () => {
    if (crear.isPending) return
    // Cerrar no pierde nada: lo escrito queda en "Borradores y enviados".
    const id = await autoguardado.guardarYa()
    if (id) {
      notify(
        editar
          ? "Tus cambios sin guardar quedaron en Borradores y enviados."
          : "La evaluación quedó guardada en Borradores y enviados.",
      )
    }
    reiniciar()
  }

  const crearEvaluacion = async () => {
    setIntentado(true)
    if (preguntasInvalidas()) {
      // El paso 1 ya lo validó; por si acaso se vuelve a él con los errores marcados.
      setPaso(1)
      irAlPrimerError()
      return
    }
    if (!editar && participantes.size === 0) return
    const v = datos.state.values
    const cuerpo = {
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
    }
    if (editar) {
      // Guardar desde el borrador de la edición lo elimina (?borrador).
      const borradorId = await autoguardado.guardarYa()
      editarEvaluacion.mutate({ ...cuerpo, borradorId }, {
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
          notify(`Se creó la evaluación ${canal.nombre}.`)
          reiniciar()
          onCreada(canal.id)
        },
      },
    )
  }

  return (
    <>
      <Dialog open={open} onOpenChange={(o) => !o && void intentarCerrar()}>
        <DialogContent className={cn("flex max-h-[90dvh] flex-col", paso === 1 ? "sm:max-w-3xl" : "sm:max-w-lg")}>
          <DialogHeader>
            <DialogTitle>{editar ? "Editar Evaluación" : "Crear una Evaluación"}</DialogTitle>
            <p className="text-sm text-muted-foreground" aria-live="polite">
              Paso {paso} de 2 · {paso === 1 ? "Datos y preguntas" : "Estudiantes asignados"}
            </p>
          </DialogHeader>

          {paso === 1 ? (
            <div ref={cuerpoRef} className="-mx-1 min-h-0 flex-1 space-y-6 overflow-y-auto px-1 py-1">
            <form
              id="evaluacion-datos"
              noValidate
              onSubmit={(e) => {
                e.preventDefault()
                void datos.handleSubmit()
              }}
              className="space-y-4"
            >
              <datos.AppField name="nombre">
                {(f) => (
                  <f.TextField
                    label="Nombre"
                    required
                    maxLength={80} showCounter
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
            {/* Sección dedicada a las preguntas, con todo el ancho del diálogo. */}
            <section className="flex flex-col border-t pt-4">
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
            </section>
            </div>
          ) : editar ? (
            // Al editar los participantes no cambian; el paso se conserva para mantener el mismo flujo.
            <p className="rounded-lg bg-muted/40 px-3 py-3 text-sm text-muted-foreground">
              Los estudiantes asignados no se pueden cambiar al editar una evaluación ya publicada.
            </p>
          ) : (
            // Quiénes la presentan: entran al canal y reciben el aviso al abrir. Al editar no cambian.
            <SelectorVotantes
              titulo="Estudiantes asignados"
              mensajeInvalido="Selecciona al menos un estudiante."
              accion="para presentarla"
              seleccion={participantes}
              onCambio={setParticipantes}
              invalido={intentado && participantes.size === 0}
            />
          )}

          <ErrorNoticeBanner error={crear.isError ? crear.error : null} />

          <BarraBorrador
            estado={autoguardado.estado}
            hayBorrador={!!autoguardado.borradorId}
            onDescartar={() => setDescartar(true)}
            deshabilitado={crear.isPending}
            edicion={!!editar}
          />

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
                    onClick={() => void crearEvaluacion()}
                    disabled={crear.isPending}
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
