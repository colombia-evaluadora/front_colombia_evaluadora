import { useMatriculaCatalogQuery } from "@/features/coverage/matricula/api/query/use-matricula-catalog-select"
import { isFieldRequired, isFieldVisible, type MatriculaFieldSettingsMap } from "@/features/coverage/matricula/utils/matricula-field-settings"
import { YES_NO_OPTIONS } from "@/features/coverage/matricula/api/ui-mappings"
import type { MatriculaConflictVictimInfo, MatriculaOriginSectorInfo, MatriculaPreviousYearInfo } from "@/features/coverage/matricula/api/types/matricula"
import { anySettingVisible, catalogLabelFor, catalogOptions } from "./catalog-utils"
import { type DepartmentOption, MatriculaFormSection, MatriculaSelectField, MatriculaTextField } from "./fields"

interface PreviousYearSectionProps {
  value: MatriculaPreviousYearInfo
  onChange: (value: MatriculaPreviousYearInfo) => void
  invalidFields?: string[]
  fieldSettings?: MatriculaFieldSettingsMap
}

export function MatriculaPreviousYearSection({
  value,
  onChange,
  invalidFields = [],
  fieldSettings,
}: PreviousYearSectionProps) {
  const { data: situacionAnioAnterior } = useMatriculaCatalogQuery("situacionAnioAnterior")
  const { data: condicionAnioAnterior } = useMatriculaCatalogQuery("condicionAnioAnterior")
  if (
    !anySettingVisible(fieldSettings, [
      "previous-year-situation",
      "previous-year-condition",
      "previous-institution",
      "welfare-institution",
    ])
  ) {
    return null
  }

  return (
    <MatriculaFormSection title="Información académica del año anterior">
      {isFieldVisible(fieldSettings, "previous-year-situation") && (
        <MatriculaSelectField
          id="previous-year-situation"
          label="Situación del año anterior"
          required={isFieldRequired(fieldSettings, "previous-year-situation")}
          invalid={invalidFields.includes("previous-year-situation")}
          value={value.situation}
          options={catalogOptions(situacionAnioAnterior)}
          labelFor={catalogLabelFor(situacionAnioAnterior)}
          onChange={(situation) => onChange({ ...value, situation })}
        />
      )}
      {isFieldVisible(fieldSettings, "previous-year-condition") && (
        <MatriculaSelectField
          id="previous-year-condition"
          label="Condición del estudiante fin del año anterior"
          required={isFieldRequired(fieldSettings, "previous-year-condition")}
          invalid={invalidFields.includes("previous-year-condition")}
          value={value.condition}
          options={catalogOptions(condicionAnioAnterior)}
          labelFor={catalogLabelFor(condicionAnioAnterior)}
          onChange={(condition) => onChange({ ...value, condition })}
        />
      )}
      {isFieldVisible(fieldSettings, "previous-institution") && (
        <MatriculaTextField
          id="previous-institution"
          label="Nombre de la institución anterior"
          required={isFieldRequired(fieldSettings, "previous-institution")}
          invalid={invalidFields.includes("previous-institution")}
          value={value.previousInstitution}
          maxLength={150}
          onChange={(previousInstitution) => onChange({ ...value, previousInstitution })}
        />
      )}
      {isFieldVisible(fieldSettings, "welfare-institution") && (
        <MatriculaTextField
          id="welfare-institution"
          label="Institución bienestar de origen"
          required={isFieldRequired(fieldSettings, "welfare-institution")}
          invalid={invalidFields.includes("welfare-institution")}
          value={value.welfareInstitution}
          maxLength={150}
          onChange={(welfareInstitution) => onChange({ ...value, welfareInstitution })}
        />
      )}
    </MatriculaFormSection>
  )
}

interface OriginSectorSectionProps {
  value: MatriculaOriginSectorInfo
  onChange: (value: MatriculaOriginSectorInfo) => void
  invalidFields?: string[]
  fieldSettings?: MatriculaFieldSettingsMap
}

