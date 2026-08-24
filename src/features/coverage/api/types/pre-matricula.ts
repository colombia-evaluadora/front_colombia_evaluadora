import type { ReservationsQueryFilters } from "@/features/coverage/api/types/reservation"

export type PreMatriculaStatus = "sin_cupo" | "con_cupo" | "pendiente"

export interface PreMatricula {
  id: string
  documentNumber: string
  firstName: string
  lastName: string
  campus: string
  /** Grado actual del estudiante (0 = transición … 11 = once). */
  grade: number
  /** true si el estudiante está reprobado: repite el grado actual. */
  failed: boolean
  /** Grado al que aspira (grade + 1). Puede ser null si ya está en grado 11. */
  targetGrade: number | null
  /** true = hay cupo disponible en la sede para targetGrade. */
  hasSlot: boolean
  status: PreMatriculaStatus
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
