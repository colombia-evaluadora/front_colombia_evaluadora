import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import {
  ComboboxField,
  ComboboxFieldContent,
  ComboboxFieldItem,
  ComboboxFieldTrigger,
  ComboboxFieldValue,
} from "@/components/ui/combobox"
import { useGeneralAreasQuery } from "@/features/establishment/academic-period/api/query/use-general-areas"
import { SelectGeneralAreasDialog } from "@/features/academic-management/curricular-references/components/dialogs/dialog-select-general-areas"
import { SubjectsMultiSelect } from "@/features/establishment/academic-period/components/subjects-multi-select"

import type { CatalogItem } from "@/features/establishment/employees/api/types/catalog"
import type { CurricularReferenceDraft } from "@/features/academic-management/curricular-references/api/types/curricular-reference"

const TEXTAREA_OUTLINE_CLASS =
  "rounded-md border border-input px-3 py-2 hover:border-ring focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/20 aria-invalid:border-red aria-invalid:focus-visible:border-red aria-invalid:focus-visible:ring-red/20"

interface CurricularReferenceDetailsFormProps {
  value: CurricularReferenceDraft
  educationLevels: CatalogItem[]
  pedagogicalApproaches: CatalogItem[]
  evaluationTypes: CatalogItem[]
  onChange: (next: CurricularReferenceDraft) => void
  errors?: Record<string, string>
  isEditMode?: boolean
}

