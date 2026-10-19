import { useState } from "react"
import { useSelector } from "@tanstack/react-form"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { PlusCircleIcon, TrashIcon } from "@/components/ui/icons"
import type { ListaCotejo, ListaCotejoItem } from "@/features/planeador/api/types/actividad"
import type { UnidadTematica } from "@/features/planeador/api/types/unidad-tematica"
import { TEXTAREA_OUTLINED } from "@/features/planeador/components/forms/form-editar-actividad/constants"
import type { FormActividad } from "@/features/planeador/components/forms/form-editar-actividad/types"
import { cryptoId } from "@/features/planeador/components/forms/form-editar-actividad/helpers"
import { ERROR_OBLIGATORIO } from "@/features/planeador/components/forms/form-editar-actividad/hooks"
import { SoloEdicion } from "@/features/planeador/components/forms/form-editar-actividad/solo-edicion"

/** Editor de la lista de cotejo; el puntaje de cada ítem solo aparece si es sumativa. */
export function ListaCotejoSection({
  form,
  unidades,
  disabled,
}: {
  form: FormActividad
  unidades: UnidadTematica[]
  disabled: boolean
}) {
  // Tras un intento de guardar, los ítems marcan sus obligatorios aunque no se hayan tocado.
  const submissionAttempts = useSelector(form.store, (state) => state.submissionAttempts)
  // El puntaje es obligatorio solo si la unidad calcula por Ponderado o Suma de puntos.
  // `esEvaluativa` decide si se muestra; esto, si además es obligatorio.
  const unidadId = useSelector(form.store, (state) => state.values.unidad.id) || undefined
  const unidadActual = unidades.find((u) => u.id === unidadId)
  const puntajeObligatorio = unidadActual != null && unidadActual.metodoCalculo !== "Promedio simple"
  return (
    <Card className="gap-4 p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold">Definición Lista de Cotejo</h3>
        <SoloEdicion>
        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                variant="fill"
                color="primary"
                size="icon-sm"
                type="button"
                aria-label="Agregar ítem"
                disabled={disabled}
                onClick={() => {
                  const listaCotejo = form.getFieldValue("listaCotejo") as ListaCotejo
                  form.setFieldValue("listaCotejo", {
                    ...listaCotejo,
                    items: [...listaCotejo.items, { id: cryptoId(), descripcion: "" }],
                  })
                }}
              />
            }
          >
            <PlusCircleIcon />
          </TooltipTrigger>
          <TooltipContent>Agregar ítem</TooltipContent>
        </Tooltip>
        </SoloEdicion>
      </div>

      <form.Subscribe selector={(state) => state.values.esEvaluativa}>
        {(esEvaluativa) => (
          <form.Field
            name="listaCotejo"
            validators={{
              onChange: ({ value }) => {
                const listaCotejo = value as ListaCotejo
                return listaCotejo.items.length === 0
                  ? { message: "Agrega al menos un ítem de la lista de cotejo." }
                  : undefined
              },
            }}
          >
            {(field) => {
              const listaCotejo = field.state.value as ListaCotejo
              const isInvalid = (field.state.meta.isTouched || submissionAttempts > 0) && !field.state.meta.isValid
              if (listaCotejo.items.length === 0) {
                return (
                  <div className="rounded-md border border-dashed p-3" data-invalid={isInvalid}>
                    {isInvalid ? (
                      <FieldError errors={field.state.meta.errors} />
                    ) : (
                      <p className="text-muted-foreground text-sm">
                        Agrega al menos un ítem con el botón de arriba.
                      </p>
                    )}
                  </div>
                )
              }
              const totalPosible = listaCotejo.items.reduce(
                (acc, it) => acc + (Number.isFinite(it.ponderacion) ? (it.ponderacion as number) : 0),
                0,
              )
              return (
                <>
                  <div className="grid gap-4 sm:grid-cols-2">
                  {listaCotejo.items.map((item, index) => (
                    <ListaCotejoItemCard
                      key={item.id}
                      item={item}
                      index={index}
                      esEvaluativa={esEvaluativa}
                      puntajeObligatorio={puntajeObligatorio}
                      disabled={disabled}
                      submissionAttempts={submissionAttempts}
                      onChange={(next) => {
                        const current = field.state.value as ListaCotejo
                        const nextItems = current.items.slice()
                        nextItems[index] = next
                        field.handleChange({ ...current, items: nextItems })
                      }}
                      onRemove={() => {
                        const current = field.state.value as ListaCotejo
                        const nextItems = current.items.slice()
                        nextItems.splice(index, 1)
                        field.handleChange({ ...current, items: nextItems })
                      }}
                    />
                  ))}
                  </div>
                  {esEvaluativa && (
                    <div className="flex justify-end">
                      <Field variant="outlined" className="w-44">
                        <FieldLabel htmlFor="lista-cotejo-total-posible">Total posible</FieldLabel>
                        <Input id="lista-cotejo-total-posible" type="number" value={totalPosible} readOnly disabled />
                      </Field>
                    </div>
                  )}
                  {/* Botón repetido al pie para no tener que volver arriba (QA Bloque 5, criterio #3). */}
                  <SoloEdicion>
                  <div className="flex justify-end">
                    <Button
                      variant="fill"
                      color="primary"
                      type="button"
                      disabled={disabled}
                      onClick={() => {
                        const current = field.state.value as ListaCotejo
                        field.handleChange({
                          ...current,
                          items: [...current.items, { id: cryptoId(), descripcion: "" }],
                        })
                      }}
                    >
                      <PlusCircleIcon data-icon="inline-start" />
                      Agregar ítem
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

function ListaCotejoItemCard({
  item,
  index,
  esEvaluativa,
  puntajeObligatorio,
  disabled,
  submissionAttempts,
  onChange,
  onRemove,
}: {
  item: ListaCotejoItem
  index: number
  esEvaluativa: boolean
  /**
   * Descripción obligatoria siempre; puntaje solo si `puntajeObligatorio` (si no, pesa 1).
   * Con valor, entre 0 y 100.
   */
  puntajeObligatorio: boolean
  disabled: boolean
  submissionAttempts: number
  onChange: (next: ListaCotejoItem) => void
  onRemove: () => void
}) {
  const [tocoDescripcion, setTocoDescripcion] = useState(false)
  const [tocoPonderacion, setTocoPonderacion] = useState(false)

  const descripcionInvalida = (tocoDescripcion || submissionAttempts > 0) && !item.descripcion.trim()
  const tocoOIntento = tocoPonderacion || submissionAttempts > 0
  const ponderacionAusente = puntajeObligatorio && tocoOIntento && item.ponderacion == null
  const ponderacionFueraDeRango =
    tocoOIntento && item.ponderacion != null && (item.ponderacion < 0 || item.ponderacion > 100)
  const ponderacionInvalida = ponderacionAusente || ponderacionFueraDeRango

  return (
    <div className="rounded-md border bg-card p-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold">Ítem {index + 1}</h4>
        <SoloEdicion>
        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                variant="ghost"
                color="neutral"
                size="icon-sm"
                type="button"
                aria-label={`Quitar ítem ${index + 1}`}
                disabled={disabled}
                onClick={onRemove}
              />
            }
          >
            <TrashIcon />
          </TooltipTrigger>
          <TooltipContent>{`Quitar ítem ${index + 1}`}</TooltipContent>
        </Tooltip>
        </SoloEdicion>
      </div>

      {/* Sin `esEvaluativa` el campo de puntaje no se monta. */}
      <div className="mt-3 flex items-start gap-3">
        <Field variant="outlined" className="min-w-0 flex-1" data-invalid={descripcionInvalida}>
          <FieldLabel htmlFor={`${item.id}-descripcion`}>Descripción del elemento</FieldLabel>
          <Textarea
            id={`${item.id}-descripcion`}
            className={TEXTAREA_OUTLINED}
            rows={2}
            maxLength={500}
            value={item.descripcion}
            onChange={(e) => onChange({ ...item, descripcion: e.target.value })}
            onBlur={() => setTocoDescripcion(true)}
            aria-invalid={descripcionInvalida}
            disabled={disabled}
          />
          {descripcionInvalida && <FieldError errors={ERROR_OBLIGATORIO} />}
        </Field>

        {esEvaluativa && (
          <Field variant="outlined" className="w-44 shrink-0" data-invalid={ponderacionInvalida}>
            <FieldLabel htmlFor={`${item.id}-ponderacion`}>Puntaje del elemento</FieldLabel>
            <Input
              id={`${item.id}-ponderacion`}
              type="number"
              min={0}
              max={100}
              value={item.ponderacion ?? ""}
              onChange={(e) => {
                const raw = e.target.value
                // Vacío → `undefined`, no `0`.
                onChange({ ...item, ponderacion: raw === "" ? undefined : Number(raw) })
              }}
              onBlur={() => setTocoPonderacion(true)}
              aria-invalid={ponderacionInvalida}
              disabled={disabled}
            />
            {ponderacionInvalida && (
              <FieldError
                errors={ponderacionAusente ? ERROR_OBLIGATORIO : [{ message: "El puntaje debe estar entre 0 y 100." }]}
              />
            )}
          </Field>
        )}
      </div>
    </div>
  )
}
