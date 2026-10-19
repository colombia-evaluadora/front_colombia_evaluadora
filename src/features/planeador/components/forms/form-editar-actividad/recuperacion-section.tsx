import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import { toPositiveDigitsInput } from "@/lib/text-input"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ActividadRecuperarCascada } from "@/features/planeador/components/forms/actividad-recuperar-cascada"
import { InfoIcon } from "@/components/ui/icons"
import type { FormActividad } from "@/features/planeador/components/forms/form-editar-actividad/types"
import {
  useErrorRecuperacion,
  useCamposEvaluacionEfectivos,
} from "@/features/planeador/components/forms/form-editar-actividad/hooks"

/**
 * Toggle "Es una recuperación" + su configuración. Solo aplica a actividades sumativas
 * (desaparece, no se deshabilita); el valor no se resetea al dejar de serlo.
 */
/**
 * Catálogo de respaldo de "¿Esta recuperación aplica para?" mientras no hay
 * `campos_disponibles`: su `valor` debe coincidir con el real desde el primer render.
 */
const DESTINO_RECUPERACION_FALLBACK = [
  { valor: "ACTIVIDAD", nombre: "Recuperar una actividad" },
  { valor: "NOTA_FINAL", nombre: "Recuperar la nota final" },
]
const TIPO_APLICACION_RECUPERACION_FALLBACK = [
  { valor: "COMPUTAR", nombre: "Computar con la nota anterior" },
  { valor: "REEMPLAZAR", nombre: "Reemplazar la nota actual" },
]
const TIPO_CALCULO_RECUPERACION_FALLBACK = [
  { valor: "PROMEDIADO", nombre: "Promediado" },
  { valor: "PONDERADO", nombre: "Ponderado" },
]

