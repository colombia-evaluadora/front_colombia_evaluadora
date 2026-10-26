import { useEffect } from "react"
import { useSelector } from "@tanstack/react-form"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Textarea } from "@/components/ui/textarea"
import { PlusCircleIcon, TrashIcon } from "@/components/ui/icons"
import {
  useEscalaPrecargaQuery,
  type EscalaPrecarga,
} from "@/features/planeador/api/query/use-escala-precarga-query"
import type {
  EscalaCriterio,
  EscalaValoracion,
  EscalaValoracionTipo,
  Nivel,
} from "@/features/planeador/api/types/actividad"
import { TEXTAREA_OUTLINED } from "@/features/planeador/components/forms/form-editar-actividad/constants"
import type { FormActividad } from "@/features/planeador/components/forms/form-editar-actividad/types"
import { cryptoId } from "@/features/planeador/components/forms/form-editar-actividad/helpers"
import { ERROR_OBLIGATORIO } from "@/features/planeador/components/forms/form-editar-actividad/hooks"
import { SoloEdicion } from "@/features/planeador/components/forms/form-editar-actividad/solo-edicion"

/**
 * Niveles con que nace cada criterio cualitativo (Regla 42): una COPIA de la escala de
 * valoración del período para el nivel de enseñanza del grado (etiqueta, descripción y
 * puntaje de cada nivel, `GET /planeador/actividades/escala-precarga`). Al ser copia, lo
 * que el docente edite, agregue o quite queda solo en ese criterio de esta actividad.
 * Sin escala configurada arranca con un nivel en blanco.
 */
function nivelesIniciales(precarga: EscalaPrecarga | undefined): Nivel[] {
  const niveles = precarga?.niveles ?? []
  if (niveles.length === 0) return [{ id: cryptoId(), nombre: "", descripcion: "" }]
  return niveles.map((nivel) => ({ id: cryptoId(), ...nivel }))
}

/** Criterio nuevo (Reglas 40/41/42): numérico con el máximo del formato de calificación, o cualitativo con la escala del período. */
function nuevoCriterio(tipo: EscalaValoracionTipo, precarga: EscalaPrecarga | undefined): EscalaCriterio {
  return tipo === "Numérica"
    ? {
        id: cryptoId(),
        nombre: "",
        valorMinimo: precarga?.valorMinimo ?? 0,
        valorMaximo: precarga?.valorMaximo,
        interpretacion: "",
        niveles: [],
      }
    : { id: cryptoId(), nombre: "", interpretacion: "", niveles: nivelesIniciales(precarga) }
}

/** Regla 42: el valor máximo de un criterio cualitativo es el puntaje más alto de sus niveles. */
function valorMaximoCriterio(criterio: EscalaCriterio): number | undefined {
  const puntajes = criterio.niveles.map((n) => n.ponderacion).filter((p): p is number => p != null)
  return puntajes.length > 0 ? Math.max(...puntajes) : undefined
}

function numeroDesdeInput(raw: string): number | undefined {
  return raw === "" ? undefined : Number(raw)
}

/**
 * Editor de la escala de valoración (Reglas 40-42). El modo (Numérica/Cualitativa) es
 * de toda la escala; cada criterio es un bloque independiente ("+ Agregar más") con su
 * nombre y:
 * - Numérica: "Valor Asignado (Escala)" — valor mínimo/máximo (el máximo se autocompleta
 *   desde el formato de calificación del criterio de evaluación del período y es
 *   editable por criterio) e interpretación (texto libre único).
 * - Cualitativa: "Escala de Niveles" ("+ Agregar Nivel") con Etiqueta, Descriptor y
 *   Puntaje; el valor máximo del criterio es el puntaje más alto (solo lectura).
 * La nota del instrumento la calcula el backend: suma obtenida / suma de máximos.
 * "Otro (personalizado)" con método Escala monta este mismo componente (Regla 41).
 */
