import { useState } from "react"
import { useSelector } from "@tanstack/react-form"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import { CharacterCounter } from "@/components/ui/character-counter"
import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { PlusCircleIcon, TrashIcon } from "@/components/ui/icons"
import type { Criterio } from "@/features/planeador/api/types/actividad"
import type { UnidadTematica } from "@/features/planeador/api/types/unidad-tematica"
import { TEXTAREA_OUTLINED } from "@/features/planeador/components/forms/form-editar-actividad/constants"
import type { FormActividad } from "@/features/planeador/components/forms/form-editar-actividad/types"
import { cryptoId } from "@/features/planeador/components/forms/form-editar-actividad/helpers"
import { ERROR_OBLIGATORIO } from "@/features/planeador/components/forms/form-editar-actividad/hooks"
import { SoloEdicion } from "@/features/planeador/components/forms/form-editar-actividad/solo-edicion"

export function RubricasSection({
  form,
  unidades,
  disabled,
}: {
  form: FormActividad
  unidades: UnidadTematica[]
  disabled: boolean
}) {
  // Rúbrica: al menos un criterio es obligatorio.
  const submissionAttempts = useSelector(form.store, (state) => state.submissionAttempts)
  // El puntaje es obligatorio solo si la unidad calcula por Ponderado o Suma de puntos (si no, pesa 1).
  const unidadId = useSelector(form.store, (state) => state.values.unidad.id) || undefined
  const unidadActual = unidades.find((u) => u.id === unidadId)
  const puntajeObligatorio = unidadActual != null && unidadActual.metodoCalculo !== "Promedio simple"
  return (
    <Card className="gap-4 p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold">Definición de Rúbricas *</h3>
        <SoloEdicion>
        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                variant="fill"
                color="primary"
                size="icon-sm"
                type="button"
                aria-label="Agregar criterio"
                disabled={disabled}
                onClick={() => {
                  const rubrica = form.getFieldValue("rubrica") as {
                    id: number
                    criterios: Criterio[]
                  }
                  form.setFieldValue("rubrica", {
                    ...rubrica,
                    criterios: [
                      ...rubrica.criterios,
                      { id: cryptoId(), nombre: "", descripcion: "", excelente: "", niveles: [], ponderacion: 0 },
                    ],
                  })
                }}
              />
            }
          >
            <PlusCircleIcon />
          </TooltipTrigger>
          <TooltipContent>Agregar criterio</TooltipContent>
        </Tooltip>
        </SoloEdicion>
      </div>

      <form.Subscribe selector={(state) => state.values.esEvaluativa}>
        {(esEvaluativa) => (
          <form.Field
            name="rubrica"
            validators={{
              onChange: ({ value }) => {
                const rubrica = value as { id: number; criterios: Criterio[] }
                return rubrica.criterios.length === 0
                  ? { message: "Agrega al menos un criterio de rúbrica." }
                  : undefined
              },
            }}
          >
            {(field) => {
              const rubrica = field.state.value as { id: number; criterios: Criterio[] }
              const isInvalid = (field.state.meta.isTouched || submissionAttempts > 0) && !field.state.meta.isValid
              if (rubrica.criterios.length === 0) {
                return (
                  <div className="rounded-md border border-dashed p-3" data-invalid={isInvalid}>
                    {isInvalid ? (
                      <FieldError errors={field.state.meta.errors} />
                    ) : (
                      <p className="text-muted-foreground text-sm">
                        Agrega al menos un criterio con el botón de arriba.
                      </p>
                    )}
                  </div>
                )
              }
              return (
                <>
                  <ul className="flex flex-col gap-6">
                    {rubrica.criterios.map((criterio, index) => (
                      <CriterioItem
                        key={criterio.id}
                        criterio={criterio}
                        index={index}
                        esEvaluativa={esEvaluativa}
                        puntajeObligatorio={puntajeObligatorio}
                        disabled={disabled}
                        submissionAttempts={submissionAttempts}
                        onChange={(next) => {
                          const current = field.state.value as { id: number; criterios: Criterio[] }
                          const next_criterios = current.criterios.slice()
                          next_criterios[index] = next
                          field.handleChange({ ...current, criterios: next_criterios })
                        }}
                        onRemove={() => {
                          const current = field.state.value as { id: number; criterios: Criterio[] }
                          const next_criterios = current.criterios.slice()
                          next_criterios.splice(index, 1)
                          field.handleChange({ ...current, criterios: next_criterios })
                        }}
                      />
                    ))}
                  </ul>
                  {/* Botón repetido al pie para no tener que volver arriba (QA Bloque 5, criterio #3). */}
                  <SoloEdicion>
                  <div className="flex justify-end">
                    <Button
                      variant="fill"
                      color="primary"
                      type="button"
                      disabled={disabled}
                      onClick={() => {
                        const current = field.state.value as { id: number; criterios: Criterio[] }
                        field.handleChange({
                          ...current,
                          criterios: [
                            ...current.criterios,
                            { id: cryptoId(), nombre: "", descripcion: "", excelente: "", niveles: [], ponderacion: 0 },
                          ],
                        })
                      }}
                    >
                      <PlusCircleIcon data-icon="inline-start" />
                      Agregar criterio
                    </Button>
                  </div>
                  </SoloEdicion>
                </>
              )
            }}
          </form.Field>
        )}
      </form.Subscribe>
    </Card>
  )
}

