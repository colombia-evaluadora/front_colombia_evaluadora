import { useEffect, useRef } from "react"
import { useSelector } from "@tanstack/react-form"
import { Card } from "@/components/ui/card"
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  useInstrumentoEvaluacionCatalogQuery,
  INSTRUMENTO_EVALUACION_POR_CODIGO,
  instrumentoPermitidoLabel,
} from "@/features/planeador/api/query/use-instrumento-evaluacion-catalog"
import { InfoIcon } from "@/components/ui/icons"
import type { UnidadTematica } from "@/features/planeador/api/types/unidad-tematica"
import type { FormActividad } from "@/features/planeador/components/forms/form-editar-actividad/types"
import { useCamposEvaluacionEfectivos } from "@/features/planeador/components/forms/form-editar-actividad/hooks"
import { precargarPredeterminado } from "@/features/planeador/components/forms/form-editar-actividad/helpers"
import { usePredeterminadoQuery } from "@/features/establishment/academic-period/api/query/fetch-select-category"
import { ListaCotejoSection } from "@/features/planeador/components/forms/form-editar-actividad/lista-cotejo-section"
import {
  EscalaValoracionSection,
} from "@/features/planeador/components/forms/form-editar-actividad/escala-valoracion-section"
import {
  InstrumentoPersonalizadoSection,
} from "@/features/planeador/components/forms/form-editar-actividad/instrumento-personalizado-section"
import { RubricasSection } from "@/features/planeador/components/forms/form-editar-actividad/rubricas-section"