export function EscalaValoracionSection({
  form,
  tipoEvaluacion,
  disabled,
}: {
  form: FormActividad
  /** `TIPO_EVALUACION` del referente; `null` no restringe. */
  tipoEvaluacion: string | null
  disabled: boolean
}) {
  // Errores inline; quien frena el guardado es `faltantesEscala`.
  const intentoGuardar = useSelector(form.store, (state) => state.submissionAttempts) > 0
  const grupoId = useSelector(form.store, (state) => state.values.grupoId)
  const asignaturaId = useSelector(form.store, (state) => state.values.asignaturaId)
  const unidadId = useSelector(form.store, (state) => state.values.unidad.id) || undefined
  // Mientras carga la precarga no se crean criterios: nacerían sin los valores del período.
  const { data: precarga, isLoading: cargandoPrecarga } = useEscalaPrecargaQuery({ grupoId, asignaturaId, unidadId }, !disabled)

  // CUANTITATIVA solo admite Numérica, CUALITATIVA solo Cualitativa; mixto o sin dato, ambas.
  const permiteNumerica = tipoEvaluacion !== "CUALITATIVA"
  const permiteCualitativa = tipoEvaluacion !== "CUANTITATIVA"

  // Si el modo elegido dejó de estar permitido se corrige al único admitido (los
  // criterios se rehacen conservando el nombre: rango y niveles no se traducen).
  const escalaTipoActual = useSelector(form.store, (state) => state.values.escalaValoracion.tipo)
  useEffect(() => {
    const forzado: EscalaValoracionTipo | null =
      escalaTipoActual === "Numérica" && !permiteNumerica
        ? "Cualitativa"
        : escalaTipoActual === "Cualitativa" && !permiteCualitativa
          ? "Numérica"
          : null
    if (forzado) {
      form.setFieldValue("escalaValoracion", (prev) => ({
        ...prev,
        tipo: forzado,
        criterios: prev.criterios.map((c) => ({ ...nuevoCriterio(forzado, precarga), id: c.id, nombre: c.nombre })),
      }))
    }
  }, [escalaTipoActual, permiteNumerica, permiteCualitativa, form, precarga])

  return (
    <Card className="gap-4 p-4">
      <h3 className="text-base font-semibold">Definición Escala de Valoración</h3>

      <form.Field name="escalaValoracion">
        {(field) => {
          const escala = field.state.value as EscalaValoracion

          function setCriterios(criterios: EscalaCriterio[]) {
            field.handleChange({ ...escala, criterios })
          }

          function updateCriterio(index: number, patch: Partial<EscalaCriterio>) {
            const next = escala.criterios.slice()
            next[index] = { ...next[index]!, ...patch }
            setCriterios(next)
          }

          const sinCriterios = intentoGuardar && escala.criterios.length === 0

          return (
            <>
              <Field variant="outlined" className="sm:max-w-md">
                <FieldLabel>Modo de la escala</FieldLabel>
                <RadioGroup
                  className="flex min-h-11 items-center gap-6 rounded-md border border-input px-3"
                  value={escala.tipo}
                  disabled={disabled || cargandoPrecarga}
                  onValueChange={(value) => {
                    const tipo = value as EscalaValoracionTipo
                    if (tipo === escala.tipo) return
                    // Cambiar de modo rehace cada criterio (conserva el nombre) con la precarga del nuevo modo.
                    field.handleChange({
                      ...escala,
                      tipo,
                      criterios: escala.criterios.map((c) => ({
                        ...nuevoCriterio(tipo, precarga),
                        id: c.id,
                        nombre: c.nombre,
                      })),
                    })
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
                      <RadioGroupItem value="Cualitativa" className="data-checked:bg-primary" />
                      Cualitativa
                    </label>
                  )}
                </RadioGroup>
              </Field>

              {precarga?.escala && (
                <p className="text-muted-foreground text-xs" data-testid="escala-precarga-origen">
                  {escala.tipo === "Cualitativa"
                    ? `Los niveles de cada criterio nuevo se precargan desde "${precarga.escala}". Los cambios solo aplican a ese criterio de esta actividad.`
                    : `El valor máximo se precarga desde el formato de calificación${precarga.formato ? ` "${precarga.formato}"` : ""}; puede ajustarlo en cada criterio.`}
                </p>
              )}

              {escala.criterios.length === 0 && (
                <div data-invalid={sinCriterios}>
                  {sinCriterios ? (
                    <FieldError errors={[{ message: "Agrega al menos un criterio." }]} />
                  ) : (
                    <p className="text-muted-foreground text-sm">Esta escala todavía no tiene criterios.</p>
                  )}
                </div>
              )}

              <ul className="flex flex-col gap-4">
                {escala.criterios.map((criterio, index) => (
                  <li key={criterio.id}>
                    <CriterioEscalaCard
                      criterio={criterio}
                      index={index}
                      tipo={escala.tipo}
                      precarga={precarga}
                      intentoGuardar={intentoGuardar}
                      disabled={disabled}
                      onChange={(patch) => updateCriterio(index, patch)}
                      onRemove={() => setCriterios(escala.criterios.filter((_, i) => i !== index))}
                    />
                  </li>
                ))}
              </ul>

              <SoloEdicion>
                <div>
                  <Button
                    variant="outline"
                    color="primary"
                    type="button"
                    disabled={disabled || cargandoPrecarga}
                    onClick={() => setCriterios([...escala.criterios, nuevoCriterio(escala.tipo, precarga)])}
                  >
                    <PlusCircleIcon data-icon="inline-start" />
                    Agregar más
                  </Button>
                </div>
              </SoloEdicion>
            </>
          )
        }}
      </form.Field>
    </Card>
  )
}

