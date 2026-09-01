import type { EducationLevel } from "@/features/coverage/api/types/reservation"

// Estados reales de `ESTADO_MATRICULA` (TLISTA_VALOR) — confirmado contra
// BD real (V200, `fn_matricula_listar`, 2026-08-27). El backend NO manda un
// id — arma un slug directo de `TLISTA_VALOR.NOMBRE` (minúsculas, tildes
// fuera, espacios a "_"), así que estos valores son exactamente ese slug, no
// un mapeo inventado por el front. Si el catálogo real agrega un estado
// nuevo, aparece con su propio slug sin que el backend tenga que tocar
// `fn_matricula_listar` — pero el front sí necesita agregarlo acá para que
// tipe. No existe "Reubicado" (el front lo tenía inventado) — el
// equivalente real de "promovido" es "Promovido Anticipadamente".
//
// "cursando" es el único que puede pasar a "retirado" (y viceversa,
// "reingreso") — el resto son estados finales de fin de año o de cambio de
// grado, de momento sin UI propia que los dispare.
export type MatriculaStatus =
  | "cursando"
  | "aprobado"
  | "reprobado"
  | "retirado"
  | "graduado"
  | "promovido_anticipadamente"
  | "trasladado"
  | "sin_definir"
  | "desertor"
  | "esperando_aprobacion"
  | "rechazado"

export interface MatriculaDependentCatalogsRequest {
  campus?: string
  shift?: string
  grade?: number
}

export interface MatriculaGradoOption {
  valor: number
  nombre: string
}

export interface MatriculaGrupoOption {
  id: number
  codigo: string
}

export interface MatriculaDependentCatalogsResponse {
  shifts: string[]
  grades: MatriculaGradoOption[]
  groups: MatriculaGrupoOption[]
}

export interface Matricula {
  id: string
  documentNumber: string
  firstName: string
  lastName: string
  institution: string
  campus: string
  shift: string
  educationLevel: EducationLevel
  grade: number
  group: string
  enrollmentDate: string
  guardian: string
  status: MatriculaStatus
  hasGrades: boolean
}

export interface MatriculaQueryFilters {
  search?: string
  statuses?: MatriculaStatus[]
  campus?: string
  shift?: string
  grade?: number
  group?: string
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
  matricula: Matricula | null
}

export interface MatriculaDetails extends CreateMatriculaInput {
  status: MatriculaStatus
}

export interface MatriculaDetailResult {
  status: "ok" | "error"
  message: string
  matricula: Matricula | null
  details: MatriculaDetails | null
}


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
  shift: string
  grade: string
  group: string
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
  gender: string
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

export interface MatriculaConfigCampo {
  fkCampo: number
  nombre: string
  editable: boolean
  requerido: boolean
  visible: boolean
}

export interface MatriculaConfigSeccion {
  seccion: string
  campos: MatriculaConfigCampo[]
}

export interface MatriculaFieldConfig {
  fkEstablecimiento: number
  establecimiento: string
  pkMatriculaConfig: number
  secciones: MatriculaConfigSeccion[]
}

export interface MatriculaConfigCampoPatch {
  requerido?: boolean
  visible?: boolean
}


export interface MatriculaDocumentCheckResult {
  exists: boolean
  matricula: Matricula | null
}

export type BulkGradeChangeSubKind = "promocion" | "correccion" | "reubicacion"

/** "eliminar" solo aplica al pasar a un grado inferior. */
export type BulkGradesAction = "trasladar" | "noTrasladar" | "eliminar"

export interface BulkGradeChange {
  subKind: BulkGradeChangeSubKind
  reason?: string
  hasSupport?: boolean
  gradesAction: BulkGradesAction
}

export type BulkGroupChangeClassification = "cambioGrado" | "correccion"

export interface BulkGroupChange {
  classification: BulkGroupChangeClassification
}

export interface BulkMatriculaChangeRequest {
  ids: string[]
  campus?: string
  shift?: string
  grade?: number
  group?: string
  gradeChange?: BulkGradeChange
  groupChange?: BulkGroupChange
}

export interface BulkMatriculaChangeStudentResult {
  id: string
  name: string
  fromCampus: string
  toCampus: string
  fromGrade: number
  toGrade: number
  fromGroup: string
  toGroup: string
}

export interface BulkMatriculaChangeResult {
  status: "ok" | "error"
  message: string
  students: BulkMatriculaChangeStudentResult[]
}
