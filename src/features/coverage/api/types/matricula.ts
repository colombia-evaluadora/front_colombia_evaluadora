import type { EducationLevel } from "@/features/coverage/api/types/reservation"


export type MatriculaStatus = string

export interface MatriculaCampusCatalog {
  campuses: string[]
}

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
  statuses?: string[]
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
  failedOtherDocuments: File[]
}

export interface MatriculaMutationResult {
  status: "ok" | "error"
  message: string
  matricula: Matricula | null
}

export interface MatriculaDetails extends CreateMatriculaInput {
  status: MatriculaStatus
  pkTpadre: number | null
  pkUsuarioEstudiante: number | null
  pkUsuarioAcudiente: number | null
}

export interface MatriculaFile {
  id: number
  archivoId: number
  name: string
  sizeBytes: number
  typeLabel: string
  uploadedAt: string
}

export interface MatriculaDetailResult {
  status: "ok" | "error"
  message: string
  matricula: Matricula | null
  details: MatriculaDetails | null
  files: MatriculaFile[]
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
  supportFile?: File | null
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
  /** Texto ya formateado (`fn_matricula_*_lote` devuelve el nombre del
   * grado, no el "valor" ordinal) -- se muestra tal cual, sin pasar por
   * `useMatriculaGradeLabel`. */
  fromGrade: string
  toGrade: string
  fromGroup: string
  toGroup: string
}

export interface BulkMatriculaChangeResult {
  status: "ok" | "error"
  message: string
  students: BulkMatriculaChangeStudentResult[]
}
