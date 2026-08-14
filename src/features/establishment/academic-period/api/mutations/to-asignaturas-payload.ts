import type { AreaSubjectItem } from "@/features/establishment/academic-period/api/types/area-subject"

// Estructura JSONB confirmada de `fn_subject_guardar_bulk` (`p_asignaturas`):
// camelCase, `asignaturaGeneral`/`especialidad` van como id, no como nombre.
// No hay alta/edición de asignatura individual — el guardado del área guarda
// también todas sus asignaturas en un solo bulk (reemplazo total).
export function toAsignaturasPayload(
  subjects: AreaSubjectItem[],
  especialidadByName: Map<string, number>
) {
  return subjects.map((subject) => ({
    nombreInterno: subject.nombreInterno,
    abreviacion: subject.abreviacion,
    asignaturaGeneral: Number(subject.asignaturaGeneral),
    especialidad: subject.especialidad
      ? (especialidadByName.get(subject.especialidad) ?? null)
      : null,
    color: subject.color ?? null,
    ordenReportes: subject.ordenReportes,
  }))
}
