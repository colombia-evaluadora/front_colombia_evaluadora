import type { AreaSubjectItem } from "@/features/establishment/academic-period/api/types/area-subject"

// Estructura JSONB confirmada de `fn_subject_guardar_bulk` (`p_asignaturas`):
// camelCase, `asignaturaGeneral` va como id, pero `especialidad` va como
// NOMBRE (texto), no como id — confirmado leyendo el cuerpo de la función:
// hace `v_enf_name := it->>'especialidad'` y lo compara contra
// `TESPECIALIDAD.NOMBRE`/resuelve por nombre vía `fn_enfasis_resolver`. Antes
// se mandaba el id resuelto contra el catálogo combinado
// (`resolve-especialidad-id.ts`), lo que rompía esa resolución por nombre:
// un id como "2" nunca matchea ningún NOMBRE, así que caía siempre al
// fallback de "crear énfasis nuevo" con el id como nombre literal — quedaban
// énfasis basura como uno llamado "2". No hay alta/edición de asignatura
// individual — el guardado del área guarda también todas sus asignaturas en
// un solo bulk (reemplazo total).
export function toAsignaturasPayload(subjects: AreaSubjectItem[]) {
  return subjects.map((subject) => ({
    nombreInterno: subject.nombreInterno,
    abreviacion: subject.abreviacion,
    asignaturaGeneral: Number(subject.asignaturaGeneral),
    especialidad: subject.especialidad || null,
    color: subject.color ?? null,
    ordenReportes: subject.ordenReportes,
  }))
}
