import { api } from "@/lib/api-client"

interface UpdateSubjectInput {
  subjectId: number
  areaGeneralId?: number
  nombreInterno?: string
  abreviacion?: string
  ordenReportes?: number
  color?: string
  enfasisId?: number
}

export async function updateSubject(input: UpdateSubjectInput): Promise<void> {
  await api.put(`/eval-col/areas/asignaturas/${input.subjectId}`, {
    FK_AREA_ASIGNATURA: input.areaGeneralId,
    NOMBRE_INTERNO: input.nombreInterno,
    ABREVIACION: input.abreviacion,
    ORDEN_REPORTES: input.ordenReportes,
    COLOR: input.color,
    FK_ENFASIS: input.enfasisId,
  })
}
