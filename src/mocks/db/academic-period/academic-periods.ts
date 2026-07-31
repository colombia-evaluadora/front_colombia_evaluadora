import type {
  AcademicPeriod,
  AcademicPeriodConfig,
} from "@/features/establishment/academic-period/api/types/academic-period"

// Mínimo: las 3 sedes del colegio con sus docentes (los `sedeId` de
// `teachersDb` referencian estos ids). Periodos académicos y configs
// arrancan vacíos y se crean desde 0.
export const sedesLookup = [
  { id: 1, name: "I.E. JORGE GARCÍA LA SALLE BICENTENARIO" },
  { id: 2, name: "I.E. NUESTRA SEÑORA DE FÁTIMA" },
  { id: 3, name: "I.E. CLEMENTE MANUEL ZABALA" },
]

export const academicPeriodsDb: AcademicPeriod[] = []

export const academicPeriodConfigsDb: AcademicPeriodConfig[] = []