function CriterioItem({
  criterio,
  index,
  esEvaluativa,
  puntajeObligatorio,
  disabled,
  submissionAttempts,
  onChange,
  onRemove,
}: {
  criterio: Criterio
  index: number
  /** Con actividad sumativa cada nivel lleva su campo de puntaje. */
  esEvaluativa: boolean
  /**
   * Nombre y descripción de cada nivel (incluido "Excelente") obligatorios; puntaje solo si
   * `puntajeObligatorio` (si no, pesa 1). Con valor, entre 0 y 100.
   */
  puntajeObligatorio: boolean
  disabled: boolean
  /** Sin `form`: validación local por `blur`, con `submissionAttempts` como fallback. */
  submissionAttempts: number
  onChange: (next: Criterio) => void
  onRemove: () => void
}) {
  // Buffer local: no toca el criterio ni ensucia el form hasta "Agregar nivel".
  const [nivelInput, setNivelInput] = useState("")

  const [tocoNombre, setTocoNombre] = useState(false)
  const [tocoExcelenteDescripcion, setTocoExcelenteDescripcion] = useState(false)
  const [tocoExcelentePonderacion, setTocoExcelentePonderacion] = useState(false)
  // "Tocado" por `nivel.id`: la lista es dinámica.
  const [tocadosNivelDescripcion, setTocadosNivelDescripcion] = useState<Set<number>>(new Set())
  const [tocadosNivelPonderacion, setTocadosNivelPonderacion] = useState<Set<number>>(new Set())
  const marcarNivelDescripcionTocado = (id: number) =>
    setTocadosNivelDescripcion((prev) => (prev.has(id) ? prev : new Set(prev).add(id)))
  const marcarNivelPonderacionTocado = (id: number) =>
    setTocadosNivelPonderacion((prev) => (prev.has(id) ? prev : new Set(prev).add(id)))

  const nombreInvalido = (tocoNombre || submissionAttempts > 0) && !criterio.nombre.trim()
  const excelenteDescripcionInvalida =
    (tocoExcelenteDescripcion || submissionAttempts > 0) && !criterio.excelente.trim()
  const excelentePonderacionInvalida =
    puntajeObligatorio && (tocoExcelentePonderacion || submissionAttempts > 0) && criterio.excelentePonderacion == null
  // Al menos un nivel por criterio ("Excelente" cuenta si tiene contenido).
  const sinNiveles =
    submissionAttempts > 0 &&
    criterio.niveles.length === 0 &&
    !criterio.excelente.trim() &&
    criterio.excelentePonderacion == null

  return (
    <li className="rounded-md border bg-card p-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold">Criterio {index + 1}</h4>
        <SoloEdicion>
        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                variant="ghost"
                color="neutral"
                size="icon-sm"
                type="button"
                aria-label={`Quitar criterio ${index + 1}`}
                disabled={disabled}
                onClick={onRemove}
              />
            }
          >
            <TrashIcon />
          </TooltipTrigger>
          <TooltipContent>{`Quitar criterio ${index + 1}`}</TooltipContent>
        </Tooltip>
        </SoloEdicion>
      </div>

      <Field variant="outlined" className="mt-3" data-invalid={nombreInvalido}>
        <FieldLabel>Nombre del criterio</FieldLabel>
        <Input
          placeholder="Ej: Expresión oral de ideas y experiencias"
          maxLength={50}
          value={criterio.nombre}
          onChange={(e) => onChange({ ...criterio, nombre: e.target.value })}
          onBlur={() => setTocoNombre(true)}
          aria-invalid={nombreInvalido}
          disabled={disabled}
        />
        {nombreInvalido && <FieldError errors={ERROR_OBLIGATORIO} />}
      </Field>

      {/* Descripción del criterio en sí, distinta de la de cada nivel. */}
      <Field variant="outlined" className="mt-3">
        <FieldLabel>Descripción o Juicio de valor</FieldLabel>
        <Textarea
          className={TEXTAREA_OUTLINED}
          rows={2}
          placeholder="Describe qué evalúa este criterio en general"
          maxLength={4000}
          value={criterio.descripcion}
          onChange={(e) => onChange({ ...criterio, descripcion: e.target.value })}
          disabled={disabled}
        />
        <CharacterCounter value={criterio.descripcion} max={4000} />
      </Field>

      {/* "Excelente" es el nivel más alto pero vive en su propio field; usa el mismo grid que
      los niveles y solo se muestra con contenido. */}
      {(criterio.excelente !== "" || criterio.excelentePonderacion != null) && (
        <div
          className={cn(
            "mt-4 grid items-start gap-3",
            esEvaluativa
              ? "sm:grid-cols-[minmax(7rem,auto)_minmax(0,1fr)_9rem_auto]"
              : "sm:grid-cols-[minmax(7rem,auto)_minmax(0,1fr)_auto]",
          )}
        >
          <p className="pt-2 text-sm font-semibold">Excelente</p>
          <Field data-invalid={excelenteDescripcionInvalida}>
            <Textarea
              className={TEXTAREA_OUTLINED}
              rows={2}
              placeholder="Describe el desempeño esperado en este nivel"
              maxLength={500}
              value={criterio.excelente}
              onChange={(e) => onChange({ ...criterio, excelente: e.target.value })}
              onBlur={() => setTocoExcelenteDescripcion(true)}
              aria-invalid={excelenteDescripcionInvalida}
              disabled={disabled}
            />
            {excelenteDescripcionInvalida && <FieldError errors={ERROR_OBLIGATORIO} />}
          </Field>
          {/* Vacío no se guarda como `0`. */}
          {esEvaluativa && (
            <Field variant="outlined" data-invalid={excelentePonderacionInvalida}>
              <FieldLabel htmlFor={`${criterio.id}-excelente-ponderacion`}>
                Puntaje
              </FieldLabel>
              <Input
                id={`${criterio.id}-excelente-ponderacion`}
                type="number"
                min={0}
                max={100}
                value={criterio.excelentePonderacion ?? ""}
                onChange={(e) => {
                  const raw = e.target.value
                  // Regla 42: "Excelente" cuenta para el puntaje del criterio.
                  if (raw === "") {
                    const next = { ...criterio, excelentePonderacion: undefined }
                    onChange({ ...next, ponderacion: maxPonderacionCriterio(next) })
                    return
                  }
                  const num = Number(raw)
                  const next = {
                    ...criterio,
                    excelentePonderacion: Number.isNaN(num) ? undefined : Math.min(100, Math.max(0, num)),
                  }
                  onChange({ ...next, ponderacion: maxPonderacionCriterio(next) })
                }}
                onBlur={() => setTocoExcelentePonderacion(true)}
                aria-invalid={excelentePonderacionInvalida}
                disabled={disabled}
              />
              {excelentePonderacionInvalida && <FieldError errors={ERROR_OBLIGATORIO} />}
            </Field>
          )}
          {/* Quita el bloque entero (texto y puntaje). */}
          <SoloEdicion>
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  variant="ghost"
                  color="neutral"
                  size="icon-sm"
                  type="button"
                  aria-label="Quitar excelente"
                  disabled={disabled}
                  onClick={() => {
                    const next = { ...criterio, excelente: "", excelentePonderacion: undefined }
                    onChange({ ...next, ponderacion: maxPonderacionCriterio(next) })
                  }}
                />
              }
            >
              <TrashIcon />
            </TooltipTrigger>
            <TooltipContent>Quitar excelente</TooltipContent>
          </Tooltip>
          </SoloEdicion>
        </div>
      )}

      {/* Niveles: nombre como label, descripción y, si es sumativa, columna de puntaje. */}
      <ul className="mt-4 flex flex-col gap-3">
        {criterio.niveles.map((nivel, nIndex) => {
          const descripcionInvalida =
            (tocadosNivelDescripcion.has(nivel.id) || submissionAttempts > 0) && !nivel.descripcion.trim()
          const ponderacionInvalida =
            puntajeObligatorio &&
            (tocadosNivelPonderacion.has(nivel.id) || submissionAttempts > 0) &&
            nivel.ponderacion == null
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
            <p className="pt-2 text-sm font-semibold">{nivel.nombre}</p>
            <Field data-invalid={descripcionInvalida}>
              <Textarea
                className={TEXTAREA_OUTLINED}
                rows={2}
                placeholder="Describe el desempeño esperado en este nivel"
                maxLength={500}
                value={nivel.descripcion}
                onChange={(e) => {
                  const next = criterio.niveles.slice()
                  next[nIndex] = { ...nivel, descripcion: e.target.value }
                  onChange({ ...criterio, niveles: next })
                }}
                onBlur={() => marcarNivelDescripcionTocado(nivel.id)}
                aria-invalid={descripcionInvalida}
                disabled={disabled}
              />
              {descripcionInvalida && <FieldError errors={ERROR_OBLIGATORIO} />}
            </Field>
            {esEvaluativa && (
              <Field variant="outlined" data-invalid={ponderacionInvalida}>
                <FieldLabel htmlFor={`${nivel.id}-ponderacion`}>
                  Puntaje
                </FieldLabel>
                <Input
                  id={`${nivel.id}-ponderacion`}
                  type="number"
                  min={0}
                  max={100}
                  value={nivel.ponderacion ?? ""}
                  onChange={(e) => {
                    const raw = e.target.value
                    const next = criterio.niveles.slice()
                    // Vacío → `undefined`; clamp real, no solo el `min`/`max` del `<input>`.
                    if (raw === "") {
                      next[nIndex] = { ...nivel, ponderacion: undefined }
                    } else {
                      const num = Number(raw)
                      next[nIndex] = {
                        ...nivel,
                        ponderacion: Number.isNaN(num) ? undefined : Math.min(100, Math.max(0, num)),
                      }
                    }
                    // Regla 42: el puntaje del criterio es de solo lectura, el máximo de sus niveles.
                    onChange({
                      ...criterio,
                      niveles: next,
                      ponderacion: maxPonderacionCriterio({ ...criterio, niveles: next }),
                    })
                  }}
                  onBlur={() => marcarNivelPonderacionTocado(nivel.id)}
                  aria-invalid={ponderacionInvalida}
                  disabled={disabled}
                />
                {ponderacionInvalida && <FieldError errors={ERROR_OBLIGATORIO} />}
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
                    onClick={() => {
                      const next = criterio.niveles.slice()
                      next.splice(nIndex, 1)
                      onChange({
                        ...criterio,
                        niveles: next,
                        ponderacion: maxPonderacionCriterio({ ...criterio, niveles: next }),
                      })
                    }}
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

      {/* Split-button: bordes anulados para leerse como un solo control. `mt-6` deja libre el
      label outlined, que asoma por encima del `Field`. */}
      <SoloEdicion>
      <Field
        variant="outlined"
        className="mt-6 [&_[data-slot=input]]:rounded-r-none [&_[data-slot=input]]:border-r-0"
        data-invalid={sinNiveles}
      >
        <FieldLabel>Niveles de desempeño (agregar niveles)</FieldLabel>
        <div className="flex items-center gap-0">
          <Input
            placeholder="Agregar"
            maxLength={50}
            value={nivelInput}
            onChange={(e) => setNivelInput(e.target.value)}
            disabled={disabled}
          />
          <Button
            variant="fill"
            color="primary"
            size="default"
            className="rounded-l-none border-l-0"
            type="button"
            disabled={disabled}
            onClick={() => {
              const value = nivelInput.trim()
              if (!value) return
              // El texto tipeado es el `nombre`; la descripción arranca vacía.
              onChange({
                ...criterio,
                niveles: [
                  ...criterio.niveles,
                  { id: cryptoId(), nombre: value, descripcion: "" },
                ],
              })
              setNivelInput("")
            }}
          >
            <PlusCircleIcon data-icon="inline-start" />
            Agregar nivel
          </Button>
        </div>
        {sinNiveles && <FieldError errors={[{ message: "Agrega al menos un nivel de desempeño." }]} />}
      </Field>
      </SoloEdicion>

      {/* Regla 42: puntaje del criterio de solo lectura, máximo de sus niveles. */}
      <Field variant="outlined" className="mt-4 max-w-48">
        <FieldLabel>Puntaje</FieldLabel>
        <Input type="number" value={criterio.ponderacion} disabled readOnly />
      </Field>
    </li>
  )
}

/** Regla 42: máximo de los puntajes de los niveles, incluido "Excelente". 0 si no hay ninguno. */
function maxPonderacionCriterio(criterio: {
  niveles: { ponderacion?: number }[]
  excelentePonderacion?: number
}): number {
  return criterio.niveles.reduce(
    (max, n) => Math.max(max, n.ponderacion ?? 0),
    criterio.excelentePonderacion ?? 0,
  )
}
