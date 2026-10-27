import { cn } from "@/lib/utils"
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Textarea, TEXTAREA_OUTLINED } from "@/components/ui/textarea"
import { CharacterCounter } from "@/components/ui/character-counter"
import { Switch } from "@/components/ui/switch"
import {
  ComboboxField,
  ComboboxFieldContent,
  ComboboxFieldItem,
  ComboboxFieldTrigger,
  ComboboxFieldValue,
} from "@/components/ui/combobox"
import { useAreasOficialesOpcionesQuery } from "@/features/administration/areas-oficiales/api/query/use-areas-oficiales-opciones-query"
import { SelectGeneralAreasDialog } from "@/features/academic-management/curricular-references/components/dialogs/dialog-select-general-areas"
import { SubjectsMultiSelect } from "@/features/establishment/academic-period/components/fields/subjects-multi-select"
import { SubjectLabelSelect } from "@/features/academic-management/curricular-references/components/forms/subject-label-select"

import {
  esEnfoqueFormativo,
  esEvaluacionCualitativa,
  toReferenteLongTextInput,
  toReferenteTextInput,
} from "@/features/academic-management/curricular-references/utils/catalogs"

import type { CatalogItem } from "@/features/establishment/employees/api/types/catalog"
import type { CurricularReferenceDraft } from "@/features/academic-management/curricular-references/api/types/curricular-reference"

const TEXTAREA_OUTLINE_CLASS = cn(TEXTAREA_OUTLINED, "field-sizing-fixed max-w-full break-all")

interface CurricularReferenceDetailsFormProps {
  value: CurricularReferenceDraft
  educationLevels: CatalogItem[]
  pedagogicalApproaches: CatalogItem[]
  evaluationTypes: CatalogItem[]
  onChange: (next: CurricularReferenceDraft) => void
  errors?: Record<string, string>
}

