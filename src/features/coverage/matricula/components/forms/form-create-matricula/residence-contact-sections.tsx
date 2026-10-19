import { isFieldRequired, isFieldVisible, type MatriculaFieldSettingsMap } from "@/features/coverage/matricula/utils/matricula-field-settings"
import type { MatriculaContact, MatriculaResidence } from "@/features/coverage/matricula/api/types/matricula"
import { anySettingVisible } from "./catalog-utils"
import { type DepartmentOption, DeptMunicipioFields, MatriculaFormSection, MatriculaTextField } from "./fields"

interface ResidenceSectionProps {
  title: string
  addressLabel: string
  departmentLabel: string
  municipalityLabel: string
  idPrefix: string
  value: MatriculaResidence
  onChange: (value: MatriculaResidence) => void
  departments: DepartmentOption[]
  invalidFields?: string[]
  fieldSettings?: MatriculaFieldSettingsMap
}

export function MatriculaResidenceSection({
  title,
  addressLabel,
  departmentLabel,
  municipalityLabel,
  idPrefix,
  value,
  onChange,
  departments,
  invalidFields = [],
  fieldSettings,
}: ResidenceSectionProps) {
  const addressId = `${idPrefix}-address`
  const departmentId = `${idPrefix}-department`
  const municipalityId = `${idPrefix}-municipality`
  if (!anySettingVisible(fieldSettings, [addressId, departmentId, municipalityId])) return null

  return (
    <MatriculaFormSection title={title}>
      {isFieldVisible(fieldSettings, addressId) && (
        <MatriculaTextField
          id={addressId}
          label={addressLabel}
          required={isFieldRequired(fieldSettings, addressId)}
          invalid={invalidFields.includes(addressId)}
          value={value.address}
          maxLength={150}
          onChange={(address) => onChange({ ...value, address })}
        />
      )}
      <DeptMunicipioFields
        idPrefix={idPrefix}
        departmentLabel={departmentLabel}
        municipalityLabel={municipalityLabel}
        value={value}
        departments={departments}
        onChange={(location) => onChange({ ...value, ...location })}
        fieldSettings={fieldSettings}
      />
    </MatriculaFormSection>
  )
}

interface ContactSectionProps {
  title: string
  idPrefix: string
  phoneLabel: string
  emailLabel: string
  value: MatriculaContact
  onChange: (value: MatriculaContact) => void
  invalidFields?: string[]
  fieldSettings?: MatriculaFieldSettingsMap
  /** Edición: teléfono/email son contacto de la persona (`PATCH
   * /usuarios/:ID`), no de la matrícula -- no se pueden tocar acá. */
  disabled?: boolean
}

export function MatriculaContactSection({
  title,
  idPrefix,
  phoneLabel,
  emailLabel,
  value,
  onChange,
  invalidFields = [],
  fieldSettings,
  disabled,
}: ContactSectionProps) {
  const phoneId = `${idPrefix}-phone`
  const emailId = `${idPrefix}-email`
  if (!anySettingVisible(fieldSettings, [phoneId, emailId])) return null

  return (
    <MatriculaFormSection title={title}>
      {isFieldVisible(fieldSettings, phoneId) && (
        <MatriculaTextField
          id={phoneId}
          label={phoneLabel}
          type="tel"
          required={isFieldRequired(fieldSettings, phoneId)}
          invalid={invalidFields.includes(phoneId)}
          value={value.phone}
          numeric
          // Solo se opera en Colombia: un teléfono no supera los 10 dígitos.
          maxLength={10}
          disabled={disabled}
          onChange={(phone) => onChange({ ...value, phone })}
        />
      )}
      {isFieldVisible(fieldSettings, emailId) && (
        <MatriculaTextField
          id={emailId}
          label={emailLabel}
          type="email"
          required={isFieldRequired(fieldSettings, emailId)}
          value={value.email}
          invalid={invalidFields.includes(emailId)}
          maxLength={120}
          disabled={disabled}
          onChange={(email) => onChange({ ...value, email })}
        />
      )}
    </MatriculaFormSection>
  )
}
