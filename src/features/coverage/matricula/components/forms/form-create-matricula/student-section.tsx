import { aDocumentoAlfanumerico, aNombre, esTipoDocExtranjero, fechaMinimaNacimiento } from "@/features/coverage/matricula/utils/matricula-formatos"
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
  /** Alta de un estudiante ya registrado (Regla 8): el documento se puede cambiar,
   * el resto de su identidad queda en solo lectura, sin enmascarar los nombres. */
  identidadExistente?: boolean
}

export function MatriculaStudentSection({
  value,
  onChange,
  departments,
  invalidFields = [],
  fieldSettings,
  identityDisabled,
  identidadExistente = false,
}: StudentSectionProps) {
  const bloqueado = Boolean(identityDisabled) || identidadExistente
  const { data: tipoDocumento } = useMatriculaCatalogQuery("tipoDocumento")
  const { data: paises } = useMatriculaCatalogQuery("pais")
  const { data: lenguas } = useMatriculaCatalogQuery("lenguaMaterna")
  const { data: condiciones } = useMatriculaCatalogQuery("condicionMigratoria")
  const colombia = paises?.find((p) => /^colombia$/i.test(p.nombre.trim()))?.id
  const colombiaId = colombia != null ? String(colombia) : ""
  const esOtroPais = Boolean(value.paisOrigen) && value.paisOrigen !== colombiaId
  // PPT, PEP, pasaporte o NES: documento alfanumérico (bloques 2.2 y 2.10).
  const extranjero = esTipoDocExtranjero(tipoDocumento?.find((t) => String(t.id) === value.documentType)?.nombre ?? "")
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
        numeric={!extranjero}
          transform={extranjero ? aDocumentoAlfanumerico : undefined}
        maxLength={20}
        disabled={identityDisabled}
        onChange={(documentNumber) => onChange({ ...value, documentNumber })}
      />
      <MatriculaTextField
        id="student-first-name"
        label="Nombre del estudiante"
        required
        invalid={invalidFields.includes("student-first-name")}
        value={value.firstName}
        maxLength={50}
          transform={aNombre}
        masked={identityDisabled}
          disabled={bloqueado}
        onChange={(firstName) => onChange({ ...value, firstName })}
      />
      {isFieldVisible(fieldSettings, "student-second-name") && (
        <MatriculaTextField
          id="student-second-name"
          label="Segundo nombre del estudiante"
          required={isFieldRequired(fieldSettings, "student-second-name")}
          invalid={invalidFields.includes("student-second-name")}
          value={value.secondName}
          maxLength={50}
          transform={aNombre}
          masked={identityDisabled}
          disabled={bloqueado}
          onChange={(secondName) => onChange({ ...value, secondName })}
        />
      )}
      <MatriculaTextField
        id="student-last-name"
        label="Primer apellido del estudiante"
        required
        invalid={invalidFields.includes("student-last-name")}
        value={value.lastName}
        maxLength={50}
          transform={aNombre}
        masked={identityDisabled}
          disabled={bloqueado}
        onChange={(lastName) => onChange({ ...value, lastName })}
      />
      {isFieldVisible(fieldSettings, "student-second-last-name") && (
        <MatriculaTextField
          id="student-second-last-name"
          label="Segundo apellido del estudiante"
          required={isFieldRequired(fieldSettings, "student-second-last-name")}
          invalid={invalidFields.includes("student-second-last-name")}
          value={value.secondLastName}
          maxLength={50}
          transform={aNombre}
          masked={identityDisabled}
          disabled={bloqueado}
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
        disabled={bloqueado}
      />
      <MatriculaDateField
        id="student-birth-date"
        label="Fecha de nacimiento"
        required
        invalid={invalidFields.includes("student-birth-date")}
        value={value.birthDate}
        maxDate={new Date()}
        minDate={fechaMinimaNacimiento()}
        disabled={bloqueado}
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
        disabled={bloqueado}
      />
      <MatriculaSelectField
        id="student-gender"
        label="Género del estudiante"
        required
        value={value.gender}
        options={catalogOptions(genero)}
        labelFor={catalogLabelFor(genero)}
        invalid={invalidFields.includes("student-gender")}
        disabled={bloqueado}
        onChange={(gender) => onChange({ ...value, gender })}
      />
      {isFieldVisible(fieldSettings, "student-ethnicity") && (
        <MatriculaSelectField
          id="student-ethnicity"
          label="Etnia/Resguardo"
          required={isFieldRequired(fieldSettings, "student-ethnicity")}
          invalid={invalidFields.includes("student-ethnicity")}
          disabled={bloqueado}
          value={value.ethnicity}
          options={(etnias ?? []).map((e) => String(e.id))}
          labelFor={(option) => etniaNombreById.get(option) ?? option}
          onChange={(ethnicity) => onChange({ ...value, ethnicity })}
        />
      )}
      <MatriculaSelectField
        id="student-country"
        label="País de origen"
        required={extranjero}
        invalid={invalidFields.includes("student-country")}
        value={value.paisOrigen || colombiaId}
        options={catalogOptions(paises)}
        labelFor={catalogLabelFor(paises)}
        disabled={bloqueado}
        onChange={(paisOrigen) =>
          onChange({
            ...value,
            paisOrigen,
            condicionMigratoria: paisOrigen && paisOrigen !== colombiaId ? value.condicionMigratoria : "",
          })
        }
      />
      <MatriculaSelectField
        id="student-mother-tongue"
        label="Lengua materna"
        value={value.lenguaMaterna ?? ""}
        options={catalogOptions(lenguas)}
        labelFor={catalogLabelFor(lenguas)}
        onChange={(lenguaMaterna) => onChange({ ...value, lenguaMaterna })}
      />
      <MatriculaSelectField
        id="student-migration-status"
        label="Condición migratoria"
        value={value.condicionMigratoria ?? ""}
        options={catalogOptions(condiciones)}
        labelFor={catalogLabelFor(condiciones)}
        disabled={!esOtroPais}
        description={esOtroPais ? undefined : "Se habilita si el país de origen no es Colombia."}
        onChange={(condicionMigratoria) => onChange({ ...value, condicionMigratoria })}
      />
    </MatriculaFormSection>
  )
}
