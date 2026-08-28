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

// ── Catálogos dependientes (Sede → Jornada → Grado → Grupo) ────────────────
// El mock (`mocks/handlers/matricula.ts`) devuelve datos ficticios pero
// deterministas — el contrato (request/response) ya queda listo para cuando
// exista el endpoint real de oferta académica por sede: solo hay que cambiar
// el handler, no el front.
//
// "shift"/"shifts" acá NO es el `Shift` de reservas/cupos (enum fijo de 5
// jornadas) — matrícula toma las jornadas ACTIVAS de la sede elegida
// (`GET /eval-col/sedes/jornadas-activas`, `fn_jornadas_activas_por_sede`,
// mismo endpoint real que ya usa "Permisos de funcionario" — ver
// `use-matricula-dependent-catalogs-query.ts`), que no tiene un conjunto
// fijo de valores. Por eso viaja como string libre (el `nombre` de la
// jornada), no como un enum — ver `docs/matricula-listado-endpoint-contract.md`.
export interface MatriculaDependentCatalogsRequest {
  campus?: string
  shift?: string
  grade?: number
}

export interface MatriculaDependentCatalogsResponse {
  shifts: string[]
  grades: number[]
  groups: string[]
}

/** Fila de la tabla de matrícula (columnas del listado). */
export interface Matricula {
  id: string
  /** Número de identificación del estudiante (columna "ID" de la tabla). */
  documentNumber: string
  firstName: string
  lastName: string
  institution: string
  campus: string
  /** Jornada — nombre tal como lo devuelve el catálogo de `TLISTA_VALOR`
   * (ver comentario de `MatriculaDependentCatalogsRequest` arriba). */
  shift: string
  educationLevel: EducationLevel
  /** 0 = transición … 11 = once. Se muestra como "3°". */
  grade: number
  group: string
  enrollmentDate: string
  /** Nombre completo del acudiente. */
  guardian: string
  status: MatriculaStatus
  /** Si tiene calificaciones registradas en el grupo/grado actual — define
   * si el "Cambio de matrícula masivo" pregunta qué hacer con ellas. */
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
  shift: string
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

// ── Configuración de parámetros de matrícula (CU-86e2z8aff) ────────────────
// Espejo de lo que devuelve `fn_matricula_config_obtener` (`GET /eval-col/
// matricula/configuracion`, ver colección Postman "SSO — configuración de
// matrícula"): ya viene agrupado por sección y en el orden de la UI (13
// secciones) — el catálogo de campos lo define el backend, el front ya no
// tiene uno propio (`matricula-field-catalog.ts` quedó solo para el mock).

export interface MatriculaConfigCampo {
  /** Id real del campo — se manda tal cual en `PUT .../campo/:fkCampo`. */
  fkCampo: number
  nombre: string
  /** `false` ⇒ los dos toggles quedan deshabilitados y fijos en
   * `true/true` — es uno de los campos obligatorios de la ficha (columna
   * destino `NOT NULL`), no algo que el administrador pueda decidir. */
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

/** Body de `PUT .../campo/:fkCampo` — los dos son opcionales pero hay que
 * mandar al menos uno; el que se omite no se toca. */
export interface MatriculaConfigCampoPatch {
  requerido?: boolean
  visible?: boolean
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

// ── Cambio de matrícula masivo (E01HU33) ───────────────────────────────────
// Sede/Grado/Grupo son cambios independientes que se detectan por los
// campos que el usuario llenó en "Modificar" — no hay un selector de "tipo
// de cambio" (ver `dialog-modificar-matricula.tsx`). `gradeChange` solo
// viaja si el Grado cambió; `groupChange` solo si el Grupo cambió.

/** "reubicacion" solo es válido cuando el nuevo grado es inferior al de
 * origen; "promocion" cuando es superior. Ambas requieren que todos los
 * seleccionados compartan el mismo grado de origen — si no, la única opción
 * válida es "correccion" (ver `dialog-cambio-grado-matricula.tsx`). */
export type BulkGradeChangeSubKind = "promocion" | "correccion" | "reubicacion"

/** "eliminar" solo aplica al pasar a un grado inferior. */
export type BulkGradesAction = "trasladar" | "noTrasladar" | "eliminar"

export interface BulkGradeChange {
  subKind: BulkGradeChangeSubKind
  reason?: string
  hasSupport?: boolean
  gradesAction: BulkGradesAction
}

/** Cómo queda clasificado el movimiento en el historial: "cambioGrado"
 * cuando el grupo va de la mano de un cambio de grado ya confirmado (o el
 * usuario lo marca así igual); "correccion" cuando es un ajuste de grupo
 * solo, sin cambio de grado. Lo elige el usuario en
 * `dialog-cambio-grupo-matricula.tsx` — no se infiere solo.
 *
 * El cambio de grupo no pregunta por calificaciones (a diferencia del
 * cambio de grado) — un grupo nuevo dentro del mismo grado no las afecta. */
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
