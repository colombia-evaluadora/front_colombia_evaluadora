import { useEffect } from "react"
import { useSelector } from "@tanstack/react-form"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Textarea } from "@/components/ui/textarea"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { PlusCircleIcon, TrashIcon } from "@/components/ui/icons"
import type { EscalaValoracion, EscalaValoracionTipo, Nivel } from "@/features/planeador/api/types/actividad"
import type { UnidadTematica } from "@/features/planeador/api/types/unidad-tematica"
import { TEXTAREA_OUTLINED } from "@/features/planeador/components/forms/form-editar-actividad/constants"
import type { FormActividad } from "@/features/planeador/components/forms/form-editar-actividad/types"
import { cryptoId } from "@/features/planeador/components/forms/form-editar-actividad/helpers"
import { ERROR_OBLIGATORIO } from "@/features/planeador/components/forms/form-editar-actividad/hooks"
import { SoloEdicion } from "@/features/planeador/components/forms/form-editar-actividad/solo-edicion"

/**
 * Editor de la escala de valoración: Numérica (rango + interpretación) o Cualitativa
 * (niveles editables). Al pasar a Cualitativa sin niveles se siembran los por defecto.
 */
const NIVELES_CUALITATIVOS_DEFAULT = ["Bajo", "Medio", "Alto"]

/** Elige el default por nombre ya usado, no por posición: evita nombres repetidos al borrar. */
function nextNivelCualitativoNombre(nivelesActuales: { nombre: string }[]): string {
  const nombresUsados = new Set(nivelesActuales.map((nivel) => nivel.nombre))
  const siguienteDefault = NIVELES_CUALITATIVOS_DEFAULT.find((nombre) => !nombresUsados.has(nombre))
  return siguienteDefault ?? `Nivel ${nivelesActuales.length + 1}`
}

/**
 * Niveles iniciales de la escala cualitativa: los de la rúbrica de la unidad (con sus
 * descripciones) como borrador independiente; sin ellos, `NIVELES_CUALITATIVOS_DEFAULT`.
 */
function nivelesCualitativosDesdeUnidad(
  unidad: UnidadTematica | undefined,
): { nombre: string; descripcion: string }[] | null {
  const primerCriterio = unidad?.criterios[0]
  if (!primerCriterio || primerCriterio.niveles.length === 0) return null
  return primerCriterio.niveles.map((nivel) => {
    const descripciones = unidad!.criterios
      .map((criterio) => criterio.niveles.find((n) => n.nombre === nivel.nombre)?.descripcion.trim())
      .filter((descripcion): descripcion is string => !!descripcion)
    return { nombre: nivel.nombre, descripcion: descripciones.join(" / ") }
  })
}