export function CurricularReferenceDetailsForm({
  value,
  educationLevels,
  pedagogicalApproaches,
  evaluationTypes,
  onChange,
  errors = {},
  isEditMode = false,
}: CurricularReferenceDetailsFormProps) {
  const educationLevelLabels = Object.fromEntries(educationLevels.map((item) => [item.id, item.name]))
  const pedagogicalApproachLabels = Object.fromEntries(
    pedagogicalApproaches.map((item) => [item.id, item.name]),
  )
  const evaluationTypeLabels = Object.fromEntries(evaluationTypes.map((item) => [item.id, item.name]))

  const { data: generalAreas = [] } = useGeneralAreasQuery()
  const areaById = new Map(generalAreas.map((area) => [area.id, area]))

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-x-4 gap-y-2 md:grid-cols-2">
        <Field
          orientation="vertical"
          variant="outlined"
          className="w-full"
          data-invalid={errors["name"] ? "true" : undefined}
        >
          <FieldLabel htmlFor="curricular-reference-name">Nombre del referente *</FieldLabel>
          <Input
            id="curricular-reference-name"
            size="sm"
            maxLength={150}
            value={value.name}
            aria-invalid={Boolean(errors["name"])}
            onChange={(event) => onChange({ ...value, name: event.target.value })}
            placeholder="Ej. DBA - Primaria"
          />
          <FieldError>{errors["name"]}</FieldError>
        </Field>

        <Field
          orientation="vertical"
          variant="outlined"
          className="w-full"
          data-invalid={errors["educationLevels"] ? "true" : undefined}
        >
          <FieldLabel htmlFor="curricular-reference-education-level">Nivel educativo *</FieldLabel>
          {isEditMode ? (
            <ComboboxField
              items={educationLevelLabels}
              value={value.educationLevels[0]?.id ?? null}
              onValueChange={(selectedValue) => {
                const option = educationLevels.find((item) => item.id === selectedValue)
                onChange({ ...value, educationLevels: option ? [option] : [] })
              }}
            >
              <ComboboxFieldTrigger
                id="curricular-reference-education-level"
                size="sm"
                aria-invalid={Boolean(errors["educationLevels"])}
              >
                <ComboboxFieldValue placeholder="Seleccione" />
              </ComboboxFieldTrigger>
              <ComboboxFieldContent>
                {educationLevels.map((item) => (
                  <ComboboxFieldItem key={item.id} value={item.id}>
                    {item.name}
                  </ComboboxFieldItem>
                ))}
              </ComboboxFieldContent>
            </ComboboxField>
          ) : (
            <SubjectsMultiSelect
              id="curricular-reference-education-level"
              options={educationLevels.map((item) => ({ id: item.id, label: item.name }))}
              value={value.educationLevels.map((item) => item.id)}
              onChange={(ids) =>
                onChange({
                  ...value,
                  educationLevels: ids
                    .map((id) => educationLevels.find((item) => item.id === id))
                    .filter((item): item is CatalogItem => item != null),
                })
              }
              placeholder="Seleccione"
            />
          )}
          <FieldError>{errors["educationLevels"]}</FieldError>
        </Field>

        <Field
          orientation="vertical"
          variant="outlined"
          className="w-full md:col-span-2"
          data-invalid={errors["description"] ? "true" : undefined}
        >
          <FieldLabel htmlFor="curricular-reference-description">Descripción / Finalidad *</FieldLabel>
          <Textarea
            id="curricular-reference-description"
            maxLength={400}
            value={value.description}
            aria-invalid={Boolean(errors["description"])}
            onChange={(event) => onChange({ ...value, description: event.target.value })}
            placeholder="Describe la finalidad o propósito de este referente curricular."
            className={TEXTAREA_OUTLINE_CLASS}
          />
          <FieldError>{errors["description"]}</FieldError>
        </Field>
      </div>

      <div>
        <p className="text-sm font-bold">Estructura del referente</p>
      </div>

      <div className="grid grid-cols-1 gap-x-4 gap-y-2 md:grid-cols-2">
        <Field
          orientation="vertical"
          variant="outlined"
          className="w-full"
          data-invalid={errors["level1"] ? "true" : undefined}
        >
          <FieldLabel htmlFor="curricular-reference-level1">Nivel 1 *</FieldLabel>
          <Input
            id="curricular-reference-level1"
            size="sm"
            maxLength={60}
            value={value.level1}
            aria-invalid={Boolean(errors["level1"])}
            onChange={(event) => onChange({ ...value, level1: event.target.value })}
            placeholder="Ej. Enunciado / Propósito"
          />
          <FieldError>{errors["level1"]}</FieldError>
        </Field>

        <Field
          orientation="vertical"
          variant="outlined"
          className="w-full"
          data-invalid={errors["level2"] ? "true" : undefined}
        >
          <FieldLabel htmlFor="curricular-reference-level2">Nivel 2 *</FieldLabel>
          <Input
            id="curricular-reference-level2"
            size="sm"
            maxLength={60}
            value={value.level2}
            aria-invalid={Boolean(errors["level2"])}
            onChange={(event) => onChange({ ...value, level2: event.target.value })}
            placeholder="Ej. Evidencia / Imprescindible"
          />
          <FieldError>{errors["level2"]}</FieldError>
        </Field>

        <Field
          orientation="vertical"
          variant="outlined"
          className="w-full"
          data-invalid={errors["pedagogicalApproach"] ? "true" : undefined}
        >
          <FieldLabel htmlFor="curricular-reference-approach">Enfoque pedagógico *</FieldLabel>
          <ComboboxField
            items={pedagogicalApproachLabels}
            value={value.pedagogicalApproach?.id ?? null}
            onValueChange={(selectedValue) => {
              const option = pedagogicalApproaches.find((item) => item.id === selectedValue)
              onChange({ ...value, pedagogicalApproach: option ?? null })
            }}
          >
            <ComboboxFieldTrigger
              id="curricular-reference-approach"
              size="sm"
              aria-invalid={Boolean(errors["pedagogicalApproach"])}
            >
              <ComboboxFieldValue placeholder="Seleccione" />
            </ComboboxFieldTrigger>
            <ComboboxFieldContent>
              {pedagogicalApproaches.map((item) => (
                <ComboboxFieldItem key={item.id} value={item.id}>
                  {item.name}
                </ComboboxFieldItem>
              ))}
            </ComboboxFieldContent>
          </ComboboxField>
          <FieldError>{errors["pedagogicalApproach"]}</FieldError>
        </Field>

        <Field
          orientation="vertical"
          variant="outlined"
          className="w-full"
          data-invalid={errors["evaluationType"] ? "true" : undefined}
        >
          <FieldLabel htmlFor="curricular-reference-evaluation-type">Tipo de evaluación *</FieldLabel>
          <ComboboxField
            items={evaluationTypeLabels}
            value={value.evaluationType?.id ?? null}
            onValueChange={(selectedValue) => {
              const option = evaluationTypes.find((item) => item.id === selectedValue)
              onChange({ ...value, evaluationType: option ?? null })
            }}
          >
            <ComboboxFieldTrigger
              id="curricular-reference-evaluation-type"
              size="sm"
              aria-invalid={Boolean(errors["evaluationType"])}
            >
              <ComboboxFieldValue placeholder="Seleccione" />
            </ComboboxFieldTrigger>
            <ComboboxFieldContent>
              {evaluationTypes.map((item) => (
                <ComboboxFieldItem key={item.id} value={item.id}>
                  {item.name}
                </ComboboxFieldItem>
              ))}
            </ComboboxFieldContent>
          </ComboboxField>
          <FieldError>{errors["evaluationType"]}</FieldError>
        </Field>

        <Field orientation="vertical" variant="outlined" className="w-full">
          <FieldLabel htmlFor="curricular-reference-areas">Áreas o dimensiones</FieldLabel>
          <SelectGeneralAreasDialog
            id="curricular-reference-areas"
            value={value.areas.map((area) => area.id)}
            onChange={(ids) =>
              onChange({
                ...value,
                areas: ids
                  .map((id) => areaById.get(id))
                  .filter((area): area is NonNullable<typeof area> => area != null)
                  .map((area) => ({ id: area.id, code: "", name: area.nombre })),
              })
            }
            placeholder="Seleccione"
          />
        </Field>

        <Field
          orientation="vertical"
          variant="outlined"
          className="w-full"
          data-invalid={errors["instrument"] ? "true" : undefined}
        >
          <FieldLabel htmlFor="curricular-reference-instrument">Instrumento *</FieldLabel>
          <Input
            id="curricular-reference-instrument"
            size="sm"
            maxLength={400}
            value={value.instrument}
            aria-invalid={Boolean(errors["instrument"])}
            onChange={(event) => onChange({ ...value, instrument: event.target.value })}
            placeholder="Ej. DBA - Primaria"
          />
          <FieldError>{errors["instrument"]}</FieldError>
        </Field>

        <Field orientation="vertical" variant="outlined" className="w-full md:col-span-2">
          <FieldLabel htmlFor="curricular-reference-instrument-description">
            Información adicional del instrumento
          </FieldLabel>
          <Textarea
            id="curricular-reference-instrument-description"
            maxLength={400}
            value={value.instrumentDescription}
            onChange={(event) => onChange({ ...value, instrumentDescription: event.target.value })}
            placeholder="Describe qué incluye este instrumento y cómo se utiliza..."
            className={TEXTAREA_OUTLINE_CLASS}
          />
        </Field>

        <Field
          orientation="vertical"
          variant="outlined"
          className="w-full md:col-span-2"
          data-invalid={errors["regulation"] ? "true" : undefined}
        >
          <FieldLabel htmlFor="curricular-reference-regulation">Normatividad *</FieldLabel>
          <Textarea
            id="curricular-reference-regulation"
            maxLength={400}
            value={value.regulation}
            aria-invalid={Boolean(errors["regulation"])}
            onChange={(event) => onChange({ ...value, regulation: event.target.value })}
            placeholder="Escribe una o varias normas que aplican a este referente curricular..."
            className={TEXTAREA_OUTLINE_CLASS}
          />
          <FieldError>{errors["regulation"]}</FieldError>
        </Field>

        <Field orientation="vertical" variant="outlined" className="w-full md:col-span-2">
          <FieldLabel htmlFor="curricular-reference-status">Estado *</FieldLabel>
          <div className="border-input flex min-h-14 items-center gap-3 rounded-md border px-3 py-3">
            <span className="text-muted-foreground text-sm">Inactivo / Activo</span>
            <Switch
              id="curricular-reference-status"
              checked={value.active}
              onCheckedChange={(checked) => onChange({ ...value, active: checked })}
              className="rounded-full [&_[data-slot=switch-thumb]]:rounded-full"
            />
          </div>
        </Field>
      </div>
    </div>
  )
}
