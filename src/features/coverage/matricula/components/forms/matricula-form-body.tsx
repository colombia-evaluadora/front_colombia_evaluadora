import type { ReactNode } from "react"

import { MatriculaMaskedContext, MatriculaPrecargaContext, MatriculaSectionDisabledContext } from "@/features/coverage/matricula/components/forms/form-create-matricula/fields"
import type { CreateMatriculaInput, MatriculaCampusCatalog } from "@/features/coverage/matricula/api/types/matricula"
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
} from "@/features/coverage/matricula/components/forms/form-create-matricula"
import type { MatriculaFieldSettingsMap } from "@/features/coverage/matricula/utils/matricula-field-settings"

interface MatriculaFormBodyProps {
  values: CreateMatriculaInput
  onChange: (values: CreateMatriculaInput) => void
  catalogs?: MatriculaCampusCatalog
  departments: DepartmentOption[]
  invalidFields?: string[]
  disabled?: boolean
  showStatus?: boolean
  fieldSettings?: MatriculaFieldSettingsMap
  academicDisabled?: boolean
  /** Editar: la identidad del estudiante se corrige aparte (Regla 43). */
  studentIdentityDisabled?: boolean
  /** Editar: acudiente ya registrado, identidad protegida (bloque 2.10, Regla 19). */
  guardianIdentityDisabled?: boolean
  /** Alta: el documento es de un estudiante ya registrado (Regla 8). */
  studentIdentidadExistente?: boolean
  tipoMatricula?: string
  especialidadBloqueo?: string
  /**
   * Datos del estudiante (2.2 a 2.9) protegidos: enmascarados y en solo lectura.
   * Sin la autorización de datos (Regla 81) o, en el que recibe, por adscripción (Regla 8).
   */
  datosProtegidos?: boolean
  /** Alta por traslado: grado de origen obligatorio (AGR.2). */
  gradoTraslado?: { valor: string; nombre: string } | null
  /** Reemplaza la sección 1 (Asignar grupo de una reserva: sede, jornada y grado fijos). */
  academicSection?: ReactNode
  /** Asignar grupo: las secciones 2 a 13 llevan la etiqueta «Precargado». */
  precargado?: boolean
  /** Asignar grupo: la sección 2 (estudiante) completa en solo lectura. */
  studentDisabled?: boolean
  /** Avisos dentro de los bloques 1 (matrícula) y 2 (estudiante). */
  avisoMatricula?: ReactNode
  avisoEstudiante?: ReactNode
}


export function MatriculaFormBody({
  values,
  onChange,
  catalogs,
  departments,
  invalidFields = [],
  disabled = false,
  showStatus = true,
  fieldSettings,
  academicDisabled,
  studentIdentityDisabled,
  guardianIdentityDisabled,
  studentIdentidadExistente,
  tipoMatricula,
  especialidadBloqueo,
  datosProtegidos = false,
  gradoTraslado,
  academicSection,
  precargado = false,
  studentDisabled = false,
  avisoMatricula,
  avisoEstudiante,
}: MatriculaFormBodyProps) {
  return (
    <MatriculaSectionDisabledContext.Provider value={disabled}>
      {academicSection ?? (
      <MatriculaAcademicSection
        value={values.academic}
        onChange={(academic) => onChange({ ...values, academic })}
        catalogs={catalogs}
        invalidFields={invalidFields}
        showStatus={showStatus}
        fieldSettings={fieldSettings}
        academicDisabled={academicDisabled}
        tipoMatricula={tipoMatricula}
        especialidadBloqueo={especialidadBloqueo}
        gradoTraslado={gradoTraslado}
        aviso={avisoMatricula}
      />
      )}

      <MatriculaPrecargaContext.Provider value={precargado}>

      <MatriculaMaskedContext.Provider value={datosProtegidos}>
      <MatriculaSectionDisabledContext.Provider value={disabled || datosProtegidos}>
      <MatriculaSectionDisabledContext.Provider value={disabled || datosProtegidos || studentDisabled}>
      <MatriculaStudentSection
        value={values.student}
        onChange={(student) => onChange({ ...values, student })}
        departments={departments}
        invalidFields={invalidFields}
        fieldSettings={fieldSettings}
        identityDisabled={studentIdentityDisabled}
        identidadExistente={studentIdentidadExistente}
        aviso={avisoEstudiante}
      />
      </MatriculaSectionDisabledContext.Provider>

      <MatriculaResidenceSection
        title="Domicilio del estudiante"
        addressLabel="Dirección del estudiante"
        neighborhoodLabel="Barrio del estudiante"
        locationLabel="Ubicación del domicilio"
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

      </MatriculaSectionDisabledContext.Provider>
      </MatriculaMaskedContext.Provider>

      <MatriculaGuardianSection
        value={values.guardian}
        onChange={(guardian) => onChange({ ...values, guardian })}
        identityDisabled={guardianIdentityDisabled}
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
      </MatriculaPrecargaContext.Provider>
    </MatriculaSectionDisabledContext.Provider>
  )
}
