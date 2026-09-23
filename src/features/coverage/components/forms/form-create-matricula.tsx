import { useEffect, useState, type ReactNode } from "react"

import { Field, FieldDescription, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { DatePicker } from "@/components/date-picker"
import {
  ComboboxField,
  ComboboxFieldContent,
  ComboboxFieldItem,
  ComboboxFieldTrigger,
  ComboboxFieldValue,
} from "@/components/ui/combobox"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import {
  ArrowCounterClockwiseIcon,
  CheckIcon,
  EyeIcon,
  FileDownloadOutlinedIcon,
  FilePdfIcon,
  FileTextIcon,
  FileXlsIcon,
  FolderOpenIcon,
  ImageIcon,
  PaperclipIcon,
  SpinnerIcon,
  TrashIcon,
} from "@/components/ui/icons"
import { FileUpload, FileUploadTrigger } from "@/components/ui/file-upload"
import { FormSectionHeading } from "@/components/form-section-heading"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { useNotify } from "@/components/notice/notice-context"

import { getErrorMessage } from "@/lib/api-client"
import { toLettersOnly } from "@/lib/text-input"

import { useMatriculaDependentCatalogsQuery } from "@/features/coverage/api/query/use-matricula-dependent-catalogs-query"
import {
  useMatriculaCatalogQuery,
  type MatriculaCatalogOption,
} from "@/features/coverage/api/query/use-matricula-catalog-select"
import { usePeriodoResolverMatriculaQuery } from "@/features/coverage/api/query/use-periodo-resolver-matricula"
import { useSedeOptionsQuery } from "@/features/establishment/academic-period/api/query/use-sede-options"
import { useSedeJornadasActivasQuery } from "@/features/establishment/employees/api/query/use-sede-jornadas"
import { useEspecialidadesQuery } from "@/features/establishment/academic-period/api/query/use-especialidades"
import { useEtniasQuery } from "@/features/establishment/institution/api/query/use-etnias"
import { useDisabilityTypesQuery } from "@/features/establishment/institution/api/query/use-disability-types"
import { useArchivoViewUrl } from "@/features/files/api/query/use-archivo-view-url"
import {
  isFieldRequired,
  isFieldVisible,
  type MatriculaFieldSettingsMap,
} from "@/features/coverage/utils/matricula-field-settings"
import { formatDateValue, parseDateValue } from "@/lib/date-time-value"
import { MATRICULA_STATUSES, YES_NO_OPTIONS } from "@/features/coverage/api/ui-mappings-matricula"
import type {
  MatriculaAcademicInfo,
  MatriculaBenefitsInfo,
  MatriculaCampusCatalog,
  MatriculaComplementaryInfo,
  MatriculaConflictVictimInfo,
  MatriculaContact,
  MatriculaDeptMunicipio,
  MatriculaFile,
  MatriculaGuardianEmploymentInfo,
  MatriculaGuardianInfo,
  MatriculaOriginSectorInfo,
  MatriculaPreviousYearInfo,
  MatriculaResidence,
  MatriculaStudentInfo,
} from "@/features/coverage/api/types/matricula"

// ── Helpers ─────────────────────────────────────────────────────────────────

interface SectionProps {
  title: string
  /** Archivos va a 2 por fila; el resto de las secciones, a 3. */
  columns?: 2 | 3
  children: ReactNode
}

// Mismo look que las secciones del alta de establecimiento (`Card` con
// borde), pero sin el `Accordion` que las envuelve ahí: acá van todas
// abiertas y visibles a la vez, una debajo de la otra.
export function MatriculaFormSection({ title, columns = 3, children }: SectionProps) {
  return (
    <Card className="rounded-md border border-border py-5">
      <CardContent className="grid gap-3">
        <FormSectionHeading>{title}</FormSectionHeading>
        <div
          className={
            columns === 2
              ? "grid grid-cols-1 gap-x-4 gap-y-3 md:grid-cols-2"
              : "grid grid-cols-1 gap-x-4 gap-y-3 md:grid-cols-3"
          }
        >
          {children}
        </div>
      </CardContent>
    </Card>
  )
}

interface TextFieldProps {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  type?: "text" | "date" | "email" | "tel"
  required?: boolean
  invalid?: boolean
  numeric?: boolean
  /** Solo letras (con tildes/ñ) y espacios — para nombres/apellidos. */
  letters?: boolean
  maxLength?: number
  disabled?: boolean
}

export function MatriculaTextField({
  id,
  label,
  value,
  onChange,
  type = "text",
  required,
  invalid,
  numeric,
  letters,
  maxLength,
  disabled,
}: TextFieldProps) {
  return (
    <Field
      orientation="vertical"
      variant="outlined"
      className="w-full gap-2"
      data-invalid={invalid ? "true" : undefined}
    >
      <FieldLabel htmlFor={id}>
        {label}
        {required ? "*" : ""}
      </FieldLabel>
      <Input
        id={id}
        name={id}
        type={type}
        size="sm"
        autoComplete="off"
        placeholder="Agregar"
        value={value}
        aria-invalid={invalid}
        inputMode={numeric ? "numeric" : undefined}
        maxLength={maxLength}
        disabled={disabled}
        onChange={(event) => {
          const raw = event.target.value
          const nextValue = numeric
            ? raw.replace(/\D/g, "")
            : letters
              ? toLettersOnly(raw)
              : raw
          onChange(nextValue)
        }}
      />
    </Field>
  )
}

interface DateFieldProps {
  id: string
  label: string
  /** `yyyy-MM-dd`, igual que el resto del formulario (mismo shape que un
   * `<input type="date">` nativo). */
  value: string
  onChange: (value: string) => void
  required?: boolean
  invalid?: boolean
  maxDate?: Date
}

/** Mismo `DatePicker` que usa Establecimiento, con el label flotante del resto de campos del alta. */
export function MatriculaDateField({
  id,
  label,
  value,
  onChange,
  required,
  invalid,
  maxDate,
}: DateFieldProps) {
  return (
    <Field
      orientation="vertical"
      variant="outlined"
      className="w-full gap-2"
      data-invalid={invalid ? "true" : undefined}
    >
      <FieldLabel htmlFor={id}>
        {label}
        {required ? "*" : ""}
      </FieldLabel>
      <DatePicker
        id={id}
        mode="date"
        value={parseDateValue(value)}
        aria-invalid={invalid}
        maxDate={maxDate}
        onChange={(date) => onChange(formatDateValue(date) ?? "")}
      />
    </Field>
  )
}

interface SelectFieldProps {
  id: string
  label: string
  value: string
  options: string[]
  onChange: (value: string) => void
  required?: boolean
  placeholder?: string
  labelFor?: (option: string) => string
  invalid?: boolean
  disabled?: boolean
}

export function MatriculaSelectField({
  id,
  label,
  value,
  options,
  onChange,
  required,
  placeholder = "Seleccionar",
  labelFor = (option) => option,
  invalid,
  disabled,
}: SelectFieldProps) {
  const items = Object.fromEntries([
    ["", placeholder],
    ...options.map((option) => [option, labelFor(option)]),
  ])
  return (
    <Field
      orientation="vertical"
      variant="outlined"
      className="w-full gap-2"
      data-invalid={invalid ? "true" : undefined}
    >
      <FieldLabel htmlFor={id}>
        {label}
        {required ? "*" : ""}
      </FieldLabel>
      <ComboboxField
        items={items}
        value={value}
        onValueChange={(next) => onChange(next ?? "")}
        disabled={disabled}
      >
        <ComboboxFieldTrigger id={id} size="sm" className="w-full" aria-invalid={invalid}>
          <ComboboxFieldValue placeholder={placeholder} />
        </ComboboxFieldTrigger>
        <ComboboxFieldContent>
          {/* Opción para deseleccionar: vuelve el campo a su placeholder. */}
          <ComboboxFieldItem key="__empty__" value="">
            {placeholder}
          </ComboboxFieldItem>
          {options.map((option) => (
            <ComboboxFieldItem key={option} value={option}>
              {labelFor(option)}
            </ComboboxFieldItem>
          ))}
        </ComboboxFieldContent>
      </ComboboxField>
    </Field>
  )
}

// ── Departamento / municipio ─────────────────────────────────────────────────
// Se repite seis veces en el formulario (expedición y nacimiento del
// estudiante, residencia de estudiante y acudiente, expedición del
// acudiente): un solo componente evita reescribir el filtrado en cascada
// cada vez.

export interface MunicipalityOption {
  id: number
  name: string
}

export interface DepartmentOption {
  name: string
  municipalities: MunicipalityOption[]
}

interface DeptMunicipioFieldsProps {
  idPrefix: string
  departmentLabel: string
  municipalityLabel: string
  value: MatriculaDeptMunicipio
  departments: DepartmentOption[]
  onChange: (value: MatriculaDeptMunicipio) => void
  fieldSettings?: MatriculaFieldSettingsMap
}

export function DeptMunicipioFields({
  idPrefix,
  departmentLabel,
  municipalityLabel,
  value,
  departments,
  onChange,
  fieldSettings,
}: DeptMunicipioFieldsProps) {
  const municipalities = departments.find((d) => d.name === value.department)?.municipalities ?? []
  const municipalityNameById = new Map(municipalities.map((m) => [String(m.id), m.name]))
  const departmentId = `${idPrefix}-department`
  const municipalityId = `${idPrefix}-municipality`

  return (
    <>
      {isFieldVisible(fieldSettings, departmentId) && (
        <MatriculaSelectField
          id={departmentId}
          label={departmentLabel}
          required={isFieldRequired(fieldSettings, departmentId)}
          value={value.department}
          options={departments.map((d) => d.name)}
          onChange={(department) => onChange({ department, municipality: "" })}
        />
      )}
      {isFieldVisible(fieldSettings, municipalityId) && (
        <MatriculaSelectField
          id={municipalityId}
          label={municipalityLabel}
          required={isFieldRequired(fieldSettings, municipalityId)}
          value={value.municipality}
          options={municipalities.map((m) => String(m.id))}
          labelFor={(option) => municipalityNameById.get(option) ?? option}
          placeholder={!value.department ? "Elegí departamento primero" : "Seleccionar"}
          disabled={!value.department}
          onChange={(municipality) => onChange({ ...value, municipality })}
        />
      )}
    </>
  )
}

// Campos como Tipo de documento/Género/Parentesco viajan al alta real como
// FK a `TLISTA_VALOR` (`useMatriculaCatalogQuery`), no como texto libre —
// se guardan como el `id` (string) y se muestran por `nombre`.
function catalogOptions(catalog: MatriculaCatalogOption[] | undefined) {
  return (catalog ?? []).map((option) => String(option.id))
}

function catalogLabelFor(catalog: MatriculaCatalogOption[] | undefined) {
  const byId = new Map((catalog ?? []).map((option) => [String(option.id), option.nombre]))
  return (id: string) => byId.get(id) ?? id
}

/** Para secciones sin ningún campo bloqueado: si la config apagó "Visible"
 * en todos sus campos, la tarjeta entera no tiene nada que mostrar. */
function anySettingVisible(fieldSettings: MatriculaFieldSettingsMap | undefined, ids: string[]) {
  return ids.some((id) => isFieldVisible(fieldSettings, id))
}

// ── Secciones ─────────────────────────────────────────────────────────────

interface AcademicSectionProps {
  value: MatriculaAcademicInfo
  onChange: (value: MatriculaAcademicInfo) => void
  catalogs?: MatriculaCampusCatalog
  invalidFields?: string[]
  showStatus?: boolean
  fieldSettings?: MatriculaFieldSettingsMap
  academicDisabled?: boolean
}

export function MatriculaAcademicSection({
  value,
  onChange,
  catalogs,
  invalidFields = [],
  showStatus = true,
  fieldSettings,
  academicDisabled,
}: AcademicSectionProps) {
  // Sede → Jornada → Grado → Grupo — mismo criterio que "Modificar" (ver
  // `dialog-modificar-matricula.tsx` y `use-matricula-dependent-catalogs-query.ts`).
  const { data: dependentCatalogs, isPeriodoError, periodoError } = useMatriculaDependentCatalogsQuery({
    campus: value.campus || undefined,
    shift: value.shift || undefined,
    grade: value.grade ? Number(value.grade) : undefined,
  })
  const gradoNombreByValor = new Map(
    (dependentCatalogs?.grades ?? []).map((grado) => [String(grado.valor), grado.nombre]),
  )

  const { notify } = useNotify()
  useEffect(() => {
    if (isPeriodoError) notify(getErrorMessage(periodoError), { variant: "error" })
  }, [isPeriodoError, periodoError, notify])


  const { data: sedes } = useSedeOptionsQuery()
  const sedeId = value.campus ? sedes?.find((sede) => sede.nombre === value.campus)?.pk_sede : undefined
  const { data: jornadasActivas } = useSedeJornadasActivasQuery(sedeId ?? null)
  const jornadaId = value.shift ? jornadasActivas?.find((j) => j.nombre === value.shift)?.id : undefined
  const { data: periodoId } = usePeriodoResolverMatriculaQuery(sedeId ?? null, jornadaId ?? null)
  const { data: especialidades } = useEspecialidadesQuery(periodoId ?? undefined)
  const especialidadNombreById = new Map((especialidades ?? []).map((e) => [String(e.id), e.label]))

  return (
    <MatriculaFormSection title="Información de matrícula">
      <MatriculaSelectField
        id="matricula-campus"
        label="Sede"
        required
        value={value.campus}
        options={catalogs?.campuses ?? []}
        disabled={academicDisabled}
        invalid={invalidFields.includes("matricula-campus")}
        onChange={(campus) => onChange({ ...value, campus, shift: "", grade: "", group: "" })}
      />
      <MatriculaSelectField
        id="matricula-shift"
        label="Jornada"
        required
        value={value.shift}
        options={dependentCatalogs?.shifts ?? []}
        placeholder={!value.campus ? "Elegí sede primero" : "Seleccionar"}
        disabled={academicDisabled || !value.campus}
        invalid={invalidFields.includes("matricula-shift")}
        onChange={(shift) => onChange({ ...value, shift, grade: "", group: "" })}
      />
      <MatriculaSelectField
        id="matricula-grade"
        label="Grado"
        required
        value={value.grade}
        options={(dependentCatalogs?.grades ?? []).map((grado) => String(grado.valor))}
        labelFor={(option) => gradoNombreByValor.get(option) ?? option}
        placeholder={!value.shift ? "Elegí jornada primero" : "Seleccionar"}
        disabled={academicDisabled || !value.shift}
        invalid={invalidFields.includes("matricula-grade")}
        onChange={(grade) => onChange({ ...value, grade, group: "" })}
      />
      <MatriculaSelectField
        id="matricula-group"
        label="Grupo"
        required
        value={value.group}
        options={(dependentCatalogs?.groups ?? []).map((grupo) => String(grupo.id))}
        labelFor={(option) =>
          dependentCatalogs?.groups.find((grupo) => String(grupo.id) === option)?.codigo ?? option
        }
        placeholder={!value.grade ? "Elegí grado primero" : "Seleccionar"}
        disabled={academicDisabled || !value.grade}
        invalid={invalidFields.includes("matricula-group")}
        onChange={(group) => onChange({ ...value, group })}
      />
      {isFieldVisible(fieldSettings, "matricula-specialty") && (
        <MatriculaSelectField
          id="matricula-specialty"
          label="Carácter/Especialidad/Énfasis"
          required={isFieldRequired(fieldSettings, "matricula-specialty")}
          invalid={invalidFields.includes("matricula-specialty")}
          value={value.specialty}
          options={(especialidades ?? []).map((e) => String(e.id))}
          labelFor={(option) => especialidadNombreById.get(option) ?? option}
          placeholder={!value.shift ? "Elegí jornada primero" : "Seleccionar"}
          onChange={(specialty) => onChange({ ...value, specialty })}
        />
      )}
      {showStatus && (
        <MatriculaSelectField
          id="matricula-status"
          label="Estado de la matrícula"
          value={value.status}
          options={MATRICULA_STATUSES}
          onChange={(status) => {
            const entry = MATRICULA_STATUSES.find((option) => option === status)
            onChange({ ...value, status: entry ?? "" })
          }}
          disabled
        />
      )}
    </MatriculaFormSection>
  )
}

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
        maxLength={10}
        disabled={identityDisabled}
        onChange={(documentNumber) => onChange({ ...value, documentNumber })}
      />
      <MatriculaTextField
        id="student-first-name"
        label="Nombre del estudiante"
        required
        invalid={invalidFields.includes("student-first-name")}
        value={value.firstName}
        letters
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
          letters
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
        letters
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
          letters
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

interface ComplementarySectionProps {
  value: MatriculaComplementaryInfo
  onChange: (value: MatriculaComplementaryInfo) => void
  invalidFields?: string[]
  fieldSettings?: MatriculaFieldSettingsMap
}

export function MatriculaComplementarySection({
  value,
  onChange,
  invalidFields = [],
  fieldSettings,
}: ComplementarySectionProps) {
  const { data: estrato } = useMatriculaCatalogQuery("estrato")
  const { data: sisben } = useMatriculaCatalogQuery("sisben")
  const { data: talento } = useMatriculaCatalogQuery("talento")
  const { data: discapacidades } = useDisabilityTypesQuery()
  const discapacidadNombreById = new Map(
    (discapacidades ?? []).map((item) => [String(item.id), item.name]),
  )
  if (
    !anySettingVisible(fieldSettings, [
      "complementary-stratum",
      "complementary-sisben",
      "complementary-eps",
      "complementary-ars",
      "complementary-special-conditions",
      "complementary-talent",
    ])
  ) {
    return null
  }

  return (
    <MatriculaFormSection title="Información complementaria">
      {isFieldVisible(fieldSettings, "complementary-stratum") && (
        <MatriculaSelectField
          id="complementary-stratum"
          label="Estrato socio económico del estudiante"
          required={isFieldRequired(fieldSettings, "complementary-stratum")}
          invalid={invalidFields.includes("complementary-stratum")}
          value={value.socioeconomicStratum}
          options={catalogOptions(estrato)}
          labelFor={catalogLabelFor(estrato)}
          onChange={(socioeconomicStratum) => onChange({ ...value, socioeconomicStratum })}
        />
      )}
      {isFieldVisible(fieldSettings, "complementary-sisben") && (
        <MatriculaSelectField
          id="complementary-sisben"
          label="Sisbén"
          required={isFieldRequired(fieldSettings, "complementary-sisben")}
          invalid={invalidFields.includes("complementary-sisben")}
          value={value.sisben}
          options={catalogOptions(sisben)}
          labelFor={catalogLabelFor(sisben)}
          onChange={(sisben) => onChange({ ...value, sisben })}
        />
      )}
      {isFieldVisible(fieldSettings, "complementary-eps") && (
        <MatriculaTextField
          id="complementary-eps"
          label="EPS"
          required={isFieldRequired(fieldSettings, "complementary-eps")}
          invalid={invalidFields.includes("complementary-eps")}
          value={value.eps}
          maxLength={150}
          onChange={(eps) => onChange({ ...value, eps })}
        />
      )}
      {isFieldVisible(fieldSettings, "complementary-ars") && (
        <MatriculaTextField
          id="complementary-ars"
          label="ARS"
          required={isFieldRequired(fieldSettings, "complementary-ars")}
          invalid={invalidFields.includes("complementary-ars")}
          value={value.ars}
          maxLength={150}
          onChange={(ars) => onChange({ ...value, ars })}
        />
      )}
      {isFieldVisible(fieldSettings, "complementary-special-conditions") && (
        <MatriculaSelectField
          id="complementary-special-conditions"
          label="Condiciones especiales del estudiante"
          required={isFieldRequired(fieldSettings, "complementary-special-conditions")}
          invalid={invalidFields.includes("complementary-special-conditions")}
          value={value.specialConditions}
          options={(discapacidades ?? []).map((item) => String(item.id))}
          labelFor={(option) => discapacidadNombreById.get(option) ?? option}
          onChange={(specialConditions) => onChange({ ...value, specialConditions })}
        />
      )}
      {isFieldVisible(fieldSettings, "complementary-talent") && (
        <MatriculaSelectField
          id="complementary-talent"
          label="Talento del estudiante"
          required={isFieldRequired(fieldSettings, "complementary-talent")}
          invalid={invalidFields.includes("complementary-talent")}
          value={value.talent}
          options={catalogOptions(talento)}
          labelFor={catalogLabelFor(talento)}
          onChange={(talent) => onChange({ ...value, talent })}
        />
      )}
    </MatriculaFormSection>
  )
}

interface BenefitsSectionProps {
  value: MatriculaBenefitsInfo
  onChange: (value: MatriculaBenefitsInfo) => void
  invalidFields?: string[]
  fieldSettings?: MatriculaFieldSettingsMap
}

export function MatriculaBenefitsSection({
  value,
  onChange,
  invalidFields = [],
  fieldSettings,
}: BenefitsSectionProps) {
  const { data: fuenteRecursos } = useMatriculaCatalogQuery("fuenteRecursos")
  if (
    !anySettingVisible(fieldSettings, [
      "benefits-subsidized",
      "benefits-funding-source",
      "benefits-head-household-student",
      "benefits-head-household-children",
      "benefits-public-force-veteran",
      "benefits-national-heroes",
    ])
  ) {
    return null
  }

  return (
    <MatriculaFormSection title="Subsidio o beneficios">
      {isFieldVisible(fieldSettings, "benefits-subsidized") && (
        <MatriculaSelectField
          id="benefits-subsidized"
          label="Subsidiado"
          required={isFieldRequired(fieldSettings, "benefits-subsidized")}
          invalid={invalidFields.includes("benefits-subsidized")}
          value={value.subsidized}
          options={YES_NO_OPTIONS}
          onChange={(subsidized) => onChange({ ...value, subsidized })}
        />
      )}
      {isFieldVisible(fieldSettings, "benefits-funding-source") && (
        <MatriculaSelectField
          id="benefits-funding-source"
          label="Fuente de recursos"
          required={isFieldRequired(fieldSettings, "benefits-funding-source")}
          invalid={invalidFields.includes("benefits-funding-source")}
          value={value.fundingSource}
          options={catalogOptions(fuenteRecursos)}
          labelFor={catalogLabelFor(fuenteRecursos)}
          onChange={(fundingSource) => onChange({ ...value, fundingSource })}
        />
      )}
      {isFieldVisible(fieldSettings, "benefits-head-household-student") && (
        <MatriculaSelectField
          id="benefits-head-household-student"
          label="Alumnos madre cabeza de familia"
          required={isFieldRequired(fieldSettings, "benefits-head-household-student")}
          invalid={invalidFields.includes("benefits-head-household-student")}
          value={value.headOfHouseholdStudent}
          options={YES_NO_OPTIONS}
          onChange={(headOfHouseholdStudent) => onChange({ ...value, headOfHouseholdStudent })}
        />
      )}
      {isFieldVisible(fieldSettings, "benefits-head-household-children") && (
        <MatriculaSelectField
          id="benefits-head-household-children"
          label="Hijos de madre cabeza de familia"
          required={isFieldRequired(fieldSettings, "benefits-head-household-children")}
          invalid={invalidFields.includes("benefits-head-household-children")}
          value={value.headOfHouseholdChildren}
          options={YES_NO_OPTIONS}
          onChange={(headOfHouseholdChildren) => onChange({ ...value, headOfHouseholdChildren })}
        />
      )}
      {isFieldVisible(fieldSettings, "benefits-public-force-veteran") && (
        <MatriculaSelectField
          id="benefits-public-force-veteran"
          label="Veteranos de la fuerza pública"
          required={isFieldRequired(fieldSettings, "benefits-public-force-veteran")}
          invalid={invalidFields.includes("benefits-public-force-veteran")}
          value={value.publicForceVeteran}
          options={YES_NO_OPTIONS}
          onChange={(publicForceVeteran) => onChange({ ...value, publicForceVeteran })}
        />
      )}
      {isFieldVisible(fieldSettings, "benefits-national-heroes") && (
        <MatriculaSelectField
          id="benefits-national-heroes"
          label="Héroes de la nación"
          required={isFieldRequired(fieldSettings, "benefits-national-heroes")}
          invalid={invalidFields.includes("benefits-national-heroes")}
          value={value.nationalHeroes}
          options={YES_NO_OPTIONS}
          onChange={(nationalHeroes) => onChange({ ...value, nationalHeroes })}
        />
      )}
    </MatriculaFormSection>
  )
}

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
          letters
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
          letters
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
          letters
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
          letters
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
          maxLength={10}
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

export interface MatriculaSupportFiles {
  studentIdDocument: File[]
  previousYearCertificate: File[]
  medicalCertificate: File[]
  studentPhoto: File[]
  otherDocuments: File[]
}

interface SupportFileFieldConfig {
  key: keyof MatriculaSupportFiles
  /** Id del catálogo (`MATRICULA_FIELD_CATALOG`, sección "Archivo de
   * soporte") — de acá salen `requerido`/`visible` vía `fieldSettings`. */
  fieldId: string
  label: string
  multiple?: boolean
}

export const SUPPORT_FILE_FIELDS: SupportFileFieldConfig[] = [
  { key: "studentIdDocument", fieldId: "file-student-id-document", label: "Documento de identidad del estudiante" },
  {
    key: "previousYearCertificate",
    fieldId: "file-previous-year-certificate",
    label: "Certificado de estudios del año anterior",
  },
  { key: "medicalCertificate", fieldId: "file-medical-certificate", label: "Certificado médico del estudiante" },
  { key: "studentPhoto", fieldId: "file-student-photo", label: "Foto del estudiante" },
  { key: "otherDocuments", fieldId: "file-other-documents", label: "Otros documentos relevantes", multiple: true },
]

const MATRICULA_MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024

function fileKey(file: File): string {
  return `${file.name}:${file.size}:${file.lastModified}`
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B"
  const units = ["B", "KB", "MB", "GB"]
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1)
  return `${Math.round(bytes / 1024 ** index)}${units[index]}`
}