function CriterioEscalaCard({
  criterio,
  index,
  tipo,
  precarga,
  intentoGuardar,
  disabled,
  onChange,
  onRemove,
}: {
  criterio: EscalaCriterio
  index: number
  tipo: EscalaValoracionTipo
  precarga: EscalaPrecarga | undefined
  intentoGuardar: boolean
  disabled: boolean
  onChange: (patch: Partial<EscalaCriterio>) => void
  onRemove: () => void
}) {
  const idBase = `escala-criterio-${criterio.id}`
  const nombreInvalido = intentoGuardar && !criterio.nombre.trim()

  function updateNivel(nIndex: number, patch: Partial<Nivel>) {
    const niveles = criterio.niveles.slice()
    niveles[nIndex] = { ...niveles[nIndex]!, ...patch }
    onChange({ niveles })
  }

  return (
    <Card className="gap-4 p-4" data-testid="escala-criterio">
      <div className="flex items-start gap-3">
        <Field variant="outlined" data-invalid={nombreInvalido} className="flex-1">
          <FieldLabel htmlFor={`${idBase}-nombre`}>Nombre del criterio *</FieldLabel>
          <Input
            id={`${idBase}-nombre`}
            placeholder={`Criterio ${index + 1}`}
            maxLength={200}
            value={criterio.nombre}
            onChange={(e) => onChange({ nombre: e.target.value })}
            aria-invalid={nombreInvalido}
            disabled={disabled}
          />
          {nombreInvalido && <FieldError errors={ERROR_OBLIGATORIO} />}
        </Field>
        <SoloEdicion>
          <Button
            variant="ghost"
            color="neutral"
            size="icon-sm"
            type="button"
            className="mt-2"
            aria-label={`Quitar criterio ${criterio.nombre || index + 1}`}
            title="Quitar criterio"
            disabled={disabled}
            onClick={onRemove}
          >
            <TrashIcon />
          </Button>
        </SoloEdicion>
      </div>

      {tipo === "Numérica" ? (
        <ValorAsignado
          criterio={criterio}
          idBase={idBase}
          intentoGuardar={intentoGuardar}
          disabled={disabled}
          onChange={onChange}
        />
      ) : (
        <div className="flex flex-col gap-3">
          <h4 className="text-sm font-semibold">Escala de Niveles</h4>
          {criterio.niveles.length === 0 && (
            <div data-invalid={intentoGuardar}>
              {intentoGuardar ? (
                <FieldError errors={[{ message: "Agrega al menos un nivel." }]} />
              ) : (
                <p className="text-muted-foreground text-sm">Este criterio todavía no tiene niveles.</p>
              )}
            </div>
          )}
          <ul className="flex flex-col gap-3">
            {criterio.niveles.map((nivel, nIndex) => {
              const descripcionInvalida = intentoGuardar && !nivel.descripcion.trim()
              const puntajeInvalido =
                intentoGuardar && (nivel.ponderacion == null || nivel.ponderacion < 0 || nivel.ponderacion > 100)
              return (
                <li
                  key={nivel.id}
                  className="grid items-start gap-3 sm:grid-cols-[minmax(8rem,12rem)_minmax(0,1fr)_7rem_auto]"
                  data-testid="escala-nivel"
                >
                  <Field variant="outlined">
                    <FieldLabel htmlFor={`${nivel.id}-etiqueta`}>Etiqueta</FieldLabel>
                    <Input
                      id={`${nivel.id}-etiqueta`}
                      maxLength={130}
                      placeholder="Ej. En proceso"
                      value={nivel.nombre}
                      onChange={(e) => updateNivel(nIndex, { nombre: e.target.value })}
                      disabled={disabled}
                    />
                  </Field>
                  <Field variant="outlined" data-invalid={descripcionInvalida}>
                    <FieldLabel htmlFor={`${nivel.id}-descriptor`}>Descriptor *</FieldLabel>
                    <Textarea
                      id={`${nivel.id}-descriptor`}
                      className={TEXTAREA_OUTLINED}
                      rows={2}
                      maxLength={4000}
                      placeholder="Qué evidencia este nivel"
                      value={nivel.descripcion}
                      onChange={(e) => updateNivel(nIndex, { descripcion: e.target.value })}
                      aria-invalid={descripcionInvalida}
                      disabled={disabled}
                    />
                    {descripcionInvalida && <FieldError errors={ERROR_OBLIGATORIO} />}
                  </Field>
                  <Field variant="outlined" data-invalid={puntajeInvalido}>
                    <FieldLabel htmlFor={`${nivel.id}-puntaje`}>Puntaje *</FieldLabel>
                    <Input
                      id={`${nivel.id}-puntaje`}
                      type="number"
                      min={0}
                      max={100}
                      step="any"
                      value={nivel.ponderacion ?? ""}
                      onChange={(e) => updateNivel(nIndex, { ponderacion: numeroDesdeInput(e.target.value) })}
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
                  <SoloEdicion>
                    <Button
                      variant="ghost"
                      color="neutral"
                      size="icon-sm"
                      type="button"
                      className="mt-2"
                      aria-label={`Quitar nivel ${nivel.nombre || nIndex + 1}`}
                      title="Quitar nivel"
                      disabled={disabled}
                      onClick={() => onChange({ niveles: criterio.niveles.filter((_, i) => i !== nIndex) })}
                    >
                      <TrashIcon />
                    </Button>
                  </SoloEdicion>
                </li>
              )
            })}
          </ul>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <SoloEdicion>
              <Button
                variant="ghost"
                color="primary"
                type="button"
                disabled={disabled}
                onClick={() =>
                  onChange({
                    niveles:
                      criterio.niveles.length === 0
                        ? nivelesIniciales(precarga)
                        : [...criterio.niveles, { id: cryptoId(), nombre: "", descripcion: "" }],
                  })
                }
              >
                <PlusCircleIcon data-icon="inline-start" />
                Agregar Nivel
              </Button>
            </SoloEdicion>
            {/* Regla 42: solo lectura, el puntaje más alto de los niveles. */}
            <Field variant="outlined" className="w-40">
              <FieldLabel htmlFor={`${idBase}-valor-maximo`}>Valor máximo</FieldLabel>
              <Input id={`${idBase}-valor-maximo`} readOnly disabled value={valorMaximoCriterio(criterio) ?? ""} />
            </Field>
          </div>
        </div>
      )}
    </Card>
  )
}

