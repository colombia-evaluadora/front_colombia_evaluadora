import { useState, type ReactNode } from "react"

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
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import {
  EyeIcon,
  FileDownloadOutlinedIcon,
  FilePdfIcon,
  FileTextIcon,
  FileXlsIcon,
  FolderOpenIcon,
  ImageIcon,
  PaperclipIcon,
  TrashIcon,
} from "@/components/ui/icons"
import { FileUpload, FileUploadTrigger } from "@/components/ui/file-upload"
import { FormSectionHeading } from "@/components/form-section-heading"

import { SHIFT_LABELS, formatGrade } from "@/features/coverage/api/ui-mappings"
import { formatDateValue, parseDateValue } from "@/lib/date-time-value"
import { MATRICULA_STATUSES } from "@/features/coverage/api/schema"
import {
  CONFLICT_VICTIM_POPULATION_OPTIONS,
  ETHNICITY_OPTIONS,
  FUNDING_SOURCE_OPTIONS,
  MATRICULA_STATUS_LABELS,
  PREVIOUS_YEAR_CONDITION_OPTIONS,
  PREVIOUS_YEAR_SITUATION_OPTIONS,
  SOCIOECONOMIC_STRATUM_OPTIONS,
  SPECIALTY_OPTIONS,
  SPECIAL_CONDITIONS_OPTIONS,
  TALENT_OPTIONS,
  YES_NO_OPTIONS,
} from "@/features/coverage/api/ui-mappings-matricula"
import { DOCUMENT_TYPE_OPTIONS, GENDER_OPTIONS, RELATIONSHIP_OPTIONS } from "@/features/coverage/api/ui-mappings"
import type {
  MatriculaAcademicInfo,
  MatriculaBenefitsInfo,
  MatriculaComplementaryInfo,
  MatriculaConflictVictimInfo,
  MatriculaContact,
  MatriculaDeptMunicipio,
  MatriculaGuardianEmploymentInfo,
  MatriculaGuardianInfo,
  MatriculaOriginSectorInfo,
  MatriculaPreviousYearInfo,
  MatriculaResidence,
  MatriculaStudentInfo,
} from "@/features/coverage/api/types/matricula"
import type { ReservationCatalogs } from "@/features/coverage/api/types/reservation"

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
  /** Rojo en el label y el borde del input — campo obligatorio sin llenar. */
  invalid?: boolean
  /** Sólo dígitos — filtra cualquier carácter no numérico al tipear/pegar. */
  numeric?: boolean
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
        onChange={(event) => {
          const nextValue = numeric ? event.target.value.replace(/\D/g, "") : event.target.value
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
}

/** Mismo `DatePicker` que usa Establecimiento, con el label flotante del resto de campos del alta. */
export function MatriculaDateField({ id, label, value, onChange, required, invalid }: DateFieldProps) {
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
  /** Etiquetas distintas del valor (ej. grado "5" → "5°"). Por defecto,
   * cada opción se muestra tal cual. */
  labelFor?: (option: string) => string
  /** Rojo en el label y el borde del combobox — campo obligatorio sin elegir. */
  invalid?: boolean
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
}: SelectFieldProps) {
  const items = Object.fromEntries(options.map((option) => [option, labelFor(option)]))
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
      <ComboboxField items={items} value={value} onValueChange={(next) => onChange(next ?? "")}>
        <ComboboxFieldTrigger id={id} size="sm" className="w-full" aria-invalid={invalid}>
          <ComboboxFieldValue placeholder={placeholder} />
        </ComboboxFieldTrigger>
        <ComboboxFieldContent>
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

export interface DepartmentOption {
  name: string
  municipalities: string[]
}

interface DeptMunicipioFieldsProps {
  idPrefix: string
  departmentLabel: string
  municipalityLabel: string
  value: MatriculaDeptMunicipio
  departments: DepartmentOption[]
  onChange: (value: MatriculaDeptMunicipio) => void
}

export function DeptMunicipioFields({
  idPrefix,
  departmentLabel,
  municipalityLabel,
  value,
  departments,
  onChange,
}: DeptMunicipioFieldsProps) {
  const municipalities = departments.find((d) => d.name === value.department)?.municipalities ?? []

  return (
    <>
      <MatriculaSelectField
        id={`${idPrefix}-department`}
        label={departmentLabel}
        value={value.department}
        options={departments.map((d) => d.name)}
        onChange={(department) => onChange({ department, municipality: "" })}
      />
      <MatriculaSelectField
        id={`${idPrefix}-municipality`}
        label={municipalityLabel}
        value={value.municipality}
        options={municipalities}
        onChange={(municipality) => onChange({ ...value, municipality })}
      />
    </>
  )
}

// ── Secciones ─────────────────────────────────────────────────────────────

interface AcademicSectionProps {
  value: MatriculaAcademicInfo
  onChange: (value: MatriculaAcademicInfo) => void
  catalogs?: ReservationCatalogs
  /** Ids de campos obligatorios sin llenar (ver `validateMatricula`). */
  invalidFields?: string[]
  /** El alta no lo pide — toda matrícula nueva arranca "activo" — así que
   * solo se muestra en detalle/edición. */
  showStatus?: boolean
}

export function MatriculaAcademicSection({
  value,
  onChange,
  catalogs,
  invalidFields = [],
  showStatus = true,
}: AcademicSectionProps) {
  return (
    <MatriculaFormSection title="Información de matrícula">
      <MatriculaSelectField
        id="matricula-campus"
        label="Sede"
        required
        value={value.campus}
        options={catalogs?.campuses ?? []}
        invalid={invalidFields.includes("matricula-campus")}
        onChange={(campus) => onChange({ ...value, campus })}
      />
      <MatriculaSelectField
        id="matricula-shift"
        label="Jornada"
        required
        value={SHIFT_LABELS[value.shift as keyof typeof SHIFT_LABELS] ?? ""}
        options={Object.values(SHIFT_LABELS)}
        invalid={invalidFields.includes("matricula-shift")}
        onChange={(label) => {
          const entry = Object.entries(SHIFT_LABELS).find(([, l]) => l === label)
          onChange({ ...value, shift: (entry?.[0] as MatriculaAcademicInfo["shift"]) ?? "" })
        }}
      />
      <MatriculaSelectField
        id="matricula-grade"
        label="Grado"
        required
        value={value.grade}
        options={(catalogs?.grades ?? []).map((grade) => String(grade))}
        labelFor={(option) => formatGrade(Number(option))}
        invalid={invalidFields.includes("matricula-grade")}
        onChange={(grade) => onChange({ ...value, grade })}
      />
      <MatriculaSelectField
        id="matricula-group"
        label="Grupo"
        required
        value={value.group}
        options={catalogs?.groups ?? []}
        invalid={invalidFields.includes("matricula-group")}
        onChange={(group) => onChange({ ...value, group })}
      />
      {showStatus && (
        <MatriculaSelectField
          id="matricula-status"
          label="Estado de la matrícula"
          value={value.status ? MATRICULA_STATUS_LABELS[value.status] : ""}
          options={MATRICULA_STATUSES.map((status) => MATRICULA_STATUS_LABELS[status])}
          onChange={(label) => {
            const entry = MATRICULA_STATUSES.find((status) => MATRICULA_STATUS_LABELS[status] === label)
            onChange({ ...value, status: entry ?? "" })
          }}
        />
      )}
      <MatriculaSelectField
        id="matricula-specialty"
        label="Carácter/Especialidad/Énfasis"
        value={value.specialty}
        options={SPECIALTY_OPTIONS}
        onChange={(specialty) => onChange({ ...value, specialty })}
      />
    </MatriculaFormSection>
  )
}

interface StudentSectionProps {
  value: MatriculaStudentInfo
  onChange: (value: MatriculaStudentInfo) => void
  departments: DepartmentOption[]
  invalidFields?: string[]
}

export function MatriculaStudentSection({
  value,
  onChange,
  departments,
  invalidFields = [],
}: StudentSectionProps) {
  return (
    <MatriculaFormSection title="Información del estudiante">
      <MatriculaSelectField
        id="student-document-type"
        label="Tipo de documento del estudiante"
        required
        value={value.documentType}
        options={DOCUMENT_TYPE_OPTIONS}
        invalid={invalidFields.includes("student-document-type")}
        onChange={(documentType) => onChange({ ...value, documentType })}
      />
      <MatriculaTextField
        id="student-document-number"
        label="Documento estudiante"
        invalid={invalidFields.includes("student-document-number")}
        value={value.documentNumber}
        numeric
        onChange={(documentNumber) => onChange({ ...value, documentNumber })}
      />
      <MatriculaTextField
        id="student-first-name"
        label="Nombre del estudiante"
        invalid={invalidFields.includes("student-first-name")}
        value={value.firstName}
        onChange={(firstName) => onChange({ ...value, firstName })}
      />
      <MatriculaTextField
        id="student-second-name"
        label="Segundo nombre del estudiante"
        value={value.secondName}
        onChange={(secondName) => onChange({ ...value, secondName })}
      />
      <MatriculaTextField
        id="student-last-name"
        label="Primer apellido del estudiante"
        invalid={invalidFields.includes("student-last-name")}
        value={value.lastName}
        onChange={(lastName) => onChange({ ...value, lastName })}
      />
      <MatriculaTextField
        id="student-second-last-name"
        label="Segundo apellido del estudiante"
        value={value.secondLastName}
        onChange={(secondLastName) => onChange({ ...value, secondLastName })}
      />
      <DeptMunicipioFields
        idPrefix="student-document-expedition"
        departmentLabel="Lugar expedición documento estudiante departamento"
        municipalityLabel="Lugar expedición documento estudiante municipio"
        value={value.documentExpedition}
        departments={departments}
        onChange={(documentExpedition) => onChange({ ...value, documentExpedition })}
      />
      <MatriculaDateField
        id="student-birth-date"
        label="Fecha de nacimiento"
        value={value.birthDate}
        onChange={(birthDate) => onChange({ ...value, birthDate })}
      />
      <DeptMunicipioFields
        idPrefix="student-birth-place"
        departmentLabel="Lugar de nacimiento departamento"
        municipalityLabel="Lugar de nacimiento municipio"
        value={value.birthPlace}
        departments={departments}
        onChange={(birthPlace) => onChange({ ...value, birthPlace })}
      />
      <MatriculaSelectField
        id="student-gender"
        label="Género del estudiante"
        required
        value={value.gender}
        options={GENDER_OPTIONS}
        invalid={invalidFields.includes("student-gender")}
        onChange={(gender) => onChange({ ...value, gender })}
      />
      <MatriculaSelectField
        id="student-ethnicity"
        label="Etnia/Resguardo"
        value={value.ethnicity}
        options={ETHNICITY_OPTIONS}
        onChange={(ethnicity) => onChange({ ...value, ethnicity })}
      />
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
}: ResidenceSectionProps) {
  return (
    <MatriculaFormSection title={title}>
      <MatriculaTextField
        id={`${idPrefix}-address`}
        label={addressLabel}
        value={value.address}
        onChange={(address) => onChange({ ...value, address })}
      />
      <DeptMunicipioFields
        idPrefix={idPrefix}
        departmentLabel={departmentLabel}
        municipalityLabel={municipalityLabel}
        value={value}
        departments={departments}
        onChange={(location) => onChange({ ...value, ...location })}
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
}

export function MatriculaContactSection({
  title,
  idPrefix,
  phoneLabel,
  emailLabel,
  value,
  onChange,
  invalidFields = [],
}: ContactSectionProps) {
  return (
    <MatriculaFormSection title={title}>
      <MatriculaTextField
        id={`${idPrefix}-phone`}
        label={phoneLabel}
        type="tel"
        value={value.phone}
        numeric
        onChange={(phone) => onChange({ ...value, phone })}
      />
      <MatriculaTextField
        id={`${idPrefix}-email`}
        label={emailLabel}
        type="email"
        value={value.email}
        invalid={invalidFields.includes(`${idPrefix}-email`)}
        onChange={(email) => onChange({ ...value, email })}
      />
    </MatriculaFormSection>
  )
}

interface PreviousYearSectionProps {
  value: MatriculaPreviousYearInfo
  onChange: (value: MatriculaPreviousYearInfo) => void
}

export function MatriculaPreviousYearSection({ value, onChange }: PreviousYearSectionProps) {
  return (
    <MatriculaFormSection title="Información académica del año anterior">
      <MatriculaSelectField
        id="previous-year-situation"
        label="Situación del año anterior"
        value={value.situation}
        options={PREVIOUS_YEAR_SITUATION_OPTIONS}
        onChange={(situation) => onChange({ ...value, situation })}
      />
      <MatriculaSelectField
        id="previous-year-condition"
        label="Condición del estudiante fin del año anterior"
        value={value.condition}
        options={PREVIOUS_YEAR_CONDITION_OPTIONS}
        onChange={(condition) => onChange({ ...value, condition })}
      />
      <MatriculaTextField
        id="previous-institution"
        label="Nombre de la institución anterior"
        value={value.previousInstitution}
        onChange={(previousInstitution) => onChange({ ...value, previousInstitution })}
      />
      <MatriculaTextField
        id="welfare-institution"
        label="Institución bienestar de origen"
        value={value.welfareInstitution}
        onChange={(welfareInstitution) => onChange({ ...value, welfareInstitution })}
      />
    </MatriculaFormSection>
  )
}

interface OriginSectorSectionProps {
  value: MatriculaOriginSectorInfo
  onChange: (value: MatriculaOriginSectorInfo) => void
}

export function MatriculaOriginSectorSection({ value, onChange }: OriginSectorSectionProps) {
  return (
    <MatriculaFormSection title="Sector de origen">
      <MatriculaSelectField
        id="origin-private-sector"
        label="Proviene del sector privado"
        value={value.fromPrivateSector}
        options={YES_NO_OPTIONS}
        onChange={(fromPrivateSector) => onChange({ ...value, fromPrivateSector })}
      />
      <MatriculaSelectField
        id="origin-another-municipality"
        label="Proviene de otro municipio"
        value={value.fromAnotherMunicipality}
        options={YES_NO_OPTIONS}
        onChange={(fromAnotherMunicipality) => onChange({ ...value, fromAnotherMunicipality })}
      />
      <MatriculaTextField
        id="origin-which-municipality"
        label="¿Cuál?"
        value={value.whichMunicipality}
        onChange={(whichMunicipality) => onChange({ ...value, whichMunicipality })}
      />
    </MatriculaFormSection>
  )
}

interface ConflictVictimSectionProps {
  value: MatriculaConflictVictimInfo
  onChange: (value: MatriculaConflictVictimInfo) => void
}

export function MatriculaConflictVictimSection({ value, onChange }: ConflictVictimSectionProps) {
  return (
    <MatriculaFormSection title="Víctima conflicto armado">
      <MatriculaSelectField
        id="conflict-victim-population"
        label="Población víctima conflicto"
        value={value.population}
        options={CONFLICT_VICTIM_POPULATION_OPTIONS}
        onChange={(population) => onChange({ ...value, population })}
      />
      <MatriculaTextField
        id="conflict-last-expelling-municipality"
        label="Último municipio expulsor"
        value={value.lastExpellingMunicipality}
        onChange={(lastExpellingMunicipality) => onChange({ ...value, lastExpellingMunicipality })}
      />
    </MatriculaFormSection>
  )
}

interface ComplementarySectionProps {
  value: MatriculaComplementaryInfo
  onChange: (value: MatriculaComplementaryInfo) => void
}

export function MatriculaComplementarySection({ value, onChange }: ComplementarySectionProps) {
  return (
    <MatriculaFormSection title="Información complementaria">
      <MatriculaSelectField
        id="complementary-stratum"
        label="Estrato socio económico del estudiante"
        value={value.socioeconomicStratum}
        options={SOCIOECONOMIC_STRATUM_OPTIONS}
        onChange={(socioeconomicStratum) => onChange({ ...value, socioeconomicStratum })}
      />
      <MatriculaTextField
        id="complementary-sisben"
        label="Sisbén"
        value={value.sisben}
        onChange={(sisben) => onChange({ ...value, sisben })}
      />
      <MatriculaTextField
        id="complementary-eps"
        label="EPS"
        value={value.eps}
        onChange={(eps) => onChange({ ...value, eps })}
      />
      <MatriculaTextField
        id="complementary-ars"
        label="ARS"
        value={value.ars}
        onChange={(ars) => onChange({ ...value, ars })}
      />
      <MatriculaSelectField
        id="complementary-special-conditions"
        label="Condiciones especiales del estudiante"
        value={value.specialConditions}
        options={SPECIAL_CONDITIONS_OPTIONS}
        onChange={(specialConditions) => onChange({ ...value, specialConditions })}
      />
      <MatriculaSelectField
        id="complementary-talent"
        label="Talento del estudiante"
        value={value.talent}
        options={TALENT_OPTIONS}
        onChange={(talent) => onChange({ ...value, talent })}
      />
    </MatriculaFormSection>
  )
}

interface BenefitsSectionProps {
  value: MatriculaBenefitsInfo
  onChange: (value: MatriculaBenefitsInfo) => void
}

export function MatriculaBenefitsSection({ value, onChange }: BenefitsSectionProps) {
  return (
    <MatriculaFormSection title="Subsidio o beneficios">
      <MatriculaTextField
        id="benefits-subsidized"
        label="Subsidiado"
        value={value.subsidized}
        onChange={(subsidized) => onChange({ ...value, subsidized })}
      />
      <MatriculaSelectField
        id="benefits-funding-source"
        label="Fuente de recursos"
        value={value.fundingSource}
        options={FUNDING_SOURCE_OPTIONS}
        onChange={(fundingSource) => onChange({ ...value, fundingSource })}
      />
      <MatriculaSelectField
        id="benefits-head-household-student"
        label="Alumnos madre cabeza de familia"
        value={value.headOfHouseholdStudent}
        options={YES_NO_OPTIONS}
        onChange={(headOfHouseholdStudent) => onChange({ ...value, headOfHouseholdStudent })}
      />
      <MatriculaSelectField
        id="benefits-head-household-children"
        label="Hijos de madre cabeza de familia"
        value={value.headOfHouseholdChildren}
        options={YES_NO_OPTIONS}
        onChange={(headOfHouseholdChildren) => onChange({ ...value, headOfHouseholdChildren })}
      />
      <MatriculaSelectField
        id="benefits-public-force-veteran"
        label="Veteranos de la fuerza pública"
        value={value.publicForceVeteran}
        options={YES_NO_OPTIONS}
        onChange={(publicForceVeteran) => onChange({ ...value, publicForceVeteran })}
      />
      <MatriculaSelectField
        id="benefits-national-heroes"
        label="Héroes de la nación"
        value={value.nationalHeroes}
        options={YES_NO_OPTIONS}
        onChange={(nationalHeroes) => onChange({ ...value, nationalHeroes })}
      />
    </MatriculaFormSection>
  )
}

interface GuardianSectionProps {
  value: MatriculaGuardianInfo
  onChange: (value: MatriculaGuardianInfo) => void
  departments: DepartmentOption[]
  invalidFields?: string[]
}

export function MatriculaGuardianSection({
  value,
  onChange,
  departments,
  invalidFields = [],
}: GuardianSectionProps) {
  return (
    <MatriculaFormSection title="Información del acudiente">
      <MatriculaSelectField
        id="guardian-relationship"
        label="Parentesco"
        required
        value={value.relationship}
        options={RELATIONSHIP_OPTIONS}
        invalid={invalidFields.includes("guardian-relationship")}
        onChange={(relationship) => onChange({ ...value, relationship })}
      />
      <MatriculaTextField
        id="guardian-first-name"
        label="Nombre del acudiente"
        value={value.firstName}
        onChange={(firstName) => onChange({ ...value, firstName })}
      />
      <MatriculaTextField
        id="guardian-second-name"
        label="Segundo nombre del acudiente"
        value={value.secondName}
        onChange={(secondName) => onChange({ ...value, secondName })}
      />
      <MatriculaTextField
        id="guardian-last-name"
        label="Primer apellido del acudiente"
        value={value.lastName}
        onChange={(lastName) => onChange({ ...value, lastName })}
      />
      <MatriculaTextField
        id="guardian-second-last-name"
        label="Segundo apellido del acudiente"
        value={value.secondLastName}
        onChange={(secondLastName) => onChange({ ...value, secondLastName })}
      />
      <MatriculaSelectField
        id="guardian-document-type"
        label="Tipo de documento del acudiente"
        required
        value={value.documentType}
        options={DOCUMENT_TYPE_OPTIONS}
        invalid={invalidFields.includes("guardian-document-type")}
        onChange={(documentType) => onChange({ ...value, documentType })}
      />
      <MatriculaTextField
        id="guardian-document-number"
        label="Documento acudiente"
        value={value.documentNumber}
        numeric
        onChange={(documentNumber) => onChange({ ...value, documentNumber })}
      />
      <DeptMunicipioFields
        idPrefix="guardian-document-expedition"
        departmentLabel="Lugar expedición documento acudiente departamento"
        municipalityLabel="Lugar expedición documento acudiente municipio"
        value={value.documentExpedition}
        departments={departments}
        onChange={(documentExpedition) => onChange({ ...value, documentExpedition })}
      />
    </MatriculaFormSection>
  )
}

interface GuardianEmploymentSectionProps {
  value: MatriculaGuardianEmploymentInfo
  onChange: (value: MatriculaGuardianEmploymentInfo) => void
}

export function MatriculaGuardianEmploymentSection({ value, onChange }: GuardianEmploymentSectionProps) {
  return (
    <MatriculaFormSection title="Información laboral del acudiente">
      <MatriculaTextField
        id="guardian-employment-profession"
        label="Profesión acudiente"
        value={value.profession}
        onChange={(profession) => onChange({ ...value, profession })}
      />
      <MatriculaTextField
        id="guardian-employment-entity-name"
        label="Nombre de la entidad acudiente"
        value={value.entityName}
        onChange={(entityName) => onChange({ ...value, entityName })}
      />
      <MatriculaTextField
        id="guardian-employment-entity-address"
        label="Dirección de la entidad acudiente"
        value={value.entityAddress}
        onChange={(entityAddress) => onChange({ ...value, entityAddress })}
      />
      <MatriculaTextField
        id="guardian-employment-entity-phone"
        label="Teléfono de la entidad acudiente"
        type="tel"
        value={value.entityPhone}
        numeric
        onChange={(entityPhone) => onChange({ ...value, entityPhone })}
      />
      <MatriculaTextField
        id="guardian-employment-entity-position"
        label="Cargo entidad acudiente"
        value={value.entityPosition}
        onChange={(entityPosition) => onChange({ ...value, entityPosition })}
      />
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
  label: string
  required?: boolean
  multiple?: boolean
}

const SUPPORT_FILE_FIELDS: SupportFileFieldConfig[] = [
  { key: "studentIdDocument", label: "Documento de identidad del estudiante", required: true },
  { key: "previousYearCertificate", label: "Certificado de estudios del año anterior", required: true },
  { key: "medicalCertificate", label: "Certificado médico del estudiante" },
  { key: "studentPhoto", label: "Foto del estudiante" },
  { key: "otherDocuments", label: "Otros documentos relevantes", multiple: true },
]

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
        <Button
          type="button"
          variant="ghost"
          color="neutral"
          size="icon-sm"
          aria-label={`Ver ${file.name}`}
          onClick={() => previewFile(file)}
        >
          <EyeIcon />
        </Button>
        {showDownload && (
          <Button
            type="button"
            variant="ghost"
            color="neutral"
            size="icon-sm"
            aria-label={`Descargar ${file.name}`}
            onClick={() => downloadFile(file)}
          >
            <FileDownloadOutlinedIcon />
          </Button>
        )}
        {onRemove && (
          <Button
            type="button"
            variant="ghost"
            color="neutral"
            size="icon-sm"
            aria-label={`Eliminar ${file.name}`}
            onClick={() => onRemove(file)}
          >
            <TrashIcon />
          </Button>
        )}
      </span>
    </div>
  )
}

interface SupportFilesSheetFieldProps {
  config: SupportFileFieldConfig
  value: File[]
  onChange: (files: File[]) => void
}

function SupportFilesSheetField({ config, value, onChange }: SupportFilesSheetFieldProps) {
  function removeFile(file: File) {
    onChange(value.filter((f) => f !== file))
  }

  return (
    <FileUpload value={value} onValueChange={onChange} multiple={config.multiple} className="gap-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-semibold text-foreground">
          {config.label}
          {config.required ? "*" : ""}
        </span>
        {(config.multiple || value.length === 0) && (
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
          >
            <PaperclipIcon />
          </FileUploadTrigger>
        )}
      </div>

      {value.length === 0 ? (
        <SupportFileEmptyRow />
      ) : (
        <div className="flex flex-col gap-2">
          {value.map((file) => (
            <SupportFileRow key={fileKey(file)} file={file} onRemove={removeFile} showDownload />
          ))}
        </div>
      )}
    </FileUpload>
  )
}

interface SupportFilesSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  value: MatriculaSupportFiles
  onChange: (value: MatriculaSupportFiles) => void
}

