import { campusesDb } from "@/mocks/db/campuses"
import { establishmentsRowsDb } from "@/mocks/db/establishments"
import { jornadasDb } from "@/mocks/db/academic-period/jornadas"

import type { CampusStatus } from "@/features/establishment/campuses/api/types/campus"

/**
 * Lo que el listado y el detalle de sedes necesitan además del `Campus` de
 * `campuses.ts` (que comparten otros mocks): establecimiento, consecutivo,
 * estado, jornadas y catálogo de especialidades. Mismo reparto de sedes entre
 * establecimientos que `/establecimientos/sedes/opciones`.
 */
export interface CampusMockDetail {
  establishmentId: number
  consecutive: string
  status: CampusStatus
  workScheduleIds: number[]
}

export interface CampusSpecialtyMock {
  id: number
  campusId: number
  specialtyId: number
  ownName: string | null
  status: CampusStatus
}

/** Lista general de especialidades con su carácter (TESPECIALIDAD), sin "No aplica". */
export const SPECIALTY_CATALOG = [
  { id: 2, nombre: "Académico", fk_caracter: 51876, caracter_nombre: "Académico", es_otra: false },
  { id: 7, nombre: "Agropecuario", fk_caracter: 51854, caracter_nombre: "Técnico", es_otra: false },
  { id: 5, nombre: "Comercial", fk_caracter: 51854, caracter_nombre: "Técnico", es_otra: false },
  { id: 3, nombre: "Industrial", fk_caracter: 51854, caracter_nombre: "Técnico", es_otra: false },
  { id: 8, nombre: "Promoción Social", fk_caracter: 51854, caracter_nombre: "Técnico", es_otra: false },
  { id: 4, nombre: "Otro", fk_caracter: 51854, caracter_nombre: "Técnico", es_otra: true },
  { id: 23, nombre: "Normalista", fk_caracter: 51911, caracter_nombre: "Normalista", es_otra: false },
]

/** Especialidades que "usan" asignaturas o matrículas en el mock: no se pueden eliminar. */
export const SPECIALTIES_IN_USE = new Set([5])

export const campusDetailsDb = new Map<number, CampusMockDetail>()
{
  const porEstablecimiento = new Map<number, number>()
  campusesDb.forEach((campus, index) => {
    const establishmentId = establishmentsRowsDb[index % establishmentsRowsDb.length]?.id ?? 0
    const consecutive = (porEstablecimiento.get(establishmentId) ?? 0) + 1
    porEstablecimiento.set(establishmentId, consecutive)
    campusDetailsDb.set(campus.id, {
      establishmentId,
      consecutive: String(consecutive),
      status: index === campusesDb.length - 1 ? "I" : "A",
      workScheduleIds: jornadasDb.slice(0, 1 + (index % jornadasDb.length)).map((j) => j.id),
    })
  })
}

export const campusSpecialtiesDb: CampusSpecialtyMock[] = campusesDb.slice(0, 2).flatMap((campus, index) => [
  { id: index * 10 + 1, campusId: campus.id, specialtyId: 2, ownName: null, status: "A" as const },
  { id: index * 10 + 2, campusId: campus.id, specialtyId: 5, ownName: null, status: "A" as const },
  { id: index * 10 + 3, campusId: campus.id, specialtyId: 4, ownName: "Turismo y hotelería", status: "A" as const },
])

let nextSpecialtyItemId = 100

export function takeNextSpecialtyItemId(): number {
  return nextSpecialtyItemId++
}
