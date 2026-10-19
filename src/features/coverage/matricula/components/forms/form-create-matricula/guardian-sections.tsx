import { useMatriculaCatalogQuery } from "@/features/coverage/matricula/api/query/use-matricula-catalog-select"
import { isFieldRequired, isFieldVisible, type MatriculaFieldSettingsMap } from "@/features/coverage/matricula/utils/matricula-field-settings"
import type { MatriculaGuardianEmploymentInfo, MatriculaGuardianInfo } from "@/features/coverage/matricula/api/types/matricula"
import { anySettingVisible, catalogLabelFor, catalogOptions } from "./catalog-utils"
import { type DepartmentOption, DeptMunicipioFields, MatriculaFormSection, MatriculaSelectField, MatriculaTextField } from "./fields"

interface GuardianSectionProps {
  value: MatriculaGuardianInfo
  onChange: (value: MatriculaGuardianInfo) => void
  departments: DepartmentOption[]
  invalidFields?: string[]
  fieldSettings?: MatriculaFieldSettingsMap
  /** Edición: nombre y documento del acudiente son identidad de la persona
   * (`PATCH /usuarios/:ID`), no de la matrícula -- no se pueden tocar acá.
   * Parentesco sí queda editable, es propio de esta matrícula. */
  identityDisabled?: boolean
}

export function MatriculaGuardianSection({
  value,
  onChange,
  departments,
  invalidFields = [],
  fieldSettings,
  identityDisabled,
}: GuardianSectionProps) {
  const { data: parentesco } = useMatriculaCatalogQuery("parentesco")
  const { data: tipoDocumento } = useMatriculaCatalogQuery("tipoDocumento")
  const { data: genero } = useMatriculaCatalogQuery("genero")

  return (
    <MatriculaFormSection title="Información del acudiente">
      <MatriculaSelectField
        id="guardian-relationship"
        label="Parentesco"
        required
        value={value.relationship}
        options={catalogOptions(parentesco)}
        labelFor={catalogLabelFor(parentesco)}
        invalid={invalidFields.includes("guardian-relationship")}
        onChange={(relationship) => onChange({ ...value, relationship })}
      />
      {isFieldVisible(fieldSettings, "guardian-first-name") && (
        <MatriculaTextField
          id="guardian-first-name"
          label="Nombre del acudiente"
          required={isFieldRequired(fieldSettings, "guardian-first-name")}
          invalid={invalidFields.includes("guardian-first-name")}
          value={value.firstName}
          maxLength={40}
          disabled={identityDisabled}
          onChange={(firstName) => onChange({ ...value, firstName })}
        />
      )}
      {isFieldVisible(fieldSettings, "guardian-second-name") && (
        <MatriculaTextField
          id="guardian-second-name"
          label="Segundo nombre del acudiente"
          required={isFieldRequired(fieldSettings, "guardian-second-name")}
          invalid={invalidFields.includes("guardian-second-name")}
          value={value.secondName}
          maxLength={40}
          disabled={identityDisabled}
          onChange={(secondName) => onChange({ ...value, secondName })}
        />
      )}
      {isFieldVisible(fieldSettings, "guardian-last-name") && (
        <MatriculaTextField
          id="guardian-last-name"
          label="Primer apellido del acudiente"
          required={isFieldRequired(fieldSettings, "guardian-last-name")}
          invalid={invalidFields.includes("guardian-last-name")}
          value={value.lastName}
          maxLength={40}
          disabled={identityDisabled}
          onChange={(lastName) => onChange({ ...value, lastName })}
        />
      )}
      {isFieldVisible(fieldSettings, "guardian-second-last-name") && (
        <MatriculaTextField
          id="guardian-second-last-name"
          label="Segundo apellido del acudiente"
          required={isFieldRequired(fieldSettings, "guardian-second-last-name")}
          invalid={invalidFields.includes("guardian-second-last-name")}
          value={value.secondLastName}
          maxLength={40}
          disabled={identityDisabled}
          onChange={(secondLastName) => onChange({ ...value, secondLastName })}
        />
      )}
      <MatriculaSelectField
        id="guardian-document-type"
        label="Tipo de documento del acudiente"
        required
        value={value.documentType}
        options={catalogOptions(tipoDocumento)}
        labelFor={catalogLabelFor(tipoDocumento)}
        invalid={invalidFields.includes("guardian-document-type")}
        disabled={identityDisabled}
        onChange={(documentType) => onChange({ ...value, documentType })}
      />
      {isFieldVisible(fieldSettings, "guardian-document-number") && (
        <MatriculaTextField
          id="guardian-document-number"
          label="Documento acudiente"
          required={isFieldRequired(fieldSettings, "guardian-document-number")}
          invalid={invalidFields.includes("guardian-document-number")}
          value={value.documentNumber}
          numeric
          maxLength={15}
          disabled={identityDisabled}
          onChange={(documentNumber) => onChange({ ...value, documentNumber })}
        />
      )}
      <DeptMunicipioFields
        idPrefix="guardian-document-expedition"
        departmentLabel="Lugar expedición documento acudiente departamento"
        municipalityLabel="Lugar expedición documento acudiente municipio"
        value={value.documentExpedition}
        departments={departments}
        onChange={(documentExpedition) => onChange({ ...value, documentExpedition })}
        fieldSettings={fieldSettings}
      />
      {isFieldVisible(fieldSettings, "guardian-gender") && (
        <MatriculaSelectField
          id="guardian-gender"
          label="Género del acudiente"
          required={isFieldRequired(fieldSettings, "guardian-gender")}
          value={value.gender}
          options={catalogOptions(genero)}
          labelFor={catalogLabelFor(genero)}
          invalid={invalidFields.includes("guardian-gender")}
          onChange={(gender) => onChange({ ...value, gender })}
        />
      )}
    </MatriculaFormSection>
  )
}

