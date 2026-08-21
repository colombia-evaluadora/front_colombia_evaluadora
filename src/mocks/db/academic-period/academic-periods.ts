import type {
  AcademicPeriod,
  AcademicPeriodConfig,
} from "@/features/establishment/academic-period/api/types/academic-period"
import { campusesDb } from "@/mocks/db/campuses"
import { academicPeriodStatusesDb } from "@/mocks/db/academic-period/academic-period-statuses"
import { jornadasDb } from "@/mocks/db/academic-period/jornadas"

// Las sedes del modulo de periodo académico ahora son las mismas que
// `campusesDb` (modulo de establecimientos).
export { campusesDb as sedesLookup } from "@/mocks/db/campuses"

/**
 * Periodos sembrados.
 *
 * Antes esto arrancaba vacío y todo se creaba desde la UI. El problema es que
 * la base del mock vive en memoria: cada recarga dura la reinicia, así que la
 * lista volvía a quedar vacía y con ella todo lo que cuelga de un periodo
 * —periodos de evaluación, grados, grupos, plan de asignaturas, escalas,
 * criterios, horarios, asignaciones— quedaba inalcanzable sin volver a crear
 * un periodo a mano. Con estas filas la pantalla de configuración se puede
 * abrir de entrada, igual que ya pasaba con establecimientos, sedes,
 * funcionarios y auditoría (todos sembrados).
 *
 * Los ids arrancan en 1 y son consecutivos; el alta usa `max(id) + 1`, así que
 * no chocan. Las colecciones hijas siguen vacías a propósito: se llenan desde
 * la propia pantalla de configuración, que es el flujo que se quiere probar.
 */
function seedPeriod(
  id: number,
  sedeIndex: number,
  schoolYearId: number,
  statusId: number,
  startDate: string,
  endDate: string,
  enrollmentDeadline: string,
): AcademicPeriod {
  const sede = campusesDb[sedeIndex % campusesDb.length]
  const status = academicPeriodStatusesDb.find((item) => item.id === statusId)!
  return {
    id,
    sedeId: String(sede.id),
    sedeName: sede.name,
    previousPeriodId: null,
    schoolYearId,
    status: status.key,
    statusId: status.id,
    statusName: status.label,
    startDate,
    endDate,
    enrollmentDeadline,
    minAbsences: null,
    weeksCount: null,
    minFailedSubjects: null,
    name: `Año lectivo ${schoolYearId}`,
    isPrincipal: true,
  }
}

export const academicPeriodsDb: AcademicPeriod[] = [
  seedPeriod(1, 0, 2026, 1, "2026-01-26", "2026-11-27", "2026-02-27"),
  seedPeriod(2, 1, 2026, 3, "2026-02-02", "2026-12-04", "2026-03-06"),
  seedPeriod(3, 2, 2025, 2, "2025-01-27", "2025-11-28", "2025-02-28"),
]

function seedConfig(
  academicPeriodId: number,
  jornadaId: number,
  scheduleStartTime: string,
  scheduleEndTime: string,
): AcademicPeriodConfig {
  return {
    academicPeriodId,
    jornadaId: jornadasDb.find((item) => item.id === jornadaId)!.id,
    reservationEnabled: true,
    defaultBlocksCount: 6,
    scheduleStartTime,
    scheduleEndTime,
    // Un solo descanso: alcanza para que el editor de descansos arranque con
    // algo que mostrar sin volver el horario difícil de leer.
    breaks: [{ startTime: "09:30", endTime: "10:00" }],
  }
}

export const academicPeriodConfigsDb: AcademicPeriodConfig[] = [
  seedConfig(1, 1, "06:30", "12:30"),
  seedConfig(2, 2, "12:30", "18:30"),
  seedConfig(3, 1, "06:30", "12:30"),
]
