import { aTelefono } from "@/features/coverage/matricula/utils/matricula-formatos"
import { isFieldRequired, isFieldVisible, type MatriculaFieldSettingsMap } from "@/features/coverage/matricula/utils/matricula-field-settings"
import type { MatriculaContact, MatriculaResidence } from "@/features/coverage/matricula/api/types/matricula"
import { useState } from "react"
import { geocodeCampusAddress } from "@/features/establishment/campuses/api/query/geocode"
import { CampusLocationMap } from "@/features/establishment/campuses/components/map/campus-maps"
import { formatLocation, parseLocation } from "@/features/establishment/campuses/lib/geo"
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
  /** Con etiqueta se muestra el barrio (solo el domicilio del estudiante). */
  neighborhoodLabel?: string
  /** Con etiqueta se muestra el mapa para ubicar el domicilio. */
  locationLabel?: string
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
  neighborhoodLabel,
  locationLabel,
}: ResidenceSectionProps) {
  const addressId = `${idPrefix}-address`
  const departmentId = `${idPrefix}-department`
  const municipalityId = `${idPrefix}-municipality`
  const [locating, setLocating] = useState(false)
  const [locateMessage, setLocateMessage] = useState<string | null>(null)
  const [recenterVersion, setRecenterVersion] = useState(0)
  if (!anySettingVisible(fieldSettings, [addressId, departmentId, municipalityId])) return null

  // Mismo flujo que la ubicación de una sede: dirección + barrio + municipio.
  async function locateWithAddress() {
    const address = value.address.trim()
    const neighborhood = value.neighborhood?.trim() ?? ""
    if (!address && !neighborhood) {
      setLocateMessage("Escriba la dirección, o marque el punto directamente en el mapa.")
      return
    }
    const department = departments.find((d) => d.name === value.department)
    const municipality = department?.municipalities.find((m) => String(m.id) === value.municipality)
    setLocating(true)
    setLocateMessage(null)
    try {
      const result = await geocodeCampusAddress({
        address,
        neighborhood,
        municipality: municipality?.name,
        department: department?.name,
      })
      if (!result) {
        setLocateMessage("No se encontró la dirección en el mapa. Marque el punto directamente en el mapa.")
        return
      }
      onChange({ ...value, location: formatLocation(result.location) })
      setRecenterVersion((v) => v + 1)
      setLocateMessage(
        result.precision === "address"
          ? "Ubicada con la dirección. Si no es exacta, arrastre el punto."
          : result.precision === "neighborhood"
            ? "No se encontró la dirección exacta: el punto quedó en el barrio. Arrástrelo hasta el domicilio."
            : "No se encontró la dirección: el punto quedó en el municipio. Arrástrelo hasta el domicilio.",
      )
    } catch {
      setLocateMessage("No se pudo consultar el mapa. Marque el punto directamente en el mapa.")
    } finally {
      setLocating(false)
    }
  }

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
      {neighborhoodLabel && (
        <MatriculaTextField
          id={`${idPrefix}-neighborhood`}
          label={neighborhoodLabel}
          value={value.neighborhood ?? ""}
          maxLength={100}
          onChange={(neighborhood) => onChange({ ...value, neighborhood })}
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
      {locationLabel && (
        <div className="flex flex-col gap-2 md:col-span-3">
          <span className="text-sm font-medium">{locationLabel}</span>
          <div className="max-w-xl">
            <CampusLocationMap
              value={parseLocation(value.location)}
              onChange={(point) => onChange({ ...value, location: formatLocation(point) })}
              onLocate={locateWithAddress}
              locating={locating}
              recenterVersion={recenterVersion}
              placeLabel="el domicilio"
            />
          </div>
          {locateMessage ? (
            <p role="status" className="text-xs text-muted-foreground">
              {locateMessage}
            </p>
          ) : null}
        </div>
      )}
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
          // Bloque 2.4/2.12: 7 a 15 dígitos, «+» opcional al inicio.
          maxLength={16}
          transform={aTelefono}
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
          maxLength={254}
          disabled={disabled}
          onChange={(email) => onChange({ ...value, email })}
        />
      )}
    </MatriculaFormSection>
  )
}
