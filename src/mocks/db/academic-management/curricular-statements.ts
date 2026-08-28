import type {
  CurricularEvidence,
  CurricularStatement,
} from "@/features/academic-management/curricular-references/api/types/statement"

// Enunciados sembrados para el referente 1 (DBA - Secundaria), área
// Matemáticas (id 15 en `generalAreasDb`).
export const curricularStatementsDb: CurricularStatement[] = [
  {
    id: 1,
    curricularReferenceId: 1,
    areaId: 15,
    text: "Fortalecer la comunicación oral y la escucha activa en diferentes contextos.",
    active: true,
  },
  {
    id: 2,
    curricularReferenceId: 1,
    areaId: 15,
    text: "Desarrollar la autonomía en las actividades cotidianas.",
    active: true,
  },
  {
    id: 3,
    curricularReferenceId: 1,
    areaId: 15,
    text: "Reconocer y valorar su entorno natural y social.",
    active: true,
  },
  {
    id: 4,
    curricularReferenceId: 1,
    areaId: 15,
    text: "Expresar emociones e ideas a través de diferentes lenguajes.",
    active: true,
  },
]

export const curricularEvidencesDb: CurricularEvidence[] = [
  { id: 1, statementId: 1, text: "Expresa ideas con claridad en diferentes situaciones.", active: true },
  { id: 2, statementId: 1, text: "Participa en conversaciones respetando turnos.", active: true },
  {
    id: 3,
    statementId: 1,
    text: "Comprende instrucciones sencillas y actúa en consecuencia.",
    active: true,
  },
]

let nextStatementId = curricularStatementsDb.length + 1
let nextEvidenceId = curricularEvidencesDb.length + 1

export function takeNextStatementId(): number {
  return nextStatementId++
}

export function takeNextEvidenceId(): number {
  return nextEvidenceId++
}

export function upsertStatement(statement: CurricularStatement) {
  const index = curricularStatementsDb.findIndex((item) => item.id === statement.id)
  if (index >= 0) {
    curricularStatementsDb[index] = statement
  } else {
    curricularStatementsDb.push(statement)
  }
  return statement
}

export function deleteStatement(id: number) {
  const index = curricularStatementsDb.findIndex((item) => item.id === id)
  if (index >= 0) curricularStatementsDb.splice(index, 1)

  // Baja en cascada: sin enunciado, sus evidencias quedan huérfanas.
  for (let i = curricularEvidencesDb.length - 1; i >= 0; i -= 1) {
    if (curricularEvidencesDb[i].statementId === id) curricularEvidencesDb.splice(i, 1)
  }
}

export function upsertEvidence(evidence: CurricularEvidence) {
  const index = curricularEvidencesDb.findIndex((item) => item.id === evidence.id)
  if (index >= 0) {
    curricularEvidencesDb[index] = evidence
  } else {
    curricularEvidencesDb.push(evidence)
  }
  return evidence
}

export function deleteEvidence(id: number) {
  const index = curricularEvidencesDb.findIndex((item) => item.id === id)
  if (index >= 0) curricularEvidencesDb.splice(index, 1)
}
