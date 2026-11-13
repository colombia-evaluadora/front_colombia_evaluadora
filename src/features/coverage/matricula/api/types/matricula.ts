import type { EducationLevel } from "@/features/coverage/reservations/api/types/reservation"


export type MatriculaStatus = string

export interface MatriculaCampusCatalog {
  /** Solo nombres: lo que piden los filtros del listado, que filtran por
   *  nombre en el backend. Para elegir una sede usar `sedes`. */
  campuses: string[]
  sedes: MatriculaSedeOption[]
}

/** Una sede elegible: el valor del select es `id`, nunca el nombre, porque
 *  dos colegios del mismo usuario pueden tener una "Sede principal". */
export interface MatriculaSedeOption {
  /** `pk_sede` como texto, que es lo que guarda el formulario. */
  id: string
  nombre: string
  /** El nombre, más el colegio si el usuario tiene sedes en varios. */
  label: string
  establecimientoId: number
  /** Una sede Inactiva no recibe matrículas nuevas (Regla 100); sus matrículas siguen visibles. */
  activa: boolean
}

export interface MatriculaDependentCatalogsRequest {
  /** La sede por id; si no viene, se busca por `campus` (nombre). */
  campusId?: string
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
  /** Solo la trae el listado (fn_situacion_edad, sección 3.7.2). */
  ageSituation?: AgeSituation
  /** Retiro pedido por otro establecimiento (Regla 71): bloquea los cambios académicos. */
  retiroSolicitado?: boolean
  /** Destino que debe anular tras «Cerrar sin retiro» (Regla 71): mismas restricciones. */
  anulacionPendiente?: boolean
  /** Traslado con snapshot sin homologar (Sección 4.5). */
  snapshotPendiente?: boolean
}

/** VALOR de la lista SITUACION_EDAD. */
export type AgeSituation = "EN_EDAD" | "PREEXTRAEDAD" | "EXTRAEDAD" | "BAJA_EDAD" | "SIN_CALCULAR"

export interface MatriculaQueryFilters {
  search?: string
  statuses?: string[]
  campus?: string
  shift?: string
  grade?: number
  group?: string
  periodo?: number
  tipo?: "PRINCIPAL" | "COMPLEMENTARIA"
  metodologia?: number
  solicitud?: "CON_SOLICITUD"
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
  /** El bloque 15 se guarda después del alta; si falla, la matrícula ya existe. */
  asignaturasError?: string
}

export interface MatriculaMutationResult {
  status: "ok" | "error"
  message: string
  matricula: Matricula | null
}

export interface MatriculaDetails extends CreateMatriculaInput {
  /** La sede exacta de la matrícula: de ella sale el colegio cuya
   *  configuración de campos aplica (el nombre puede repetirse). */
  sedeId?: number | null
  status: MatriculaStatus
  pkTpadre: number | null
  pkUsuarioEstudiante: number | null
  pkUsuarioAcudiente: number | null
  /** Lo que deja un campo en solo lectura en Editar (C.1.EDI). */
  restricciones?: MatriculaRestricciones
}

export interface MatriculaRestricciones {
  tipo: "PRINCIPAL" | "COMPLEMENTARIA"
  /** Con complementaria la especialidad se cambia desde ella (Sección 2.16). */
  tieneComplementaria: boolean
  /** Con una postulación Registrado se cambia con Cambiar cupo (Sección 2.16.2). */
  postulacionRegistrada: boolean
  /** Establecimiento que pidió el retiro (Regla 71); bloquea los cambios académicos. */
  retiroSolicitadoPor: string | null
  /** Destino con la matrícula por anular tras «Cerrar sin retiro»: mismas restricciones. */
  anulacionPendiente: boolean
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
  /** Solo el domicilio del estudiante (prototipo C.1.AGR): BARRIO_DEL_ESTUDIANTE
   *  va a TUSUARIO.BARRIO_RESIDENCIA y GEOREFERENCIACION a TESTUDIANTE. */
  neighborhood?: string
  /** "latitud,longitud", como la ubicación de una sede. */
  location?: string
}

export interface MatriculaContact {
  phone: string
  email: string
}

export interface MatriculaAcademicInfo {
  /** El nombre de la sede, para mostrarlo. */
  campus: string
  /** La sede elegida (`pk_sede`): es la que se usa para resolver jornadas,
   *  grupos y guardar. Opcional solo porque datos viejos traen el nombre. */
  campusId?: string
  shift: string
  grade: string
  group: string
  status: MatriculaStatus | ""
  specialty: string
  /** ¿Media técnica en institución externa? (Regla 41). */
  mediaTecnicaExterna?: boolean
  institucionExterna?: string
  /** Periodo Académico elegido (modalidad y ciclo); sin él se resuelve el vigente. */
  periodoId?: string
  /** Lista INTERNADO (SIMAT): No, Semi interno o Residente. */
  internado?: string
}

/** Fila del bloque 15: una asignatura del plan de estudio del grado. */
export interface MatriculaAsignatura {
  id: number
  nombre: string
  obligatoria: boolean
  matriculada: boolean
  externa: boolean
  /** Con notas o definitivas: no se desmatricula ni cambia "externa". */
  tieneRegistros: boolean
}

/** Lo que la persona cambió sobre el plan, por id de asignatura. */
export type MatriculaAsignaturasCambios = Record<number, { matriculada: boolean; externa: boolean }>

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
  /** Lista PAIS; vacío = Colombia. Obligatorio con documento de extranjero. */
  paisOrigen?: string
  lenguaMaterna?: string
  /** Solo si el país no es Colombia. */
  condicionMigratoria?: string
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
  apoyoAcademico?: string
  /** Solo con diagnóstico del sector salud (soporte: certificado médico). */
  trastorno?: string
  /** Dato sensible (Regla 77). */
  srpa?: string
  /** yyyy-MM-dd; obligatoria si el SRPA no es «No aplica». */
  srpaInicio?: string
  srpaFin?: string
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
  /** Bloque 15: cambios sobre el plan; se guardan con PUT /matricula/:ID/asignaturas. */
  asignaturas?: MatriculaAsignaturasCambios
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
