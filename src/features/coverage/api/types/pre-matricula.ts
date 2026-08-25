import type { ReservationsQueryFilters } from "@/features/coverage/api/types/reservation"

export type PreMatriculaStatus = "sin_cupo" | "con_cupo" | "pendiente"

export interface PreMatricula {
  id: string

  // ── Datos del estudiante ────────────────────────────────────────────────────
  /** Tipo de documento (e.g. "CC Cédula de Ciudadanía", "TI Tarjeta de Identidad"). */
  documentType: string
  documentNumber: string
  firstName: string
  secondName: string
  lastName: string
  secondLastName: string
  birthDate: string
  gender: string
  email: string
  phone: string
  residence: string
  address: string
  /** Grado actual del estudiante (0 = transición … 11 = once). */
  grade: number
  /** true si el estudiante está reprobado: repite el grado actual. */
  failed: boolean
  /** Grado al que aspira (grade + 1). Puede ser null si ya está en grado 11. */
  targetGrade: number | null
  /** true = hay cupo disponible en la sede para targetGrade. */
  hasSlot: boolean
  status: PreMatriculaStatus
  /** Grupo actual del estudiante (e.g. "01", "02"). */
  group: string

  // ── Datos de la institución educativa de origen ─────────────────────────────
  campus: string
  institution: string
  shift: string
  educationLevel: string

  // ── Datos del acudiente ──────────────────────────────────────────────────────
  guardianDocumentType: string
  guardianDocumentNumber: string
  guardianFirstName: string
  guardianSecondName: string
  guardianLastName: string
  guardianSecondLastName: string
  guardianLivesWithStudent: boolean
  guardianRelationship: string
  guardianEmail: string
  guardianPhone: string
  guardianAddress: string
}

export interface PreMatriculaQueryRequest {
  filters: ReservationsQueryFilters
  sorting: { id: string; desc: boolean }[]
  pageIndex: number
  pageSize: number
}

export interface PreMatriculaQueryResponse {
  rows: PreMatricula[]
  pageCount: number
  totalCount: number
}

/** Grupos disponibles por sede para un grado dado. */
export interface PreMatriculaGroupsByCampus {
  campus: string
  groups: string[]
}

/** Parámetros para consultar catálogos del dialog de asignar cupo. */
export interface PreMatriculaCatalogsRequest {
  /** Grado al que se va a asignar (targetGrade). */
  targetGrade: number
  /** IDs de los registros seleccionados para acotar las sedes. */
  ids: string[]
}

export type PreMatriculaCatalogsResponse = PreMatriculaGroupsByCampus[]