export function MatriculaOriginSectorSection({
  value,
  onChange,
  invalidFields = [],
  fieldSettings,
}: OriginSectorSectionProps) {
  if (
    !anySettingVisible(fieldSettings, [
      "origin-private-sector",
      "origin-another-municipality",
      "origin-which-municipality",
    ])
  ) {
    return null
  }

  return (
    <MatriculaFormSection title="Sector de origen">
      {isFieldVisible(fieldSettings, "origin-private-sector") && (
        <MatriculaSelectField
          id="origin-private-sector"
          label="Proviene del sector privado"
          required={isFieldRequired(fieldSettings, "origin-private-sector")}
          invalid={invalidFields.includes("origin-private-sector")}
          value={value.fromPrivateSector}
          options={YES_NO_OPTIONS}
          onChange={(fromPrivateSector) => onChange({ ...value, fromPrivateSector })}
        />
      )}
      {isFieldVisible(fieldSettings, "origin-another-municipality") && (
        <MatriculaSelectField
          id="origin-another-municipality"
          label="Proviene de otro municipio"
          required={isFieldRequired(fieldSettings, "origin-another-municipality")}
          invalid={invalidFields.includes("origin-another-municipality")}
          value={value.fromAnotherMunicipality}
          options={YES_NO_OPTIONS}
          onChange={(fromAnotherMunicipality) => onChange({ ...value, fromAnotherMunicipality })}
        />
      )}
      {isFieldVisible(fieldSettings, "origin-which-municipality") && (
        <MatriculaTextField
          id="origin-which-municipality"
          label="¿Cuál?"
          required={isFieldRequired(fieldSettings, "origin-which-municipality")}
          invalid={invalidFields.includes("origin-which-municipality")}
          value={value.whichMunicipality}
          maxLength={150}
          onChange={(whichMunicipality) => onChange({ ...value, whichMunicipality })}
        />
      )}
    </MatriculaFormSection>
  )
}

interface ConflictVictimSectionProps {
  value: MatriculaConflictVictimInfo
  onChange: (value: MatriculaConflictVictimInfo) => void
  departments: DepartmentOption[]
  invalidFields?: string[]
  fieldSettings?: MatriculaFieldSettingsMap
}

export function MatriculaConflictVictimSection({
  value,
  onChange,
  departments,
  invalidFields = [],
  fieldSettings,
}: ConflictVictimSectionProps) {
  // `FK_TMUNICIPIO_VICTIMA` es un municipio libre (sin un departamento
  // propio que lo filtre, a diferencia de `DeptMunicipioFields`) — se
  // ofrece el listado completo de municipios de todos los departamentos.
  const allMunicipalities = departments.flatMap((d) => d.municipalities)
  const municipalityNameById = new Map(allMunicipalities.map((m) => [String(m.id), m.name]))
  const { data: poblacionVictima } = useMatriculaCatalogQuery("poblacionVictima")
  if (
    !anySettingVisible(fieldSettings, [
      "conflict-victim-population",
      "conflict-last-expelling-municipality",
    ])
  ) {
    return null
  }

  return (
    <MatriculaFormSection title="Víctima conflicto armado">
      {isFieldVisible(fieldSettings, "conflict-victim-population") && (
        <MatriculaSelectField
          id="conflict-victim-population"
          label="Población víctima conflicto"
          required={isFieldRequired(fieldSettings, "conflict-victim-population")}
          invalid={invalidFields.includes("conflict-victim-population")}
          value={value.population}
          options={catalogOptions(poblacionVictima)}
          labelFor={catalogLabelFor(poblacionVictima)}
          onChange={(population) => onChange({ ...value, population })}
        />
      )}
      {isFieldVisible(fieldSettings, "conflict-last-expelling-municipality") && (
        <MatriculaSelectField
          id="conflict-last-expelling-municipality"
          label="Último municipio expulsor"
          required={isFieldRequired(fieldSettings, "conflict-last-expelling-municipality")}
          invalid={invalidFields.includes("conflict-last-expelling-municipality")}
          value={value.lastExpellingMunicipality}
          options={allMunicipalities.map((m) => String(m.id))}
          labelFor={(option) => municipalityNameById.get(option) ?? option}
          onChange={(lastExpellingMunicipality) => onChange({ ...value, lastExpellingMunicipality })}
        />
      )}
    </MatriculaFormSection>
  )
}
