export interface SubjectLabelOptionRow {
  id: number
  valor: string
  esSemilla: boolean
  activo: boolean
}

export const subjectLabelOptionsDb: SubjectLabelOptionRow[] = [
  { id: 201, valor: "Asignatura", esSemilla: true, activo: true },
  { id: 202, valor: "Dimensión", esSemilla: true, activo: true },
  { id: 203, valor: "Área", esSemilla: true, activo: true },
]

export function nextSubjectLabelOptionId(): number {
  return subjectLabelOptionsDb.reduce((max, row) => Math.max(max, row.id), 0) + 1
}
