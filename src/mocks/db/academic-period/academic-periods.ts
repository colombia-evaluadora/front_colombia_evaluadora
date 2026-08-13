import type {
  AcademicPeriod,
  AcademicPeriodConfig,
} from "@/features/establishment/academic-period/api/types/academic-period"

// Las sedes del modulo de periodo académico ahora son las mismas que
// `campusesDb` (modulo de establecimientos). Los periodos académicos y sus
// configs arrancan vacíos y se crean desde 0.
export { campusesDb as sedesLookup } from "@/mocks/db/campuses"

export const academicPeriodsDb: AcademicPeriod[] = []

export const academicPeriodConfigsDb: AcademicPeriodConfig[] = []