function FileTypeIcon({ file }: { file: File }) {
  const extension = file.name.split(".").pop()?.toLowerCase() ?? ""
  if (file.type.startsWith("image/")) return <ImageIcon className="size-4 shrink-0 text-orange" />
  if (extension === "pdf") return <FilePdfIcon className="size-4 shrink-0 text-red" />
  if (["xls", "xlsx", "csv"].includes(extension)) {
    return <FileXlsIcon className="size-4 shrink-0 text-green" />
  }
  return <FileTextIcon className="size-4 shrink-0 text-blue" />
}

function previewFile(file: File) {
  window.open(URL.createObjectURL(file), "_blank", "noopener,noreferrer")
}

function downloadFile(file: File) {
  const url = URL.createObjectURL(file)
  const link = document.createElement("a")
  link.href = url
  link.download = file.name
  document.body.appendChild(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 60_000)
}

// Misma fila en el sheet y en la grilla del formulario — afuera solo se le
// recortan las acciones (sin adjuntar/quitar, eso vive en el sheet).
function SupportFileEmptyRow({ invalid }: { invalid?: boolean }) {
  return (
    <div
      className={
        invalid
          ? "flex items-center justify-center gap-1.5 border-b border-red pb-1.5 text-center text-xs text-red"
          : "flex items-center justify-center gap-1.5 border-b border-border pb-1.5 text-center text-xs text-muted-foreground"
      }
    >
      <FolderOpenIcon aria-hidden className="size-4" weight="light" />
      Sin datos
    </div>
  )
}

