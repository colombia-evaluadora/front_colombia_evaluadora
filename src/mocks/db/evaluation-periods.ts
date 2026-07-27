import type { EvaluationPeriodRecord } from "@/features/establishment/api/types/academic-period/evaluation-period"

let nextId = 1

function createEvaluation(
  academicPeriodId: number,
  overrides: Partial<EvaluationPeriodRecord> = {}
): EvaluationPeriodRecord {
  return {
    codigo: nextId++,
    academicPeriodId,
    nombre: "",
    abreviacion: "",
    startDate: "2025-02-01",
    endDate: "2025-11-30",
    peso: 25,
    estado: "Calificable",
    ...overrides,
  }
}

export const evaluationPeriodsDb: EvaluationPeriodRecord[] = [
  createEvaluation(1, {
    codigo: 18,
    nombre: "Periodos de evaluación 1",
    abreviacion: "PE1",
    startDate: "2025-02-01",
    endDate: "2025-03-30",
    peso: 10,
    estado: "NO Calificable",
  }),
  createEvaluation(1, {
    codigo: 53,
    nombre: "Periodos de evaluación 2",
    abreviacion: "PE2",
    startDate: "2025-04-01",
    endDate: "2025-05-10",
    peso: 25,
    estado: "En Recuperaciones",
  }),
  createEvaluation(2, {
    codigo: 27,
    nombre: "Bimestre I",
    abreviacion: "BIM1",
    startDate: "2025-01-28",
    endDate: "2025-04-30",
    peso: 50,
    estado: "En Recuperaciones",
  }),
  createEvaluation(2, {
    codigo: 92,
    nombre: "Bimestre II",
    abreviacion: "BIM2",
    startDate: "2025-05-01",
    endDate: "2025-08-30",
    peso: 50,
    estado: "Calificable",
  }),
  createEvaluation(3, {
    codigo: 120,
    nombre: "Trimestre único",
    abreviacion: "TRI",
    startDate: "2025-02-03",
    endDate: "2025-12-03",
    peso: 100,
    estado: "Calificable",
  }),
]