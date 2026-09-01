import type { CreateMatriculaInput, MatriculaCampusCatalog } from "@/features/coverage/api/types/matricula"
import {
  MatriculaAcademicSection,
  MatriculaBenefitsSection,
  MatriculaComplementarySection,
  MatriculaConflictVictimSection,
  MatriculaContactSection,
  MatriculaGuardianEmploymentSection,
  MatriculaGuardianSection,
  MatriculaOriginSectorSection,
  MatriculaPreviousYearSection,
  MatriculaResidenceSection,
  MatriculaStudentSection,
  type DepartmentOption,
} from "@/features/coverage/components/forms/form-create-matricula"
import type { MatriculaFieldSettingsMap } from "@/features/coverage/utils/matricula-field-settings"

interface MatriculaFormBodyProps {
  values: CreateMatriculaInput
  onChange: (values: CreateMatriculaInput) => void
  catalogs?: MatriculaCampusCatalog
  departments: DepartmentOption[]
  invalidFields?: string[]
  /** "Ver" usa esto para que ningún campo se pueda tocar — un `<fieldset
   * disabled>` nativo apaga inputs y botones (los `ComboboxFieldTrigger`
   * son `<button>`) sin tener que pasar `disabled` a cada sección. */
  disabled?: boolean
  /** El alta no lo pide (toda matrícula nueva arranca "cursando"); detalle y
   * edición sí lo muestran. */
  showStatus?: boolean
  /** Visibilidad/obligatoriedad por campo — sale de "Configuración de
   * parámetros requeridos" (`buildMatriculaFieldSettings`). Sin cargar
   * (`undefined`) todo se ve y nada es obligatorio extra, para no ocultar
   * campos de golpe mientras la config todavía está en vuelo. */
  fieldSettings?: MatriculaFieldSettingsMap
}

/**
 * Todas las secciones del alta MENOS "Archivo de soporte" — se usa tal cual
 * en el alta (con los archivos aparte, debajo) y en detalle/edición (donde
 * los archivos se gestionan desde el botón "Archivos" de la barra superior,
 * no inline).
 */
export function MatriculaFormBody({
  values,
  onChange,
  catalogs,
  departments,
  invalidFields = [],
  disabled = false,
  showStatus = true,
  fieldSettings,
}: MatriculaFormBodyProps) {
  return (
    <fieldset disabled={disabled} className="contents border-0 p-0 m-0 min-w-0">
      <MatriculaAcademicSection
        value={values.academic}
        onChange={(academic) => onChange({ ...values, academic })}
        catalogs={catalogs}
        invalidFields={invalidFields}
        showStatus={showStatus}
        fieldSettings={fieldSettings}
      />

      <MatriculaStudentSection
        value={values.student}
        onChange={(student) => onChange({ ...values, student })}
        departments={departments}
        invalidFields={invalidFields}
        fieldSettings={fieldSettings}
      />

      <MatriculaResidenceSection
        title="Domicilio del estudiante"
        addressLabel="Dirección del estudiante"
        departmentLabel="Lugar de residencia departamento estudiante"
        municipalityLabel="Lugar de residencia municipio estudiante"
        idPrefix="student-residence"
        value={values.studentAddress}
        onChange={(studentAddress) => onChange({ ...values, studentAddress })}
        departments={departments}
        invalidFields={invalidFields}
        fieldSettings={fieldSettings}
      />

      <MatriculaContactSection
        title="Información de contacto del estudiante"
        idPrefix="student-contact"
        phoneLabel="Teléfono de estudiante"
        emailLabel="Email estudiante"
        value={values.studentContact}
        onChange={(studentContact) => onChange({ ...values, studentContact })}
        invalidFields={invalidFields}
        fieldSettings={fieldSettings}
      />

      <MatriculaPreviousYearSection
        value={values.previousYear}
        onChange={(previousYear) => onChange({ ...values, previousYear })}
        invalidFields={invalidFields}
        fieldSettings={fieldSettings}
      />

      <MatriculaOriginSectorSection
        value={values.originSector}
        onChange={(originSector) => onChange({ ...values, originSector })}
        invalidFields={invalidFields}
        fieldSettings={fieldSettings}
      />

      <MatriculaConflictVictimSection
        value={values.conflictVictim}
        departments={departments}
        onChange={(conflictVictim) => onChange({ ...values, conflictVictim })}
        invalidFields={invalidFields}
        fieldSettings={fieldSettings}
      />

      <MatriculaComplementarySection
        value={values.complementary}
        onChange={(complementary) => onChange({ ...values, complementary })}
        invalidFields={invalidFields}
        fieldSettings={fieldSettings}
      />

      <MatriculaBenefitsSection
        value={values.benefits}
        onChange={(benefits) => onChange({ ...values, benefits })}
        invalidFields={invalidFields}
        fieldSettings={fieldSettings}
      />

      <MatriculaGuardianSection
        value={values.guardian}
        onChange={(guardian) => onChange({ ...values, guardian })}
        departments={departments}
        invalidFields={invalidFields}
        fieldSettings={fieldSettings}
      />

      <MatriculaResidenceSection
        title="Domicilio del acudiente"
        addressLabel="Dirección de acudiente"
        departmentLabel="Lugar de residencia departamento acudiente"
        municipalityLabel="Lugar de residencia municipio acudiente"
        idPrefix="guardian-residence"
        value={values.guardianAddress}
        onChange={(guardianAddress) => onChange({ ...values, guardianAddress })}
        departments={departments}
        invalidFields={invalidFields}
        fieldSettings={fieldSettings}
      />

      <MatriculaContactSection
        title="Información de contacto de acudiente"
        idPrefix="guardian-contact"
        phoneLabel="Teléfono de acudiente"
        emailLabel="Email acudiente"
        value={values.guardianContact}
        onChange={(guardianContact) => onChange({ ...values, guardianContact })}
        invalidFields={invalidFields}
        fieldSettings={fieldSettings}
      />

      <MatriculaGuardianEmploymentSection
        value={values.guardianEmployment}
        onChange={(guardianEmployment) => onChange({ ...values, guardianEmployment })}
        invalidFields={invalidFields}
        fieldSettings={fieldSettings}
      />
    </fieldset>
  )
}