interface SupportFileRowProps {
  file: File
  /** El sheet agrega "Eliminar"; afuera solo se ve. */
  onRemove?: (file: File) => void
  /** El sheet además ofrece "Descargar"; afuera (grilla del formulario) no. */
  showDownload?: boolean
}

function SupportFileRow({ file, onRemove, showDownload = false }: SupportFileRowProps) {
  return (
    <div className="flex items-center justify-between gap-2 border-b border-border pb-1.5 text-sm">
      <span className="flex min-w-0 items-center gap-2">
        <FileTypeIcon file={file} />
        <span className="truncate">{file.name}</span>
      </span>
      <span className="flex shrink-0 items-center gap-0.5">
        <span className="mr-1 text-xs text-muted-foreground">{formatFileSize(file.size)}</span>
        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                type="button"
                variant="ghost"
                color="neutral"
                size="icon-sm"
                aria-label={`Ver ${file.name}`}
                onClick={() => previewFile(file)}
              />
            }
          >
            <EyeIcon />
          </TooltipTrigger>
          <TooltipContent>{`Ver ${file.name}`}</TooltipContent>
        </Tooltip>
        {showDownload && (
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  type="button"
                  variant="ghost"
                  color="neutral"
                  size="icon-sm"
                  aria-label={`Descargar ${file.name}`}
                  onClick={() => downloadFile(file)}
                />
              }
            >
              <FileDownloadOutlinedIcon />
            </TooltipTrigger>
            <TooltipContent>{`Descargar ${file.name}`}</TooltipContent>
          </Tooltip>
        )}
        {onRemove && (
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  type="button"
                  variant="ghost"
                  color="neutral"
                  size="icon-sm"
                  aria-label={`Eliminar ${file.name}`}
                  onClick={() => onRemove(file)}
                />
              }
            >
              <TrashIcon />
            </TooltipTrigger>
            <TooltipContent>{`Eliminar ${file.name}`}</TooltipContent>
          </Tooltip>
        )}
      </span>
    </div>
  )
}