export function EscalaValoracionSection({
  form,
  unidades,
  tipoEvaluacion,
  disabled,
}: {
  form: FormActividad
  unidades: UnidadTematica[]
  /** `TIPO_EVALUACION` del referente; `null` no restringe. */
  tipoEvaluacion: string | null
  disabled: boolean
}) {
  const unidadId = useSelector(form.store, (state) => state.values.unidad.id) || undefined
  const unidadActual = unidades.find((u) => u.id === unidadId)
  // Errores inline; quien frena el guardado es `faltantesEscala`.
  const intentoGuardar = useSelector(form.store, (state) => state.submissionAttempts) > 0

  // CUANTITATIVA solo admite Numérica, CUALITATIVA solo Cualitativa; mixto o sin dato, ambas.
  const permiteNumerica = tipoEvaluacion !== "CUALITATIVA"
  const permiteCualitativa = tipoEvaluacion !== "CUANTITATIVA"

  // Si la escala elegida dejó de estar permitida se corrige al único tipo admitido.
  const escalaTipoActual = useSelector(form.store, (state) => state.values.escalaValoracion.tipo)
  useEffect(() => {
    if (escalaTipoActual === "Numérica" && !permiteNumerica) {
      form.setFieldValue("escalaValoracion", (prev) => ({ ...prev, tipo: "Cualitativa" }))
    } else if (escalaTipoActual === "Cualitativa" && !permiteCualitativa) {
      form.setFieldValue("escalaValoracion", (prev) => ({ ...prev, tipo: "Numérica" }))
    }
  }, [escalaTipoActual, permiteNumerica, permiteCualitativa, form])

  return (
    <Card className="gap-4 p-4">
      <h3 className="text-base font-semibold">Definición Escala de Valoración</h3>

      <form.Subscribe selector={(state) => state.values.esEvaluativa}>
        {(esEvaluativa) => (
          <form.Field name="escalaValoracion">
            {(field) => {
              const escala = field.state.value as EscalaValoracion

              function updateEscala(patch: Partial<EscalaValoracion>) {
                field.handleChange({ ...escala, ...patch })
              }

              function updateNivel(nIndex: number, patch: Partial<Nivel>) {
                const next = escala.niveles.slice()
                next[nIndex] = { ...next[nIndex]!, ...patch }
                field.handleChange({ ...escala, niveles: next })
              }

              function removeNivel(nIndex: number) {
                const next = escala.niveles.slice()
                next.splice(nIndex, 1)
                field.handleChange({ ...escala, niveles: next })
              }

              const minimoAusente = intentoGuardar && escala.valorMinimo == null
              const maximoAusente = intentoGuardar && escala.valorMaximo == null
              const rangoInvertido =
                intentoGuardar &&
                escala.valorMinimo != null &&
                escala.valorMaximo != null &&
                escala.valorMinimo >= escala.valorMaximo
              const sinNiveles = intentoGuardar && escala.niveles.length === 0

              return (
                <>
                  <div>
                    <h4 className="mb-3 text-sm font-semibold">Criterios generales</h4>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <Field variant="outlined">
                        <FieldLabel htmlFor={`${escala.id}-criterios-generales`}>
                          Criterios generales (separados por coma)
                        </FieldLabel>
                        <Input
                          id={`${escala.id}-criterios-generales`}
                          placeholder="Criterio A, Criterio B"
                          maxLength={50}
                          value={escala.criteriosGenerales}
                          onChange={(e) => updateEscala({ criteriosGenerales: e.target.value })}
                          disabled={disabled}
                        />
                      </Field>

                      <Field variant="outlined">
                        <FieldLabel>Escala</FieldLabel>
                        <RadioGroup
                          className="flex min-h-11 items-center gap-6 rounded-md border border-input px-3"
                          value={escala.tipo}
                          disabled={disabled}
                          onValueChange={(value) => {
                            const tipo = value as EscalaValoracionTipo
                            // Solo siembra si no hay niveles cargados.
                            const niveles =
                              tipo === "Cualitativa" && escala.niveles.length === 0
                                ? (
                                    nivelesCualitativosDesdeUnidad(unidadActual) ??
                                    NIVELES_CUALITATIVOS_DEFAULT.map((nombre) => ({
                                      nombre,
                                      descripcion: "",
                                    }))
                                  ).map((nivel) => ({ id: cryptoId(), ...nivel }))
                                : escala.niveles
                            updateEscala({ tipo, niveles })
                          }}
                        >
                          {/* La opción que el referente no admite ni se muestra. */}
                          {permiteNumerica && (
                            <label className="flex items-center gap-2">
                              <RadioGroupItem value="Numérica" className="data-checked:bg-primary" />
                              Numérica
                            </label>
                          )}
                          {permiteCualitativa && (
                            <label className="flex items-center gap-2">
                              <RadioGroupItem
                                value="Cualitativa"
                                className="data-checked:bg-primary"
                              />
                              Cualitativa
                            </label>
                          )}
                        </RadioGroup>
                      </Field>
                    </div>

                    {escala.tipo === "Numérica" && (
                      <>
                        <div className="mt-4 grid gap-4 sm:grid-cols-2">
                          <Field variant="outlined" data-invalid={minimoAusente}>
                            <FieldLabel htmlFor={`${escala.id}-valor-minimo`}>
                              Valor mínimo *
                            </FieldLabel>
                            <Input
                              id={`${escala.id}-valor-minimo`}
                              type="number"
                              placeholder="(ej. 1)"
                              value={escala.valorMinimo ?? ""}
                              onChange={(e) => {
                                const raw = e.target.value
                                updateEscala({
                                  valorMinimo: raw === "" ? undefined : Number(raw),
                                })
                              }}
                              aria-invalid={minimoAusente}
                              disabled={disabled}
                            />
                            {minimoAusente && <FieldError errors={ERROR_OBLIGATORIO} />}
                          </Field>
                          <Field variant="outlined" data-invalid={maximoAusente || rangoInvertido}>
                            <FieldLabel htmlFor={`${escala.id}-valor-maximo`}>
                              Valor máximo *
                            </FieldLabel>
                            <Input
                              id={`${escala.id}-valor-maximo`}
                              type="number"
                              placeholder="(ej. 5)"
                              value={escala.valorMaximo ?? ""}
                              onChange={(e) => {
                                const raw = e.target.value
                                updateEscala({
                                  valorMaximo: raw === "" ? undefined : Number(raw),
                                })
                              }}
                              aria-invalid={maximoAusente || rangoInvertido}
                              disabled={disabled}
                            />
                            {maximoAusente && <FieldError errors={ERROR_OBLIGATORIO} />}
                            {rangoInvertido && (
                              <FieldError errors={[{ message: "Debe ser mayor que el valor mínimo." }]} />
                            )}
                          </Field>
                        </div>

                        <Field variant="outlined" className="mt-4">
                          <FieldLabel htmlFor={`${escala.id}-interpretacion`}>
                            Interpretación de rangos
                          </FieldLabel>
                          <Textarea
                            id={`${escala.id}-interpretacion`}
                            className={TEXTAREA_OUTLINED}
                            rows={3}
                            placeholder="Agregar"
                            maxLength={500}
                            value={escala.interpretacionRangos}
                            onChange={(e) =>
                              updateEscala({ interpretacionRangos: e.target.value })
                            }
                            disabled={disabled}
                          />
                        </Field>
                      </>
                    )}

                    {escala.tipo === "Cualitativa" && (
                      <div className="mt-4">
                        <div className="mb-3 flex items-center justify-between">
                          <h4 className="text-sm font-semibold">Definiciones cualitativas</h4>
                          <SoloEdicion>
                          <Tooltip>
                          <TooltipTrigger
                            render={
                              <Button
                                variant="fill"
                                color="primary"
                                size="icon-sm"
                                type="button"
                                aria-label="Agregar definición cualitativa"
                                disabled={disabled}
                                onClick={() => {
                              // Lista vacía: el "+" siembra todo el set por defecto.
                              if (escala.niveles.length === 0) {
                                const niveles = (
                                  nivelesCualitativosDesdeUnidad(unidadActual) ??
                                  NIVELES_CUALITATIVOS_DEFAULT.map((nombre) => ({
                                    nombre,
                                    descripcion: "",
                                  }))
                                ).map((nivel) => ({ id: cryptoId(), ...nivel }))
                                updateEscala({ niveles })
                                return
                              }
                              updateEscala({
                                niveles: [
                                  ...escala.niveles,
                                  {
                                    id: cryptoId(),
                                    nombre: nextNivelCualitativoNombre(escala.niveles),
                                    descripcion: "",
                                  },
                                ],
                              })
                                }}
                              />
                            }
                          >
                            <PlusCircleIcon />
                          </TooltipTrigger>
                          <TooltipContent>Agregar definición cualitativa</TooltipContent>
                          </Tooltip>
                          </SoloEdicion>
                        </div>

                        {escala.niveles.length === 0 ? (
                          <div data-invalid={sinNiveles}>
                            {sinNiveles ? (
                              <FieldError errors={[{ message: "Agrega al menos una definición cualitativa." }]} />
                            ) : (
                              <p className="text-muted-foreground text-sm">
                                Esta escala todavía no tiene definiciones cualitativas.
                              </p>
                            )}
                          </div>
                        ) : (
                          <ul className="flex flex-col gap-3">
                            {escala.niveles.map((nivel, nIndex) => {
                              const descripcionInvalida = intentoGuardar && !nivel.descripcion.trim()
                              // El backend exige siempre el puntaje de cada nivel (0-100).
                              const puntajeInvalido =
                                intentoGuardar &&
                                (nivel.ponderacion == null || nivel.ponderacion < 0 || nivel.ponderacion > 100)
                              return (
                              <li
                                key={nivel.id}
                                className={cn(
                                  "grid items-start gap-3",
                                  esEvaluativa
                                    ? "sm:grid-cols-[minmax(7rem,auto)_minmax(0,1fr)_9rem_auto]"
                                    : "sm:grid-cols-[minmax(7rem,auto)_minmax(0,1fr)_auto]",
                                )}
                              >
                                {/* El nombre del nivel es editable (a diferencia de la rúbrica). */}
                                <Input
                                  variant="outlined"
                                  maxLength={50}
                                  value={nivel.nombre}
                                  onChange={(e) => updateNivel(nIndex, { nombre: e.target.value })}
                                  disabled={disabled}
                                />
                                <Field data-invalid={descripcionInvalida}>
                                  <Input
                                    variant="outlined"
                                    placeholder="Interpretación / descriptor"
                                    maxLength={50}
                                    value={nivel.descripcion}
                                    onChange={(e) =>
                                      updateNivel(nIndex, { descripcion: e.target.value })
                                    }
                                    aria-invalid={descripcionInvalida}
                                    disabled={disabled}
                                  />
                                  {descripcionInvalida && <FieldError errors={ERROR_OBLIGATORIO} />}
                                </Field>
                                {esEvaluativa && (
                                  <Field variant="outlined" data-invalid={puntajeInvalido}>
                                    <FieldLabel htmlFor={`${nivel.id}-ponderacion`}>
                                      Puntaje *
                                    </FieldLabel>
                                    <Input
                                      id={`${nivel.id}-ponderacion`}
                                      type="number"
                                      min={0}
                                      max={100}
                                      value={nivel.ponderacion ?? ""}
                                      onChange={(e) => {
                                        const raw = e.target.value
                                        updateNivel(nIndex, {
                                          ponderacion: raw === "" ? undefined : Number(raw),
                                        })
                                      }}
                                      aria-invalid={puntajeInvalido}
                                      disabled={disabled}
                                    />
                                    {puntajeInvalido && (
                                      <FieldError
                                        errors={
                                          nivel.ponderacion == null
                                            ? ERROR_OBLIGATORIO
                                            : [{ message: "El puntaje debe estar entre 0 y 100." }]
                                        }
                                      />
                                    )}
                                  </Field>
                                )}
                                <SoloEdicion>
                                <Tooltip>
                                  <TooltipTrigger
                                    render={
                                      <Button
                                        variant="ghost"
                                        color="neutral"
                                        size="icon-sm"
                                        type="button"
                                        aria-label={`Quitar nivel ${nivel.nombre}`}
                                        disabled={disabled}
                                        onClick={() => removeNivel(nIndex)}
                                      />
                                    }
                                  >
                                    <TrashIcon />
                                  </TooltipTrigger>
                                  <TooltipContent>{`Quitar nivel ${nivel.nombre}`}</TooltipContent>
                                </Tooltip>
                                </SoloEdicion>
                              </li>
                              )
                            })}
                          </ul>
                        )}
                      </div>
                    )}
                  </div>
                </>
              )
            }}
          </form.Field>
        )}
      </form.Subscribe>
    </Card>
  )
}
