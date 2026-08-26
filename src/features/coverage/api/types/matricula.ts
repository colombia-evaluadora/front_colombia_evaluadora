import type { EducationLevel, Shift } from "@/features/coverage/api/types/reservation"
import type { MatriculaFieldSetting } from "@/features/coverage/utils/matricula-field-catalog"

// Estados del estudiante (ver resumen de reglas de transición): "cursando"
// es el único que puede pasar a "retirado" (y viceversa, "reingreso"). Los
// demás ("aprobado"/"reprobado"/"promovido"/"reubicado") son estados finales
// de fin de año o de cambio de grado — de momento no hay UI que los dispare,
// solo se modela el valor.
export type MatriculaStatus =
  | "cursando"
  | "aprobado"
  | "reprobado"
  | "promovido"
  | "reubicado"
  | "retirado"

/** Fila de la tabla de matrícula (columnas del listado). */
// ── Catálogos dependientes (Jornada por Sede+Grado, Grupo por Grado) ───────
// El mock (`mocks/handlers/matricula.ts`) devuelve datos ficticios pero
// deterministas — el contrato (request/response) ya queda listo para cuando
// exista el endpoint real de oferta académica por sede: solo hay que cambiar
// el handler, no el front.
export interface MatriculaDependentCatalogsRequest {
  campus?: string
  grade?: number
}

export interface MatriculaDependentCatalogsResponse {
  shifts: Shift[]
  groups: string[]
}

export interface Matricula {
  id: string
  /** Número de identificación del estudiante (columna "ID" de la tabla). */
  documentNumber: string
  firstName: string
  lastName: string
  institution: string
  campus: string
  shift: Shift
  educationLevel: EducationLevel
  /** 0 = transición … 11 = once. Se muestra como "3°". */
  grade: number
  group: string
  enrollmentDate: string
  /** Nombre completo del acudiente. */
  guardian: string
  status: MatriculaStatus
}

export interface MatriculaQueryFilters {
  search?: string
  statuses?: MatriculaStatus[]
}

export interface MatriculaQueryRequest {
  filters: MatriculaQueryFilters
  sorting: { id: string; desc: boolean }[]
  pageIndex: number
  pageSize: number
}

export interface MatriculaQueryResponse {
  rows: Matricula[]
  pageCount: number
  totalCount: number
}

export type ExportFormat = "pdf" | "excel"

export interface ExportResult {
  status: "ok" | "error"
  message: string
}

/**
 * Se arma cuando el backend detecta que el estudiante ya cursó el grado de
 * esta matrícula en otra sede y tiene calificaciones ahí — el alta pregunta
 * si esas notas se homologan a la sede nueva. `null` cuando no aplica (caso
 * normal, sin coincidencia).
 */
export interface MatriculaHomologationInfo {
  previousCampus: string
  previousInstitution: string
}

export interface CreateMatriculaResult {
  matricula: Matricula
  homologation: MatriculaHomologationInfo | null
}

export interface MatriculaMutationResult {
  status: "ok" | "error"
  message: string
  /** `null` cuando `status` es "error" (ej. el estudiante ya no existe). */
  matricula: Matricula | null
}

/**
 * Detalle completo de una matrícula ya guardada — la misma forma que
 * `CreateMatriculaInput`, más el `id` y el `status` (que el alta no pide,
 * pero "Ver"/"Editar" sí necesitan mostrar/cambiar).
 */
export interface MatriculaDetails extends CreateMatriculaInput {
  status: MatriculaStatus
}

export interface MatriculaDetailResult {
  status: "ok" | "error"
  message: string
  matricula: Matricula | null
  details: MatriculaDetails | null
}

// ── Alta de estudiante ("Agregar estudiante") ──────────────────────────────
// Formulario extenso (ficha de matrícula estilo SIMAT): se agrupa igual que
// `EstablishmentDetails`, una interfaz por sección de la pantalla.

export interface MatriculaDeptMunicipio {
  department: string
  municipality: string
}

export interface MatriculaResidence extends MatriculaDeptMunicipio {
  address: string
}

export interface MatriculaContact {
  phone: string
  email: string
}

export interface MatriculaAcademicInfo {
  campus: string
  shift: Shift | ""
  /** String para que el ComboboxField lo maneje igual que en el resto del
   * módulo; se castea a number recién al armar el `CreateMatriculaInput`. */
  grade: string
  group: string
  /** "" mientras no se elige — el alta lo deja así y el backend asume
   * "cursando"; edición/detalle sí lo traen resuelto. */
  status: MatriculaStatus | ""
  specialty: string
}

export interface MatriculaStudentInfo {
  documentType: string
  documentNumber: string
  firstName: string
  secondName: string
  lastName: string
  secondLastName: string
  documentExpedition: MatriculaDeptMunicipio
  birthDate: string
  birthPlace: MatriculaDeptMunicipio
  gender: string
  ethnicity: string
}

export interface MatriculaPreviousYearInfo {
  situation: string
  condition: string
  previousInstitution: string
  welfareInstitution: string
}

export interface MatriculaOriginSectorInfo {
  fromPrivateSector: string
  fromAnotherMunicipality: string
  whichMunicipality: string
}

export interface MatriculaConflictVictimInfo {
  population: string
  lastExpellingMunicipality: string
}

export interface MatriculaComplementaryInfo {
  socioeconomicStratum: string
  sisben: string
  eps: string
  ars: string
  specialConditions: string
  talent: string
}

export interface MatriculaBenefitsInfo {
  subsidized: string
  fundingSource: string
  headOfHouseholdStudent: string
  headOfHouseholdChildren: string
  publicForceVeteran: string
  nationalHeroes: string
}

export interface MatriculaGuardianInfo {
  relationship: string
  firstName: string
  secondName: string
  lastName: string
  secondLastName: string
  documentType: string
  documentNumber: string
  documentExpedition: MatriculaDeptMunicipio
}

export interface MatriculaGuardianEmploymentInfo {
  profession: string
  entityName: string
  entityAddress: string
  entityPhone: string
  entityPosition: string
}

export interface CreateMatriculaInput {
  academic: MatriculaAcademicInfo
  student: MatriculaStudentInfo
  studentAddress: MatriculaResidence
  studentContact: MatriculaContact
  previousYear: MatriculaPreviousYearInfo
  originSector: MatriculaOriginSectorInfo
  conflictVictim: MatriculaConflictVictimInfo
  complementary: MatriculaComplementaryInfo
  benefits: MatriculaBenefitsInfo
  guardian: MatriculaGuardianInfo
  guardianAddress: MatriculaResidence
  guardianContact: MatriculaContact
  guardianEmployment: MatriculaGuardianEmploymentInfo
}

// ── Configuración de parámetros requeridos ─────────────────────────────────
// Por campo (id del catálogo, ver `matricula-field-catalog.ts`): si el
// administrador institucional lo marcó visible y/o obligatorio en el
// formulario de matrícula.

export type MatriculaFieldConfigMap = Record<string, MatriculaFieldSetting>

export interface MatriculaFieldConfigResult {
  status: "ok" | "error"
  message: string
  fields: MatriculaFieldConfigMap
}

// ── Detección de matrícula activa por documento ────────────────────────────
// Se consulta desde el alta apenas el usuario termina de escribir el
// documento del estudiante (ver `add-matricula-page.tsx`): si ya hay una
// matrícula "cursando" con ese número, el alta se bloquea en vez de crear un
// duplicado.

export interface MatriculaDocumentCheckResult {
  exists: boolean
  matricula: Matricula | null
}