interface SupportFilesSheetFieldProps {
  config: SupportFileFieldConfig
  value: File[]
  onChange: (files: File[]) => void
  required?: boolean
  existingFiles?: MatriculaFile[]
  editable?: boolean
  viewOnly?: boolean
  removedExistingIds?: Set<number>
  onToggleRemoveExisting?: (fileId: number) => void
}

function SupportFilesSheetField({
  config,
  value,
  onChange,
  required = false,
  existingFiles = [],
  editable = false,
  viewOnly = false,
  removedExistingIds,
  onToggleRemoveExisting,
}: SupportFilesSheetFieldProps) {
  const [rejection, setRejection] = useState<string | null>(null)

  function removeFile(file: File) {
    onChange(value.filter((f) => f !== file))
  }

  const existingSuperseded = editable && !config.multiple && value.length > 0
  const visibleExisting = existingSuperseded ? [] : existingFiles
  const isEmpty = value.length === 0 && visibleExisting.length === 0
  const canAttach =
    !viewOnly && (editable ? true : config.multiple || (value.length === 0 && existingFiles.length === 0))
  const canRemoveExisting = editable && (config.multiple || !required)

  return (
    <FileUpload
      value={value}
      onValueChange={(files) => {
        setRejection(null)
        onChange(files)
      }}
      multiple={config.multiple}
      onFileValidate={(file) =>
        file.size > MATRICULA_MAX_FILE_SIZE_BYTES ? "supera el máximo permitido de 25 MB" : null
      }
      onFileReject={(file, message) => setRejection(`${file.name} ${message}`)}
      className="gap-2"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-semibold text-foreground">
          {config.label}
          {required ? "*" : ""}
        </span>
        {canAttach && (
          <Tooltip>
            <TooltipTrigger
              render={
                <FileUploadTrigger
                  render={
                    <Button
                      type="button"
                      variant="ghost"
                      color="primary"
                      size="icon-sm"
                      aria-label={`Adjuntar ${config.label}`}
                    />
                  }
                />
              }
            >
              <PaperclipIcon />
            </TooltipTrigger>
            <TooltipContent>{`Adjuntar ${config.label}`}</TooltipContent>
          </Tooltip>
        )}
      </div>
      {rejection && <p className="text-xs text-red">{rejection}</p>}

      {isEmpty ? (
        <SupportFileEmptyRow />
      ) : (
        <div className="flex flex-col gap-2">
          {visibleExisting.map((file) => (
            <ExistingFileRow
              key={file.id}
              file={file}
              removable={canRemoveExisting}
              markedForRemoval={removedExistingIds?.has(file.id)}
              onToggleRemove={onToggleRemoveExisting ? () => onToggleRemoveExisting(file.id) : undefined}
            />
          ))}
          {value.map((file) => (
            <SupportFileRow key={fileKey(file)} file={file} onRemove={removeFile} showDownload />
          ))}
        </div>
      )}
    </FileUpload>
  )
}