interface GuardianEmploymentSectionProps {
  value: MatriculaGuardianEmploymentInfo
  onChange: (value: MatriculaGuardianEmploymentInfo) => void
  invalidFields?: string[]
  fieldSettings?: MatriculaFieldSettingsMap
}

export function MatriculaGuardianEmploymentSection({
  value,
  onChange,
  invalidFields = [],
  fieldSettings,
}: GuardianEmploymentSectionProps) {
  if (
    !anySettingVisible(fieldSettings, [
      "guardian-employment-profession",
      "guardian-employment-entity-name",
      "guardian-employment-entity-address",
      "guardian-employment-entity-phone",
      "guardian-employment-entity-position",
    ])
  ) {
    return null
  }

  return (
    <MatriculaFormSection title="Información laboral del acudiente">
      {isFieldVisible(fieldSettings, "guardian-employment-profession") && (
        <MatriculaTextField
          id="guardian-employment-profession"
          label="Profesión acudiente"
          required={isFieldRequired(fieldSettings, "guardian-employment-profession")}
          invalid={invalidFields.includes("guardian-employment-profession")}
          value={value.profession}
          maxLength={100}
          onChange={(profession) => onChange({ ...value, profession })}
        />
      )}
      {isFieldVisible(fieldSettings, "guardian-employment-entity-name") && (
        <MatriculaTextField
          id="guardian-employment-entity-name"
          label="Nombre de la entidad acudiente"
          required={isFieldRequired(fieldSettings, "guardian-employment-entity-name")}
          invalid={invalidFields.includes("guardian-employment-entity-name")}
          value={value.entityName}
          maxLength={100}
          onChange={(entityName) => onChange({ ...value, entityName })}
        />
      )}
      {isFieldVisible(fieldSettings, "guardian-employment-entity-address") && (
        <MatriculaTextField
          id="guardian-employment-entity-address"
          label="Dirección de la entidad acudiente"
          required={isFieldRequired(fieldSettings, "guardian-employment-entity-address")}
          invalid={invalidFields.includes("guardian-employment-entity-address")}
          value={value.entityAddress}
          maxLength={100}
          onChange={(entityAddress) => onChange({ ...value, entityAddress })}
        />
      )}
      {isFieldVisible(fieldSettings, "guardian-employment-entity-phone") && (
        <MatriculaTextField
          id="guardian-employment-entity-phone"
          label="Teléfono de la entidad acudiente"
          type="tel"
          required={isFieldRequired(fieldSettings, "guardian-employment-entity-phone")}
          invalid={invalidFields.includes("guardian-employment-entity-phone")}
          value={value.entityPhone}
          numeric
          maxLength={100}
          onChange={(entityPhone) => onChange({ ...value, entityPhone })}
        />
      )}
      {isFieldVisible(fieldSettings, "guardian-employment-entity-position") && (
        <MatriculaTextField
          id="guardian-employment-entity-position"
          label="Cargo entidad acudiente"
          required={isFieldRequired(fieldSettings, "guardian-employment-entity-position")}
          invalid={invalidFields.includes("guardian-employment-entity-position")}
          value={value.entityPosition}
          maxLength={100}
          onChange={(entityPosition) => onChange({ ...value, entityPosition })}
        />
      )}
    </MatriculaFormSection>
  )
}