export function SupportFilesSheet({ open, onOpenChange, value, onChange }: SupportFilesSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full gap-0 data-[side=right]:sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>Archivos de soporte</SheetTitle>
          <SheetDescription>
            Por favor cargue los siguientes documentos requeridos para completar la inscripción del
            estudiante.
          </SheetDescription>
        </SheetHeader>
        <div className="flex flex-col gap-5 overflow-y-auto px-8 pb-8">
          {SUPPORT_FILE_FIELDS.map((field) => (
            <SupportFilesSheetField
              key={field.key}
              config={field}
              value={value[field.key]}
              onChange={(files) => onChange({ ...value, [field.key]: files })}
            />
          ))}
        </div>
      </SheetContent>
    </Sheet>
  )
}

interface SupportFilesSectionProps {
  value: MatriculaSupportFiles
  onChange: (value: MatriculaSupportFiles) => void
  /** Claves de `MatriculaSupportFiles` obligatorias sin cargar. */
  invalidFields?: string[]
}

export function MatriculaSupportFilesSection({
  value,
  onChange,
  invalidFields = [],
}: SupportFilesSectionProps) {
  const [open, setOpen] = useState(false)

  return (
    <MatriculaFormSection title="Archivo de soporte" columns={2}>
      <div className="md:col-span-2">
        <FieldDescription>
          Por favor cargue los siguientes documentos requeridos para completar la inscripción del
          estudiante.
        </FieldDescription>
      </div>

      {SUPPORT_FILE_FIELDS.map((field) => {
        const files = value[field.key]
        const invalid = files.length === 0 && invalidFields.includes(field.key)
        return (
          <div key={field.key} className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between gap-2">
              <span className={invalid ? "font-semibold text-red" : "font-semibold text-foreground"}>
                {field.label}
                {field.required ? "*" : ""}
              </span>
              {(field.multiple || files.length === 0) && (
                <Button
                  type="button"
                  variant="ghost"
                  color="primary"
                  size="icon-sm"
                  aria-label={`Adjuntar ${field.label}`}
                  onClick={() => setOpen(true)}
                >
                  <PaperclipIcon />
                </Button>
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

      <SupportFilesSheet open={open} onOpenChange={setOpen} value={value} onChange={onChange} />
    </MatriculaFormSection>
  )
}