// Ícono por extensión para archivos reales (`MatriculaFile`, del GET de
// detalle) -- a diferencia de `FileTypeIcon` no hay un `File` del navegador
// con `.type`, solo el nombre.
function existingFileIcon(name: string) {
  const extension = name.split(".").pop()?.toLowerCase() ?? ""
  if (["jpg", "jpeg", "png", "gif", "webp"].includes(extension)) {
    return <ImageIcon className="size-4 shrink-0 text-orange" />
  }
  if (extension === "pdf") return <FilePdfIcon className="size-4 shrink-0 text-red" />
  if (["xls", "xlsx", "csv"].includes(extension)) {
    return <FileXlsIcon className="size-4 shrink-0 text-green" />
  }
  return <FileTextIcon className="size-4 shrink-0 text-blue" />
}

interface ExistingFileRowProps {
  file: MatriculaFile
  removable?: boolean
  markedForRemoval?: boolean
  onToggleRemove?: () => void
}

// Ver/Descargar salen de `file-service` (`useArchivoViewUrl`, acuña un
// token de vista de un solo archivo por `fk_tarchivo` -- ver `lib/files.ts`),
// mismo mecanismo que ya usa `ArchivoImage`.
function ExistingFileRow({ file, removable, markedForRemoval, onToggleRemove }: ExistingFileRowProps) {
  const { data: url, isPending } = useArchivoViewUrl(file.archivoId)

  function handleView() {
    if (url) window.open(url, "_blank", "noopener,noreferrer")
  }

  function handleDownload() {
    if (!url) return
    const link = document.createElement("a")
    link.href = url
    link.download = file.name
    document.body.appendChild(link)
    link.click()
    link.remove()
  }

  return (
    <div
      className={
        markedForRemoval
          ? "flex items-center justify-between gap-2 border-b border-border pb-1.5 text-sm opacity-50"
          : "flex items-center justify-between gap-2 border-b border-border pb-1.5 text-sm"
      }
    >
      <span className="flex min-w-0 items-center gap-2">
        {existingFileIcon(file.name)}
        <span className={markedForRemoval ? "truncate line-through" : "truncate"}>{file.name}</span>
      </span>
      <span className="flex shrink-0 items-center gap-0.5">
        <span className="mr-1 text-xs text-muted-foreground">{formatFileSize(file.sizeBytes)}</span>
        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                type="button"
                variant="ghost"
                color="neutral"
                size="icon-sm"
                disabled={isPending || !url}
                aria-label={`Ver ${file.name}`}
                onClick={handleView}
              />
            }
          >
            <EyeIcon />
          </TooltipTrigger>
          <TooltipContent>{`Ver ${file.name}`}</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                type="button"
                variant="ghost"
                color="neutral"
                size="icon-sm"
                disabled={isPending || !url}
                aria-label={`Descargar ${file.name}`}
                onClick={handleDownload}
              />
            }
          >
            <FileDownloadOutlinedIcon />
          </TooltipTrigger>
          <TooltipContent>{`Descargar ${file.name}`}</TooltipContent>
        </Tooltip>
        {removable && (
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  type="button"
                  variant="ghost"
                  color="neutral"
                  size="icon-sm"
                  aria-label={markedForRemoval ? `Deshacer eliminar ${file.name}` : `Eliminar ${file.name}`}
                  onClick={onToggleRemove}
                />
              }
            >
              {markedForRemoval ? <ArrowCounterClockwiseIcon /> : <TrashIcon />}
            </TooltipTrigger>
            <TooltipContent>
              {markedForRemoval ? `Deshacer eliminar ${file.name}` : `Eliminar ${file.name}`}
            </TooltipContent>
          </Tooltip>
        )}
      </span>
    </div>
  )
}