export function RecuperacionSection({
  form,
  disabled,
  recuperacionFijada = false,
  camposEfectivos,
  actividadId,
}: {
  form: FormActividad
  disabled: boolean
  recuperacionFijada?: boolean
  camposEfectivos: ReturnType<typeof useCamposEvaluacionEfectivos>["camposEfectivos"]
  actividadId: number
}) {
  const recuperacion = camposEfectivos?.recuperacion
  // Todos obligatorios; cada error solo se ve si su campo está visible.
  const errorDestino = useErrorRecuperacion(form, "recuperacionDestino")
  const errorActividad = useErrorRecuperacion(form, "recuperacionActividadId")
  const errorAplicacion = useErrorRecuperacion(form, "recuperacionTipoAplicacion")
  const errorCalculo = useErrorRecuperacion(form, "recuperacionTipoCalculo")
  const errorPonderacion = useErrorRecuperacion(form, "recuperacionValorPonderacion")
  // Aparece apenas se prende el toggle, sin esperar Grado/Asignatura/Unidad: mientras
  // tanto usa el catálogo de respaldo (mismos `valor` que el real).
  const destinoOpciones = recuperacion?.catalogos.destino.length
    ? recuperacion.catalogos.destino
    : DESTINO_RECUPERACION_FALLBACK
  const tipoAplicacionOpciones = recuperacion?.catalogos.tipoAplicacion.length
    ? recuperacion.catalogos.tipoAplicacion
    : TIPO_APLICACION_RECUPERACION_FALLBACK
  const tipoCalculoOpciones = recuperacion?.catalogos.tipoCalculo.length
    ? recuperacion.catalogos.tipoCalculo
    : TIPO_CALCULO_RECUPERACION_FALLBACK

  return (
    <form.Subscribe selector={(state) => state.values.esEvaluativa}>
      {(esEvaluativa) =>
        !esEvaluativa ? null : (
          <div className="flex flex-col gap-4">
            <form.Field name="esRecuperacion">
              {(field) => (
                <label
                  htmlFor={field.name}
                  className="flex w-full items-center gap-3 rounded-md border border-input px-3 py-2.5 text-sm"
                >
                  <Switch
                    id={field.name}
                    checked={field.state.value}
                    onCheckedChange={field.handleChange}
                    disabled={disabled || recuperacionFijada}
                    className="rounded-full [&_[data-slot=switch-thumb]]:rounded-full"
                  />
                  Es una recuperación
                  {recuperacionFijada && (
                    <span className="text-muted-foreground ml-auto text-xs">
                      No se puede cambiar en una recuperación ya creada
                    </span>
                  )}
                </label>
              )}
            </form.Field>

            <form.Subscribe selector={(state) => state.values.esRecuperacion}>
              {(esRecuperacionValue) =>
                !esRecuperacionValue ? null : (
                  <div className="grid gap-x-4 gap-y-5 rounded-md border border-input p-3 sm:grid-cols-2">
                    <form.Field name="recuperacionDestino">
                      {(field) => (
                        <Field variant="outlined" data-invalid={!!errorDestino}>
                          <FieldLabel htmlFor={field.name}>
                            ¿Esta recuperación aplica para? *
                          </FieldLabel>
                          <Select
                            value={field.state.value || "__none__"}
                            onValueChange={(v) => {
                              field.handleChange(!v || v === "__none__" ? "" : v)
                              // Cambiar el destino invalida todo lo que dependía de él:
                              // sin reset quedaban valores ocultos que podían reaparecer.
                              form.setFieldValue("recuperacionActividadId", undefined)
                              form.setFieldValue("recuperacionTipoAplicacion", "")
                              form.setFieldValue("recuperacionTipoCalculo", "")
                              form.setFieldValue("recuperacionValorPonderacion", undefined)
                            }}
                            disabled={disabled || recuperacionFijada}
                          >
                            <SelectTrigger id={field.name} aria-invalid={!!errorDestino}>
                              <SelectValue placeholder="Seleccione">
                                {(v) =>
                                  v === "__none__"
                                    ? "Seleccione"
                                    : (destinoOpciones.find((o) => o.valor === v)?.nombre ?? (v as string))
                                }
                              </SelectValue>
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="__none__">Seleccione</SelectItem>
                              {destinoOpciones.map((opcion) => (
                                <SelectItem key={opcion.valor} value={opcion.valor}>
                                  {opcion.nombre}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {errorDestino && <FieldError errors={[{ message: errorDestino }]} />}
                        </Field>
                      )}
                    </form.Field>

                    {/* Solo con `destino = ACTIVIDAD`. */}
                    <form.Subscribe selector={(state) => state.values.recuperacionDestino}>
                      {(destino) =>
                        destino !== "ACTIVIDAD" ? null : (
                          <form.Field name="recuperacionActividadId">
                            {(field) => (
                              <Field variant="outlined" data-invalid={!!errorActividad}>
                                <FieldLabel>¿Qué actividad deseas recuperar? *</FieldLabel>
                                <ActividadRecuperarCascada
                                  value={field.state.value}
                                  onChange={(v) => {
                                    field.handleChange(v)
                                    // Cambiar la actividad a recuperar invalida cómo se aplica/calcula.
                                    form.setFieldValue("recuperacionTipoAplicacion", "")
                                    form.setFieldValue("recuperacionTipoCalculo", "")
                                    form.setFieldValue("recuperacionValorPonderacion", undefined)
                                  }}
                                  excludeActividadId={actividadId}
                                  disabled={disabled || recuperacionFijada}
                                />
                                {errorActividad && <FieldError errors={[{ message: errorActividad }]} />}
                              </Field>
                            )}
                          </form.Field>
                        )
                      }
                    </form.Subscribe>

                    {/* Oculto hasta elegir destino (y, con `ACTIVIDAD`, la actividad puntual). */}
                    <form.Subscribe
                      selector={(state) => ({
                        destino: state.values.recuperacionDestino,
                        actividadId: state.values.recuperacionActividadId,
                      })}
                    >
                      {({ destino, actividadId }) =>
                        !destino || (destino === "ACTIVIDAD" && !actividadId) ? null : (
                          <form.Field name="recuperacionTipoAplicacion">
                            {(field) => (
                              <Field variant="outlined" data-invalid={!!errorAplicacion}>
                                <FieldLabel>¿Cómo se aplicará la nota de recuperación? *</FieldLabel>
                                <RadioGroup
                                  className="flex min-h-11 flex-wrap items-center gap-x-6 gap-y-2 rounded-md border border-input px-3 py-2"
                                  value={field.state.value}
                                  disabled={disabled}
                                  onValueChange={(v) => {
                                    field.handleChange(v)
                                    // "Reemplazar" no calcula nada: hay que limpiar cálculo y %, no solo ocultarlos.
                                    form.setFieldValue("recuperacionTipoCalculo", "")
                                    form.setFieldValue("recuperacionValorPonderacion", undefined)
                                  }}
                                >
                                  {tipoAplicacionOpciones.map((opcion) => (
                                    <label key={opcion.valor} className="flex items-center gap-2 text-sm">
                                      <RadioGroupItem value={opcion.valor} className="data-checked:bg-primary" />
                                      {opcion.nombre}
                                    </label>
                                  ))}
                                </RadioGroup>
                                {errorAplicacion && <FieldError errors={[{ message: errorAplicacion }]} />}
                              </Field>
                            )}
                          </form.Field>
                        )
                      }
                    </form.Subscribe>

                    <form.Subscribe selector={(state) => state.values.recuperacionTipoAplicacion}>
                      {(tipoAplicacion) =>
                        tipoAplicacion !== "REEMPLAZAR" ? null : (
                          <div className="border-blue-stroke bg-blue-22 text-blue col-span-full flex items-start gap-2 rounded-md border p-3 text-sm">
                            <InfoIcon className="mt-0.5 size-4 shrink-0" />
                            La nota de recuperación reemplazará el 100% de la nota final actual.
                          </div>
                        )
                      }
                    </form.Subscribe>

                    {/* Oculto con `tipoAplicacion = REEMPLAZAR` (regla `tipoCalculoOcultoSi`):
                    el backend tolera el campo ausente y guarda PROMEDIADO por default. */}
                    <form.Subscribe
                      selector={(state) => ({
                        destino: state.values.recuperacionDestino,
                        actividadId: state.values.recuperacionActividadId,
                        tipoAplicacion: state.values.recuperacionTipoAplicacion,
                      })}
                    >
                      {({ destino, actividadId, tipoAplicacion }) =>
                        !destino ||
                        (destino === "ACTIVIDAD" && !actividadId) ||
                        !tipoAplicacion ||
                        tipoAplicacion === "REEMPLAZAR" ? null : (
                          <form.Field name="recuperacionTipoCalculo">
                            {(field) => (
                              <Field variant="outlined" data-invalid={!!errorCalculo}>
                                <FieldLabel>
                                  ¿Cómo deseas calcular la nota{" "}
                                  {destino === "NOTA_FINAL" ? "final" : "de la actividad"}? *
                                </FieldLabel>
                                <RadioGroup
                                  className="flex min-h-11 flex-wrap items-center gap-x-6 gap-y-2 rounded-md border border-input px-3 py-2"
                                  value={field.state.value}
                                  disabled={disabled}
                                  onValueChange={(v) => {
                                    field.handleChange(v)
                                    // Un % previo no aplica al cambiar el tipo de cálculo.
                                    form.setFieldValue("recuperacionValorPonderacion", undefined)
                                  }}
                                >
                                  {tipoCalculoOpciones.map((opcion) => (
                                    <label key={opcion.valor} className="flex items-center gap-2 text-sm">
                                      <RadioGroupItem value={opcion.valor} className="data-checked:bg-primary" />
                                      {opcion.nombre}
                                    </label>
                                  ))}
                                </RadioGroup>
                                {errorCalculo && <FieldError errors={[{ message: errorCalculo }]} />}
                              </Field>
                            )}
                          </form.Field>
                        )
                      }
                    </form.Subscribe>

                    {/* Solo con `tipoCalculo = PONDERADO` (rango `valorPonderacionRango`). */}
                    <form.Subscribe selector={(state) => state.values.recuperacionTipoCalculo}>
                      {(tipoCalculo) =>
                        tipoCalculo !== "PONDERADO" ? null : (
                          <form.Field name="recuperacionValorPonderacion">
                            {(field) => (
                              <Field variant="outlined" data-invalid={!!errorPonderacion}>
                                <FieldLabel htmlFor={field.name}>Valor de ponderación (%) *</FieldLabel>
                                <Input
                                  id={field.name}
                                  inputMode="numeric"
                                  placeholder="Ej: 100"
                                  maxLength={3}
                                  value={field.state.value?.toString() ?? ""}
                                  onChange={(e) => {
                                    const digits = toPositiveDigitsInput(e.target.value, 3)
                                    const max = recuperacion?.reglas.valorPonderacionRango.max ?? 100
                                    const parsed = digits === "" ? undefined : Math.min(Number(digits), max)
                                    field.handleChange(parsed)
                                  }}
                                  disabled={disabled}
                                  aria-invalid={!!errorPonderacion}
                                />
                                {errorPonderacion && <FieldError errors={[{ message: errorPonderacion }]} />}
                              </Field>
                            )}
                          </form.Field>
                        )
                      }
                    </form.Subscribe>

                    <form.Subscribe
                      selector={(state) => ({
                        tipoCalculo: state.values.recuperacionTipoCalculo,
                        valorPonderacion: state.values.recuperacionValorPonderacion,
                      })}
                    >
                      {({ tipoCalculo, valorPonderacion }) => {
                        if (!tipoCalculo) return null
                        const mensaje =
                          tipoCalculo === "PONDERADO"
                            ? valorPonderacion != null
                              ? `Este porcentaje corresponde al valor de la recuperación. El valor restante (${100 - valorPonderacion}%) se aplicará a la nota actual.`
                              : null
                            : "El resultado será el promedio entre la nota actual de la actividad y la nota de recuperación."
                        if (!mensaje) return null
                        return (
                          <div className="border-blue-stroke bg-blue-22 text-blue col-span-full flex items-start gap-2 rounded-md border p-3 text-sm">
                            <InfoIcon className="mt-0.5 size-4 shrink-0" />
                            {mensaje}
                          </div>
                        )
                      }}
                    </form.Subscribe>
                  </div>
                )
              }
            </form.Subscribe>
          </div>
        )
      }
    </form.Subscribe>
  )
}
