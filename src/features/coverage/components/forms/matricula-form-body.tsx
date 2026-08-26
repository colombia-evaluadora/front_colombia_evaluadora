import type { CreateMatriculaInput } from "@/features/coverage/api/types/matricula"
import type { ReservationCatalogs } from "@/features/coverage/api/types/reservation"
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

interface MatriculaFormBodyProps {
  values: CreateMatriculaInput
  onChange: (values: CreateMatriculaInput) => void
  catalogs?: ReservationCatalogs
  departments: DepartmentOption[]
  invalidFields?: string[]
  /** "Ver" usa esto para que ningún campo se pueda tocar — un `<fieldset
   * disabled>` nativo apaga inputs y botones (los `ComboboxFieldTrigger`
   * son `<button>`) sin tener que pasar `disabled` a cada sección. */
  disabled?: boolean
  /** El alta no lo pide (toda matrícula nueva arranca "activo"); detalle y
   * edición sí lo muestran. */
  showStatus?: boolean
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
}: MatriculaFormBodyProps) {
  return (
    <fieldset disabled={disabled} className="contents border-0 p-0 m-0 min-w-0">
      <MatriculaAcademicSection
        value={values.academic}
        onChange={(academic) => onChange({ ...values, academic })}
        catalogs={catalogs}
        invalidFields={invalidFields}
        showStatus={showStatus}
      />

      <MatriculaStudentSection
        value={values.student}
        onChange={(student) => onChange({ ...values, student })}
        departments={departments}
        invalidFields={invalidFields}
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
      />

      <MatriculaContactSection
        title="Información de contacto del estudiante"
        idPrefix="student-contact"
        phoneLabel="Teléfono de estudiante"
        emailLabel="Email estudiante"
        value={values.studentContact}
        onChange={(studentContact) => onChange({ ...values, studentContact })}
        invalidFields={invalidFields}
      />

      <MatriculaPreviousYearSection
        value={values.previousYear}
        onChange={(previousYear) => onChange({ ...values, previousYear })}
      />

      <MatriculaOriginSectorSection
        value={values.originSector}
        onChange={(originSector) => onChange({ ...values, originSector })}
      />

      <MatriculaConflictVictimSection
        value={values.conflictVictim}
        onChange={(conflictVictim) => onChange({ ...values, conflictVictim })}
      />

      <MatriculaComplementarySection
        value={values.complementary}
        onChange={(complementary) => onChange({ ...values, complementary })}
      />

      <MatriculaBenefitsSection
        value={values.benefits}
        onChange={(benefits) => onChange({ ...values, benefits })}
      />

      <MatriculaGuardianSection
        value={values.guardian}
        onChange={(guardian) => onChange({ ...values, guardian })}
        departments={departments}
        invalidFields={invalidFields}
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
      />

      <MatriculaContactSection
        title="Información de contacto de acudiente"
        idPrefix="guardian-contact"
        phoneLabel="Teléfono de acudiente"
        emailLabel="Email acudiente"
        value={values.guardianContact}
        onChange={(guardianContact) => onChange({ ...values, guardianContact })}
        invalidFields={invalidFields}
      />

      <MatriculaGuardianEmploymentSection
        value={values.guardianEmployment}
        onChange={(guardianEmployment) => onChange({ ...values, guardianEmployment })}
      />
    </fieldset>
  )
}