// El GET de detalle manda `typeLabel` (nombre de TLISTA_VALOR TIPO_ARCHIVO),
// no la misma clave que usa `MatriculaSupportFiles` -- matchea por palabra
// clave en vez de comparar texto exacto (mismo motivo que el positional
// match de "Configuración de parámetros requeridos": el backend no
// garantiza la redacción exacta). Lo que no matchea ningún patrón cae en
// "Otros documentos relevantes", que ya admite varios archivos.
function matchSupportFileKey(typeLabel: string): keyof MatriculaSupportFiles {
  const normalized = typeLabel
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
  if (normalized.includes("identidad")) return "studentIdDocument"
  if (normalized.includes("medic")) return "medicalCertificate"
  if (normalized.includes("foto")) return "studentPhoto"
  if (normalized.includes("anterior") || normalized.includes("estudios")) return "previousYearCertificate"
  return "otherDocuments"
}

export function groupExistingFilesByKey(
  files: MatriculaFile[],
): Record<keyof MatriculaSupportFiles, MatriculaFile[]> {
  const grouped: Record<keyof MatriculaSupportFiles, MatriculaFile[]> = {
    studentIdDocument: [],
    previousYearCertificate: [],
    medicalCertificate: [],
    studentPhoto: [],
    otherDocuments: [],
  }
  for (const file of files) {
    grouped[matchSupportFileKey(file.typeLabel)].push(file)
  }
  return grouped
}