export function CurricularReferenceDetailsForm({
  value,
  educationLevels,
  pedagogicalApproaches,
  evaluationTypes,
  onChange,
  errors = {},
}: CurricularReferenceDetailsFormProps) {
  const pedagogicalApproachLabels = Object.fromEntries(
    pedagogicalApproaches.map((item) => [item.id, item.name]),
  )
  const evaluationTypeLabels = Object.fromEntries(evaluationTypes.map((item) => [item.id, item.name]))

  // Activas del catálogo de Áreas oficiales + las ya asociadas (que pueden estar
  // inactivas): sin estas últimas, tocar el selector las borraba del referente.
  const { data: areasOficiales = [] } = useAreasOficialesOpcionesQuery()
  const areaById = new Map(value.areas.map((area) => [area.id, area]))
  for (const area of areasOficiales)
    areaById.set(area.pkAreaOficial, { id: area.pkAreaOficial, code: "", name: area.nombre })

  const isFormativo = esEnfoqueFormativo(value.pedagogicalApproach)

  return (
    <div className="flex flex-col gap-4 [&_::placeholder]:opacity-60">
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
            onChange={(event) => onChange({ ...value, name: toReferenteTextInput(event.target.value) })}
            placeholder="Ej. DBA - Primaria"
          />
          <CharacterCounter value={value.name} max={150} />
          <FieldError>{errors["name"]}</FieldError>
        </Field>

        <Field
          orientation="vertical"
          variant="outlined"
          className="w-full"
          data-invalid={errors["educationLevels"] ? "true" : undefined}
        >
          <FieldLabel htmlFor="curricular-reference-education-level">Nivel educativo *</FieldLabel>
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
            onChange={(event) => onChange({ ...value, description: toReferenteLongTextInput(event.target.value) })}
            placeholder="Describe la finalidad o propósito de este referente curricular."
            className={TEXTAREA_OUTLINE_CLASS}
          />
          <CharacterCounter value={value.description} max={400} />
          <FieldError>{errors["description"]}</FieldError>
        </Field>
      </div>

      <div className="grid grid-cols-1 gap-x-4 gap-y-2 md:grid-cols-2">
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
              if (option && esEnfoqueFormativo(option)) {
                // Regla 2: al pasar a Formativo, el tipo de evaluación se fija en Cualitativa y se bloquea.
                // Por código/nombre: en el back real los ids son pk_lista_valor, no los del seed.
                const cualitativa = evaluationTypes.find(esEvaluacionCualitativa)
                onChange({ ...value, pedagogicalApproach: option, evaluationType: cualitativa ?? value.evaluationType })
                return
              }
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
            disabled={isFormativo}
            onValueChange={(selectedValue) => {
              const option = evaluationTypes.find((item) => item.id === selectedValue)
              onChange({ ...value, evaluationType: option ?? null })
            }}
          >
            <ComboboxFieldTrigger
              id="curricular-reference-evaluation-type"
              size="sm"
              disabled={isFormativo}
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
          <FieldLabel htmlFor="curricular-reference-level1">Rótulo de Nivel 1 *</FieldLabel>
          <Input
            id="curricular-reference-level1"
            size="sm"
            maxLength={50}
            value={value.level1}
            aria-invalid={Boolean(errors["level1"])}
            onChange={(event) => onChange({ ...value, level1: toReferenteTextInput(event.target.value) })}
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
          <FieldLabel htmlFor="curricular-reference-level2">Rótulo de Nivel 2 *</FieldLabel>
          <Input
            id="curricular-reference-level2"
            size="sm"
            maxLength={50}
            value={value.level2}
            aria-invalid={Boolean(errors["level2"])}
            onChange={(event) => onChange({ ...value, level2: toReferenteTextInput(event.target.value) })}
            placeholder="Ej. Evidencia / Imprescindible"
          />
          <FieldError>{errors["level2"]}</FieldError>
        </Field>
      </div>

      <div>
        <p className="text-sm font-bold">Áreas/dimensiones</p>
      </div>

      <div className="grid grid-cols-1 gap-x-4 gap-y-2 md:grid-cols-2">
        <Field orientation="vertical" variant="outlined" className="w-full">
          <FieldLabel htmlFor="curricular-reference-areas">Áreas o dimensiones</FieldLabel>
          <SelectGeneralAreasDialog
            id="curricular-reference-areas"
            value={value.areas.map((area) => area.id)}
            selected={value.areas}
            onChange={(ids) =>
              onChange({
                ...value,
                areas: ids
                  .map((id) => areaById.get(id))
                  .filter((area): area is NonNullable<typeof area> => area != null)
                  .map((area) => ({ id: area.id, code: "", name: area.name })),
              })
            }
            placeholder="Seleccione"
          />
        </Field>

        <Field orientation="vertical" variant="outlined" className="w-full">
          <FieldLabel htmlFor="curricular-reference-subject-label">Rótulo de Área</FieldLabel>
          <SubjectLabelSelect
            id="curricular-reference-subject-label"
            value={value.subjectLabel}
            onChange={(option) => onChange({ ...value, subjectLabel: option })}
            placeholder="Seleccione"
          />
        </Field>

        <Field
          orientation="vertical"
          variant="outlined"
          className="w-full"
          data-invalid={errors["instrument"] ? "true" : undefined}
        >
          <FieldLabel htmlFor="curricular-reference-instrument">Rótulo de Secuencia de Actividades *</FieldLabel>
          <Input
            id="curricular-reference-instrument"
            size="sm"
            maxLength={50}
            value={value.instrument}
            aria-invalid={Boolean(errors["instrument"])}
            onChange={(event) => onChange({ ...value, instrument: toReferenteTextInput(event.target.value) })}
            placeholder="Ej. Unidad temática"
          />
          <FieldError>{errors["instrument"]}</FieldError>
        </Field>

        <Field
          orientation="vertical"
          variant="outlined"
          className="w-full"
          data-invalid={errors["executionLabel"] ? "true" : undefined}
        >
          <FieldLabel htmlFor="curricular-reference-execution-label">Rótulo de Ejecución *</FieldLabel>
          <Input
            id="curricular-reference-execution-label"
            size="sm"
            maxLength={50}
            value={value.executionLabel}
            aria-invalid={Boolean(errors["executionLabel"])}
            onChange={(event) => onChange({ ...value, executionLabel: toReferenteTextInput(event.target.value) })}
            placeholder="Ej. Actividad"
          />
          <FieldError>{errors["executionLabel"]}</FieldError>
        </Field>

        <Field orientation="vertical" variant="outlined" className="w-full md:col-span-2">
          <FieldLabel htmlFor="curricular-reference-instrument-description">
            Información adicional de la Secuencia de Actividades
          </FieldLabel>
          <Textarea
            id="curricular-reference-instrument-description"
            maxLength={400}
            value={value.instrumentDescription}
            onChange={(event) => {
              const raw = toReferenteLongTextInput(event.target.value)
              const next = raw.trim() === "" ? "" : raw
              onChange({ ...value, instrumentDescription: next })
            }}
            placeholder="Describe qué incluye la secuencia de actividades y cómo se utiliza..."
            className={TEXTAREA_OUTLINE_CLASS}
          />
          <CharacterCounter value={value.instrumentDescription} max={400} />
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
            onChange={(event) => onChange({ ...value, regulation: toReferenteLongTextInput(event.target.value) })}
            placeholder="Escribe una o varias normas que aplican a este referente curricular..."
            className={TEXTAREA_OUTLINE_CLASS}
          />
          <CharacterCounter value={value.regulation} max={400} />
          <FieldError>{errors["regulation"]}</FieldError>
        </Field>

        <Field orientation="vertical" variant="outlined" className="w-full md:col-span-2">
          <FieldLabel htmlFor="curricular-reference-status">Estado</FieldLabel>
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
