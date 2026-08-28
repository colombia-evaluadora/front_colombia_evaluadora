import { useQuery } from "@tanstack/react-query"

import { api } from "@/lib/api-client"
import { fetchSelectCategory } from "@/features/establishment/academic-period/api/query/fetch-select-category"
import { fetchSedeOptions } from "@/features/establishment/academic-period/api/query/use-sede-options"
import type { ReservationCatalogs } from "@/features/coverage/api/types/reservation"

interface ReservationBaseCatalogs {
  institutions: string[]
  groups: string[]
}

// `institutions`/`groups` todavía no tienen endpoint real (ver comentario de
// `fetchCampuses` abajo) — este `/coverage/reservations/catalogs` solo
// responde bajo MSW. Si falla (backend real sin ese path → 404) no puede
// tumbar todo el combo: `campuses`/`grades` sí tienen endpoint real y no
// deberían perderse porque este pedazo mockeado no existe todavía.
async function fetchReservationBaseCatalogs(): Promise<ReservationBaseCatalogs> {
  try {
    return await api.get("/coverage/reservations/catalogs")
  } catch {
    return { institutions: [], groups: [] }
  }
}

/**
 * Grado sale del catálogo real `GRADOS` de `TLISTA_VALOR` (`GET /eval-col/
 * select/GRADOS`, mismo que ya usa `use-grados-catalog.ts` en Períodos
 * Académicos) — `VALOR` es el que matchea el orden real (0 = transición).
 */
async function fetchGrades(): Promise<number[]> {
  const rows = await fetchSelectCategory("GRADOS")
  return rows
    .map((row) => Number(row.valor))
    .filter((value) => !Number.isNaN(value))
    .sort((a, b) => a - b)
}

/**
 * Sede sale de `GET /eval-col/establecimientos/sedes/opciones` — el rector
 * (o secretaria/jefe de sistema) tiene un endpoint propio que lista las
 * sedes de SU establecimiento, sin parámetro (igual que la config de
 * matrícula). Institutions/groups todavía no tienen equivalente real, así
 * que se quedan en el mock compuesto de abajo.
 */
async function fetchCampuses(): Promise<string[]> {
  const sedes = await fetchSedeOptions()
  return sedes.map((sede) => sede.nombre)
}

// Los catálogos (instituciones, sedes, grupos, grados) alimentan los selects
// del sheet de filtros y del formulario de alta. Cambian poco, así que
// quedan cacheados largo.
async function fetchReservationCatalogs(): Promise<ReservationCatalogs> {
  const [base, campuses, grades] = await Promise.all([
    fetchReservationBaseCatalogs(),
    fetchCampuses(),
    fetchGrades(),
  ])
  return { ...base, campuses, grades }
}

export function useReservationCatalogsQuery() {
  return useQuery({
    queryKey: ["reservations", "catalogs"],
    queryFn: fetchReservationCatalogs,
    staleTime: 5 * 60 * 1000,
  })
}