interface SupportFilesSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  value: MatriculaSupportFiles
  onChange: (value: MatriculaSupportFiles) => void
  /** Archivos ya cargados en el backend (solo detalle/edición) -- se
   * muestran aparte, arriba, de solo lectura salvo que `editable` esté
   * activo. */
  existingFiles?: MatriculaFile[]
  /** Editar (no alta): habilita reemplazar los de una sola vía y marcar
   * para borrar los de "otros documentos", más el botón Guardar de abajo. */
  editable?: boolean
  /** Fila de la tabla: puramente de visualización (ver `SupportFilesSheetField`). */
  viewOnly?: boolean
  removedExistingIds?: Set<number>
  onToggleRemoveExisting?: (fileId: number) => void
  onSave?: () => void
  isSaving?: boolean
  saveDisabled?: boolean
  fieldSettings?: MatriculaFieldSettingsMap
}

export function SupportFilesSheet({
  open,
  onOpenChange,
  value,
  onChange,
  existingFiles,
  editable = false,
  viewOnly = false,
  removedExistingIds,
  onToggleRemoveExisting,
  onSave,
  isSaving = false,
  saveDisabled = false,
  fieldSettings,
}: SupportFilesSheetProps) {
  const existingByKey = groupExistingFilesByKey(existingFiles ?? [])
  const visibleFields = SUPPORT_FILE_FIELDS.filter((field) => isFieldVisible(fieldSettings, field.fieldId))
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full gap-0 data-[side=right]:sm:max-w-lg">
        <SheetHeader className="px-4">
          <SheetTitle>Archivos de soporte</SheetTitle>
          <SheetDescription>
            {viewOnly
              ? "Documentos cargados para este estudiante."
              : "Por favor cargue los siguientes documentos requeridos para completar la inscripción del estudiante."}
          </SheetDescription>
        </SheetHeader>
        <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-4 pb-8">
          {visibleFields.map((field) => (
            <SupportFilesSheetField
              key={field.key}
              config={field}
              value={value[field.key]}
              onChange={(files) => onChange({ ...value, [field.key]: files })}
              required={isFieldRequired(fieldSettings, field.fieldId)}
              existingFiles={existingByKey[field.key]}
              editable={editable}
              viewOnly={viewOnly}
              removedExistingIds={removedExistingIds}
              onToggleRemoveExisting={onToggleRemoveExisting}
            />
          ))}
        </div>
        {onSave && (
          <SheetFooter className="px-4">
            <Button
              type="button"
              variant="fill"
              color="primary"
              size="sm"
              disabled={isSaving || saveDisabled}
              onClick={onSave}
            >
              {isSaving ? (
                <SpinnerIcon data-icon="inline-start" className="animate-spin" />
              ) : (
                <CheckIcon data-icon="inline-start" />
              )}
              Guardar
            </Button>
          </SheetFooter>
        )}
      </SheetContent>
    </Sheet>
  )
}