export function EvaluacionSection({
  form,
  unidades,
  camposEfectivos,
  esFormativa,
  esRecuperacion,
  precargar = false,
  tipoEvaluacion,
  disabled,
}: {
  form: FormActividad
  unidades: UnidadTematica[]
  camposEfectivos: ReturnType<typeof useCamposEvaluacionEfectivos>["camposEfectivos"]
  esFormativa: boolean
  /** Una recuperación siempre es sumativa: bloquea el select en "Sí". */
  esRecuperacion: boolean
  /** Alta sin borrador: precarga el instrumento predeterminado de Listas valor. */
  precargar?: boolean
  tipoEvaluacion: ReturnType<typeof useCamposEvaluacionEfectivos>["tipoEvaluacion"]
  disabled: boolean
}) {
  // `disabled` no corrige el valor: se fuerza `esEvaluativa: false` con referente formativo.
  useEffect(() => {
    if (esFormativa) form.setFieldValue("esEvaluativa", false)
  }, [esFormativa, form])

  // Regla inversa: recuperación siempre sumativa. Nunca chocan con la de arriba.
  useEffect(() => {
    if (esRecuperacion) form.setFieldValue("esEvaluativa", true)
  }, [esRecuperacion, form])

  // Filtrado por `instrumentosPermitidos`; sin config o lista vacía se muestra el catálogo completo.
  const { data: instrumentos = [] } = useInstrumentoEvaluacionCatalogQuery()
  // Regla del form: un campo se pinta inválido si se tocó o si ya se intentó guardar.
  const submissionAttempts = useSelector(form.store, (state) => state.submissionAttempts)
  const instrumentosPermitidos = camposEfectivos?.evaluacion.instrumentosPermitidos
  const instrumentosPermitidosLabels = instrumentosPermitidos?.map(instrumentoPermitidoLabel)
  const instrumentosDisponibles =
    instrumentosPermitidosLabels && instrumentosPermitidosLabels.length > 0
      ? instrumentos.filter((instrumento) => instrumentosPermitidosLabels.includes(instrumento))
      : instrumentos

  // `instrumento` arranca en "Rúbrica" (sin "Seleccione"): se cambia una sola vez por el predeterminado
  const { data: instrumentoPredeterminado } = usePredeterminadoQuery("INSTRUMENTO_EVALUACION")
  const instrumentoPrecargado = useRef(false)
  const instrumentoDefault = instrumentoPredeterminado
    ? (INSTRUMENTO_EVALUACION_POR_CODIGO[instrumentoPredeterminado.valor] ?? instrumentoPredeterminado.nombre)
    : null
  const instrumentoDefaultPermitido = instrumentoDefault != null && instrumentosDisponibles.includes(instrumentoDefault)
  useEffect(() => {
    if (!precargar || esFormativa || instrumentoPrecargado.current || !instrumentoDefaultPermitido) return
    instrumentoPrecargado.current = true
    if (form.getFieldMeta("instrumento")?.isTouched) return
    if (form.state.values.instrumento !== instrumentoDefault) precargarPredeterminado(form, "instrumento", instrumentoDefault)
  }, [precargar, esFormativa, instrumentoDefault, instrumentoDefaultPermitido, form])

  // Con referente formativo la tarjeta entera no tiene nada que mostrar.
  // El `return null` va después de los hooks.
  if (esFormativa) return null

  return (
    <Card className="gap-4 p-4">
      <h3 className="text-base font-semibold">Evaluación</h3>
      <div className="grid gap-x-4 gap-y-5 sm:grid-cols-2">
        <form.Field name="esEvaluativa">
          {(field) => (
            <Field variant="outlined">
              <FieldLabel htmlFor={field.name}>¿Es evaluación sumativa?</FieldLabel>
              <Select
                value={field.state.value ? "si" : "no"}
                onValueChange={(value) => field.handleChange(value === "si")}
                disabled={esRecuperacion || disabled}
              >
                <SelectTrigger id={field.name}>
                  <SelectValue>{(value) => (value === "si" ? "Sí" : "No")}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="si">Sí</SelectItem>
                  <SelectItem value="no">No</SelectItem>
                </SelectContent>
              </Select>
            </Field>
          )}
        </form.Field>

        {/* Regla: un referente formativo nunca tiene instrumento de evaluación. */}
        {!esFormativa && (
          <form.Field name="instrumento">
            {(field) => {
              // Solo se exige si el backend lo pide (`evaluacion.requerido`), la misma regla de
              // `camposObligatoriosFaltantes`; antes el aviso lo nombraba pero el Select no se marcaba.
              const instrumentoInvalido =
                Boolean(camposEfectivos?.evaluacion.requerido) &&
                !field.state.value &&
                (field.state.meta.isTouched || submissionAttempts > 0)
              return (
                <Field variant="outlined" data-invalid={instrumentoInvalido}>
                  <FieldLabel htmlFor={field.name}>
                    Instrumento de evaluación{camposEfectivos?.evaluacion.requerido ? " *" : ""}
                  </FieldLabel>
                  <Select
                    value={field.state.value}
                    onValueChange={(v) => v && field.handleChange(v)}
                    disabled={disabled}
                  >
                    <SelectTrigger id={field.name} aria-invalid={instrumentoInvalido}>
                      <SelectValue placeholder="Seleccione">
                        {(value) =>
                          !value ? "Seleccione" : value === "Otro" ? "Otro (personalizado)" : (value as string)
                        }
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {instrumentosDisponibles.map((instrumento) => (
                        <SelectItem key={instrumento} value={instrumento}>
                          {instrumento === "Otro" ? "Otro (personalizado)" : instrumento}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {instrumentoInvalido && <FieldError errors={[{ message: "Selecciona el instrumento de evaluación." }]} />}
                </Field>
              )
            }}
          </form.Field>
        )}

      </div>

      {esFormativa ? null : (
        <>
          <InstrumentoEvaluacionSection
            form={form}
            unidades={unidades}
            tipoEvaluacion={tipoEvaluacion}
            camposEfectivos={camposEfectivos}
            disabled={disabled}
          />

          {/* Orden: ¿sumativa? → instrumento → definición → ponderación. La ponderación sale de
          `camposEfectivos.ponderacion` (`modo`/`motivo` del backend), sin re-derivar el método de la unidad. */}
          <form.Subscribe selector={(state) => state.values.esEvaluativa}>
            {(esEvaluativa) => {
              if (!esEvaluativa) return null
              const ponderacionInfo = camposEfectivos?.ponderacion
              if (!ponderacionInfo?.visible) {
                return ponderacionInfo?.motivo ? (
                  <div className="border-blue-stroke bg-blue-22 text-blue flex items-start gap-2 rounded-md border p-3 text-sm">
                    <InfoIcon className="mt-0.5 size-4 shrink-0" />
                    {ponderacionInfo.motivo}
                  </div>
                ) : null
              }
              if (ponderacionInfo.modo === "PUNTAJE") {
                return (
                  <div className="grid gap-x-4 gap-y-5 sm:grid-cols-2">
                    <form.Field
                      name="notaMaxima"
                      validators={{
                        // Obligatorio solo si el backend lo pide (`requerido`): el campo existe
                        // únicamente con sumativa + "Suma de puntos", así que oculto no valida.
                        onChange: ({ value }) => {
                          if (value == null || Number.isNaN(value)) {
                            return ponderacionInfo.requerido ? { message: "Ingresa el puntaje." } : undefined
                          }
                          if (value <= 0) return { message: "El puntaje debe ser mayor a 0." }
                          return undefined
                        },
                      }}
                    >
                      {(notaMaximaField) => {
                        // Misma regla que el resto del form: también en rojo tras intentar guardar.
                        const isInvalid =
                          (notaMaximaField.state.meta.isTouched || submissionAttempts > 0) &&
                          !notaMaximaField.state.meta.isValid
                        return (
                          <Field variant="outlined" data-invalid={isInvalid}>
                            <FieldLabel htmlFor={notaMaximaField.name}>
                              Puntaje{ponderacionInfo.requerido ? " *" : ""}
                            </FieldLabel>
                            <Input
                              id={notaMaximaField.name}
                              type="number"
                              min={0}
                              value={notaMaximaField.state.value ?? ""}
                              onChange={(e) => {
                                const raw = e.target.value
                                notaMaximaField.handleChange(raw === "" ? undefined : Number(raw))
                              }}
                              onBlur={notaMaximaField.handleBlur}
                              disabled={disabled}
                              aria-invalid={isInvalid}
                            />
                            {isInvalid && <FieldError errors={notaMaximaField.state.meta.errors} />}
                          </Field>
                        )
                      }}
                    </form.Field>
                  </div>
                )
              }
              // Con `visible` sin `modo` todavía cae al campo de porcentaje.
              return (
                <div className="grid gap-x-4 gap-y-5 sm:grid-cols-2">
                  <form.Field
                    name="ponderacion"
                    validators={{
                      // `NaN` = vacío; 0 tampoco se envía (`PONDERACION` solo viaja si es > 0), así que
                      // con `requerido` ambos cuentan como faltante. Oculto (otro método, formativa) no valida.
                      onChange: ({ value }) => {
                        if (value == null || Number.isNaN(value) || value === 0) {
                          return ponderacionInfo.requerido ? { message: "Ingresa la ponderación (mayor a 0%)." } : undefined
                        }
                        if (value < 0 || value > 100) {
                          return { message: "La ponderación debe estar entre 0 y 100%." }
                        }
                        return undefined
                      },
                    }}
                  >
                    {(ponderacionField) => {
                      const isInvalid =
                        (ponderacionField.state.meta.isTouched || submissionAttempts > 0) &&
                        !ponderacionField.state.meta.isValid
                      return (
                        <Field variant="outlined" data-invalid={isInvalid}>
                          <FieldLabel htmlFor={ponderacionField.name}>
                            Ponderación (%){ponderacionInfo.requerido ? " *" : ""}
                          </FieldLabel>
                          <Input
                            id={ponderacionField.name}
                            type="number"
                            min={0}
                            max={100}
                            value={Number.isNaN(ponderacionField.state.value) ? "" : (ponderacionField.state.value ?? "")}
                            // Vacío → `NaN` (no 0): así el validador distingue "no lo llenó".
                            onChange={(e) => {
                              const raw = e.target.value
                              ponderacionField.handleChange(raw === "" ? Number.NaN : Number(raw))
                            }}
                            onBlur={ponderacionField.handleBlur}
                            disabled={disabled}
                            aria-invalid={isInvalid}
                          />
                          {isInvalid && <FieldError errors={ponderacionField.state.meta.errors} />}
                        </Field>
                      )
                    }}
                  </form.Field>
                </div>
              )
            }}
          </form.Subscribe>
        </>
      )}
    </Card>
  )
}

/**
 * El instrumento decide el editor (cotejo, escala o rúbrica por defecto). Cada uno tiene
 * su propio field, así que cambiar de instrumento no pierde lo cargado.
 */
function InstrumentoEvaluacionSection({
  form,
  unidades,
  tipoEvaluacion,
  camposEfectivos,
  disabled,
}: {
  form: FormActividad
  unidades: UnidadTematica[]
  tipoEvaluacion: string | null
  camposEfectivos: ReturnType<typeof useCamposEvaluacionEfectivos>["camposEfectivos"]
  disabled: boolean
}) {
  return (
    <form.Subscribe selector={(state) => state.values.instrumento}>
      {(instrumento) =>
        // Sin instrumento elegido no hay nada que definir.
        !instrumento ? null : instrumento === "Lista de cotejo" ? (
          <ListaCotejoSection form={form} unidades={unidades} disabled={disabled} />
        ) : instrumento === "Escala de valoración" ? (
          <EscalaValoracionSection
            form={form}
            tipoEvaluacion={tipoEvaluacion}
            disabled={disabled}
          />
        ) : instrumento === "Otro" ? (
          <InstrumentoPersonalizadoSection
            form={form}
            unidades={unidades}
            tipoEvaluacion={tipoEvaluacion}
            camposOtro={
              camposEfectivos?.evaluacion.instrumentosPermitidos.find((item) => item.valor === "OTRO")?.campos ??
              null
            }
            disabled={disabled}
          />
        ) : (
          <RubricasSection form={form} unidades={unidades} disabled={disabled} />
        )
      }
    </form.Subscribe>
  )
}
