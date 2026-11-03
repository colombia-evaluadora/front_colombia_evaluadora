import { useQuery } from "@tanstack/react-query"

import { evalCol } from "@/lib/eval-col-client"
import { campusKeys } from "@/features/establishment/campuses/api/query-keys"

/** Fila de `fn_sed_procesos_en_curso` (sso V448). */
interface CampusProcessesRow {
  inscripciones: number
  reservas: number
  periodos_abiertos: number
  periodos_inscripciones: number
}

export interface CampusProcesses {
  inscriptions: number
  reservations: number
  openPeriods: number
  enrollmentPeriods: number
}

/** Lo que la sede tiene en curso: se advierte antes de moverla o convertirla (Reglas 75 y 92). */
export async function fetchCampusProcesses(campusId: number): Promise<CampusProcesses> {
  const [row] = await evalCol.getRows<CampusProcessesRow>(`/establecimientos/sedes/${campusId}/procesos-en-curso`)
  return {
    inscriptions: Number(row?.inscripciones ?? 0),
    reservations: Number(row?.reservas ?? 0),
    openPeriods: Number(row?.periodos_abiertos ?? 0),
    enrollmentPeriods: Number(row?.periodos_inscripciones ?? 0),
  }
}

export function useCampusProcessesQuery(campusId: number | null, enabled = true) {
  return useQuery({
    queryKey: campusKeys.procesos(campusId),
    queryFn: () => fetchCampusProcesses(campusId as number),
    enabled: enabled && campusId != null,
    // Cambia con cada inscripción o período: se pide al abrir la advertencia.
    staleTime: 0,
  })
}

const plural = (n: number, singular: string, plural: string) => `${n} ${n === 1 ? singular : plural}`

/**
 * "12 inscripciones y 1 período académico abierto", o `null` si no hay nada en
 * curso. Es el texto de la advertencia del informe (3.1, Procesos en curso).
 */
export function describeCampusProcesses(processes: CampusProcesses | undefined): string | null {
  if (!processes) return null
  const parts = [
    processes.inscriptions > 0 ? plural(processes.inscriptions, "inscripción", "inscripciones") : null,
    processes.reservations > 0 ? plural(processes.reservations, "reserva de cupo", "reservas de cupo") : null,
    processes.openPeriods > 0
      ? plural(processes.openPeriods, "período académico abierto", "períodos académicos abiertos")
      : null,
    processes.enrollmentPeriods > 0
      ? plural(processes.enrollmentPeriods, "período académico en inscripciones", "períodos académicos en inscripciones")
      : null,
  ].filter((part): part is string => part != null)
  if (parts.length === 0) return null
  return parts.length === 1 ? parts[0] : `${parts.slice(0, -1).join(", ")} y ${parts.at(-1)}`
}