interface SupportFilesSectionProps {
  value: MatriculaSupportFiles
  onChange: (value: MatriculaSupportFiles) => void
  /** Claves de `MatriculaSupportFiles` obligatorias sin cargar. */
  invalidFields?: string[]
  fieldSettings?: MatriculaFieldSettingsMap
}

export function MatriculaSupportFilesSection({
  value,
  onChange,
  invalidFields = [],
  fieldSettings,
}: SupportFilesSectionProps) {
  const [open, setOpen] = useState(false)
  const visibleFields = SUPPORT_FILE_FIELDS.filter((field) => isFieldVisible(fieldSettings, field.fieldId))
  if (visibleFields.length === 0) return null

  return (
    <MatriculaFormSection title="Archivo de soporte" columns={2}>
      <div className="md:col-span-2">
        <FieldDescription>
          Por favor cargue los siguientes documentos requeridos para completar la inscripción del
          estudiante.
        </FieldDescription>
      </div>

      {visibleFields.map((field) => {
        const files = value[field.key]
        const required = isFieldRequired(fieldSettings, field.fieldId)
        const invalid = files.length === 0 && invalidFields.includes(field.key)
        return (
          <div key={field.key} className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between gap-2">
              <span className={invalid ? "font-semibold text-red" : "font-semibold text-foreground"}>
                {field.label}
                {required ? "*" : ""}
              </span>
              {(field.multiple || files.length === 0) && (
                <Tooltip>
                  <TooltipTrigger
                    render={
                      <Button
                        type="button"
                        variant="ghost"
                        color="primary"
                        size="icon-sm"
                        aria-label={`Adjuntar ${field.label}`}
                        onClick={() => setOpen(true)}
                      />
                    }
                  >
                    <PaperclipIcon />
                  </TooltipTrigger>
                  <TooltipContent>{`Adjuntar ${field.label}`}</TooltipContent>
                </Tooltip>
              )}
            </div>

            {files.length === 0 ? (
              <SupportFileEmptyRow invalid={invalid} />
            ) : (
              <div className="flex flex-col gap-2">
                {files.map((file) => (
                  <SupportFileRow key={fileKey(file)} file={file} />
                ))}
              </div>
            )}
          </div>
        )
      })}

      <SupportFilesSheet
        open={open}
        onOpenChange={setOpen}
        value={value}
        onChange={onChange}
        fieldSettings={fieldSettings}
      />
    </MatriculaFormSection>
  )
}