function ValorAsignado({
  criterio,
  idBase,
  intentoGuardar,
  disabled,
  onChange,
}: {
  criterio: EscalaCriterio
  idBase: string
  intentoGuardar: boolean
  disabled: boolean
  onChange: (patch: Partial<EscalaCriterio>) => void
}) {
  const minimoAusente = intentoGuardar && criterio.valorMinimo == null
  const maximoAusente = intentoGuardar && criterio.valorMaximo == null
  const rangoInvertido =
    intentoGuardar &&
    criterio.valorMinimo != null &&
    criterio.valorMaximo != null &&
    criterio.valorMinimo >= criterio.valorMaximo
  return (
    <div className="flex flex-col gap-3">
      <h4 className="text-sm font-semibold">Valor Asignado (Escala)</h4>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field variant="outlined" data-invalid={minimoAusente}>
          <FieldLabel htmlFor={`${idBase}-minimo`}>Valor mínimo *</FieldLabel>
          <Input
            id={`${idBase}-minimo`}
            type="number"
            step="any"
            value={criterio.valorMinimo ?? ""}
            onChange={(e) => onChange({ valorMinimo: numeroDesdeInput(e.target.value) })}
            aria-invalid={minimoAusente}
            disabled={disabled}
          />
          {minimoAusente && <FieldError errors={ERROR_OBLIGATORIO} />}
        </Field>
        <Field variant="outlined" data-invalid={maximoAusente || rangoInvertido}>
          <FieldLabel htmlFor={`${idBase}-maximo`}>Valor máximo *</FieldLabel>
          <Input
            id={`${idBase}-maximo`}
            type="number"
            step="any"
            value={criterio.valorMaximo ?? ""}
            onChange={(e) => onChange({ valorMaximo: numeroDesdeInput(e.target.value) })}
            aria-invalid={maximoAusente || rangoInvertido}
            disabled={disabled}
          />
          {maximoAusente && <FieldError errors={ERROR_OBLIGATORIO} />}
          {rangoInvertido && <FieldError errors={[{ message: "Debe ser mayor que el valor mínimo." }]} />}
        </Field>
      </div>
      <Field variant="outlined">
        <FieldLabel htmlFor={`${idBase}-interpretacion`}>Interpretación</FieldLabel>
        <Textarea
          id={`${idBase}-interpretacion`}
          className={TEXTAREA_OUTLINED}
          rows={3}
          maxLength={4000}
          placeholder="Qué significa cada tramo del rango"
          value={criterio.interpretacion}
          onChange={(e) => onChange({ interpretacion: e.target.value })}
          disabled={disabled}
        />
      </Field>
    </div>
  )
}
