import { faker } from "@faker-js/faker"
import type { AcademicPeriod } from "@/features/establishment/api/types/academic-period/academic-period"

const SEDES = [
  { id: 1, name: "I.E. JORGE GARCÍA LA SALLE BICENTENARIO" },
  { id: 2, name: "I.E. NUESTRA SEÑORA DE FÁTIMA" },
  { id: 3, name: "I.E. CLEMENTE MANUEL ZABALA" },
]

let nextId = 1

function createPeriod(
  sedeId: number,
  schoolYearId: number,
  overrides: Partial<AcademicPeriod> = {}
): AcademicPeriod {
  const sede = SEDES.find((s) => s.id === sedeId)!
  return {
    id: nextId++,
    sedeId,
    sedeName: sede.name,
    previousPeriodId: null,
    schoolYearId,
    status: "ACTIVO",
    startDate: `${schoolYearId}-02-01`,
    endDate: `${schoolYearId}-11-30`,
    enrollmentDeadline: `${schoolYearId - 1}-12-01`,
    minAbsences: 25,
    weeksCount: 40,
    minFailedSubjects: 3,
    name: `Año lectivo ${schoolYearId}`,
    isPrincipal: true,
    ...overrides,
  }
}

export const academicPeriodsDb: AcademicPeriod[] = [
  createPeriod(1, 2021, { startDate: "2020-02-02", endDate: "2020-11-25" }),
  createPeriod(2, 2022, { startDate: "2022-01-28", endDate: "2022-11-28" }),
  createPeriod(2, 2023, { startDate: "2023-02-03", endDate: "2023-12-03" }),
  createPeriod(3, 2023, { startDate: "2023-02-01", endDate: "2023-12-06" }),
]

export const sedesLookup = SEDES