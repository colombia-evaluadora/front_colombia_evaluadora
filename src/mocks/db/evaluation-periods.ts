import type { EvaluationPeriod } from "@/features/establishment/api/types/academic-period/evaluation-period"

let nextId = 1

function createEvaluation(
  schoolYearId: number,
  overrides: Partial<EvaluationPeriod> = {}
): EvaluationPeriod {
  return {
    codigo: nextId++,
    nombre: "",
    abreviacion: "",
    startDate: `${schoolYearId}-02-01`,
    endDate: `${schoolYearId}-11-30`,
    peso: 25,
    estado: "Cargado",
    ...overrides,
  }
}

export const evaluationPeriodsDb: EvaluationPeriod[] = [
  createEvaluation(2025, {
    codigo: 18,
    nombre: "Periodos de evaluación 1",
    abreviacion: "PE1",
    startDate: "2025-02-01",
    endDate: "2025-03-30",
    peso: 10,
    estado: "No iniciado",
  }),
  createEvaluation(2025, {
    codigo: 53,
    nombre: "Periodos de evaluación 2",
    abreviacion: "PE2",
    startDate: "2025-04-01",
    endDate: "2025-05-10",
    peso: 25,
    estado: "Cargado",
  }),
  createEvaluation(2025, {
    codigo: 27,
    nombre: "Periodos de evaluación 3",
    abreviacion: "PE3",
    startDate: "2025-07-01",
    endDate: "2025-08-30",
    peso: 25,
    estado: "En curso",
  }),
  createEvaluation(2025, {
    codigo: 92,
    nombre: "Periodos de evaluación 4",
    abreviacion: "PE4",
    startDate: "2025-08-01",
    endDate: "2025-09-25",
    peso: 15,
    estado: "Habilitado",
  }),
]