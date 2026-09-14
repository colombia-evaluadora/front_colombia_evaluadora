import { api } from "@/lib/api-client"
import { extractWriteResultId, type WriteResultResponse } from "./extract-write-result"

interface CreateSubjectInput {
  areaId: number
  areaGeneralId: number
  nombreInterno: string
  abreviacion: string
  ordenReportes: number
  color?: string
  // A diferencia del bulk (`fn_subject_guardar_bulk`, que resuelve la
  // especialidad por NOMBRE), `fn_subject_crear` espera el id ya resuelto
  // (de un énfasis o de una especialidad global — lo desambigua
  // internamente vía `fn_enfasis_desde_seleccion`).
  enfasisId?: number
}

// `POST /eval-col/areas/:FK_AREA/asignaturas` (`fn_subject_crear`, id_query 39)
// — alta de UNA sola asignatura dentro de un área ya existente. A diferencia
// del bulk (`fn_subject_guardar_bulk`, usado por `create-area-subject.ts`),
// esta sí devuelve el id real de la fila creada, necesario para
// autoseleccionarla de inmediato en otro selector (p.ej. Plan de Estudio).
export async function createSubject(input: CreateSubjectInput): Promise<number> {
  const raw: WriteResultResponse = await api.post(`/eval-col/areas/${input.areaId}/asignaturas`, {
    FK_AREA_ASIGNATURA: input.areaGeneralId,
    NOMBRE_INTERNO: input.nombreInterno,
    ABREVIACION: input.abreviacion,
    ORDEN_REPORTES: input.ordenReportes,
    COLOR: input.color,
    FK_ENFASIS: input.enfasisId,
  })
  return extractWriteResultId(raw)
}
