import { useMatriculaCatalogQuery } from "@/features/coverage/matricula/api/query/use-matricula-catalog-select"
import { useEtniasQuery } from "@/features/establishment/institution/api/query/use-etnias"
import { isFieldRequired, isFieldVisible, type MatriculaFieldSettingsMap } from "@/features/coverage/matricula/utils/matricula-field-settings"
import type { MatriculaStudentInfo } from "@/features/coverage/matricula/api/types/matricula"
import { catalogLabelFor, catalogOptions } from "./catalog-utils"
import { type DepartmentOption, DeptMunicipioFields, MatriculaDateField, MatriculaFormSection, MatriculaSelectField, MatriculaTextField } from "./fields"

interface StudentSectionProps {
  value: MatriculaStudentInfo
  onChange: (value: MatriculaStudentInfo) => void
  departments: DepartmentOption[]
  invalidFields?: string[]
  fieldSettings?: MatriculaFieldSettingsMap
  /** Edición: tipo/número de documento y nombre no se pueden tocar acá —
   * son identidad de la persona (`PATCH /usuarios/:ID`), no de la
   * matrícula. Sin efecto en el alta. */
  identityDisabled?: boolean
}

export function MatriculaStudentSection({
  value,
  onChange,
  departments,
  invalidFields = [],
  fieldSettings,
  identityDisabled,
}: StudentSectionProps) {
  const { data: tipoDocumento } = useMatriculaCatalogQuery("tipoDocumento")
  const { data: genero } = useMatriculaCatalogQuery("genero")
  const { data: etnias } = useEtniasQuery()
  const etniaNombreById = new Map((etnias ?? []).map((e) => [String(e.id), e.name]))

  return (
    <MatriculaFormSection title="Información del estudiante">
      <MatriculaSelectField
        id="student-document-type"
        label="Tipo de documento del estudiante"
        required
        value={value.documentType}
        options={catalogOptions(tipoDocumento)}
        labelFor={catalogLabelFor(tipoDocumento)}
        invalid={invalidFields.includes("student-document-type")}
        disabled={identityDisabled}
        onChange={(documentType) => onChange({ ...value, documentType })}
      />
      <MatriculaTextField
        id="student-document-number"
        label="Documento estudiante"
        required
        invalid={invalidFields.includes("student-document-number")}
        value={value.documentNumber}
        numeric
        maxLength={15}
        disabled={identityDisabled}
        onChange={(documentNumber) => onChange({ ...value, documentNumber })}
      />
      <MatriculaTextField
        id="student-first-name"
        label="Nombre del estudiante"
        required
        invalid={invalidFields.includes("student-first-name")}
        value={value.firstName}
        maxLength={40}
        disabled={identityDisabled}
        onChange={(firstName) => onChange({ ...value, firstName })}
      />
      {isFieldVisible(fieldSettings, "student-second-name") && (
        <MatriculaTextField
          id="student-second-name"
          label="Segundo nombre del estudiante"
          required={isFieldRequired(fieldSettings, "student-second-name")}
          invalid={invalidFields.includes("student-second-name")}
          value={value.secondName}
          maxLength={40}
          disabled={identityDisabled}
          onChange={(secondName) => onChange({ ...value, secondName })}
        />
      )}
      <MatriculaTextField
        id="student-last-name"
        label="Primer apellido del estudiante"
        required
        invalid={invalidFields.includes("student-last-name")}
        value={value.lastName}
        maxLength={40}
        disabled={identityDisabled}
        onChange={(lastName) => onChange({ ...value, lastName })}
      />
      {isFieldVisible(fieldSettings, "student-second-last-name") && (
        <MatriculaTextField
          id="student-second-last-name"
          label="Segundo apellido del estudiante"
          required={isFieldRequired(fieldSettings, "student-second-last-name")}
          invalid={invalidFields.includes("student-second-last-name")}
          value={value.secondLastName}
          maxLength={40}
          disabled={identityDisabled}
          onChange={(secondLastName) => onChange({ ...value, secondLastName })}
        />
      )}
      <DeptMunicipioFields
        idPrefix="student-document-expedition"
        departmentLabel="Lugar expedición documento estudiante departamento"
        municipalityLabel="Lugar expedición documento estudiante municipio"
        value={value.documentExpedition}
        departments={departments}
        onChange={(documentExpedition) => onChange({ ...value, documentExpedition })}
        fieldSettings={fieldSettings}
      />
      <MatriculaDateField
        id="student-birth-date"
        label="Fecha de nacimiento"
        required
        invalid={invalidFields.includes("student-birth-date")}
        value={value.birthDate}
        maxDate={new Date()}
        onChange={(birthDate) => onChange({ ...value, birthDate })}
      />
      <DeptMunicipioFields
        idPrefix="student-birth-place"
        departmentLabel="Lugar de nacimiento departamento"
        municipalityLabel="Lugar de nacimiento municipio"
        value={value.birthPlace}
        departments={departments}
        onChange={(birthPlace) => onChange({ ...value, birthPlace })}
        fieldSettings={fieldSettings}
      />
      <MatriculaSelectField
        id="student-gender"
        label="Género del estudiante"
        required
        value={value.gender}
        options={catalogOptions(genero)}
        labelFor={catalogLabelFor(genero)}
        invalid={invalidFields.includes("student-gender")}
        onChange={(gender) => onChange({ ...value, gender })}
      />
      {isFieldVisible(fieldSettings, "student-ethnicity") && (
        <MatriculaSelectField
          id="student-ethnicity"
          label="Etnia/Resguardo"
          required={isFieldRequired(fieldSettings, "student-ethnicity")}
          invalid={invalidFields.includes("student-ethnicity")}
          value={value.ethnicity}
          options={(etnias ?? []).map((e) => String(e.id))}
          labelFor={(option) => etniaNombreById.get(option) ?? option}
          onChange={(ethnicity) => onChange({ ...value, ethnicity })}
        />
      )}
    </MatriculaFormSection>
  )
}
