import type { Actividad, Adaptacion } from "@/features/planeador/api/types/actividad"

/**
 * Regla 47 / Bloque 6: los estudiantes de una adaptación "Estudiantes
 * específicos" salen de los estudiantes DE LA ACTIVIDAD, nunca del roster
 * completo del grupo — `fn_actividad_validar_adaptacion_estudiantes` (sso
 * V496.1) rechaza con 23503 cualquier `pk_tmatricula` que no tenga fila
 * activa en `TACTIVIDAD_ESTUDIANTE` de esa actividad. Con
 * `asignarTodoElGrupo` la actividad es de todo el grupo, así que vale
 * cualquier matrícula; si no, solo las de `matriculasIds`.
 */
export function esEstudianteDeLaActividad(
  { asignarTodoElGrupo, matriculasIds }: Pick<Actividad, "asignarTodoElGrupo" | "matriculasIds">,
  matriculaId: number,
): boolean {
  return asignarTodoElGrupo || matriculasIds.includes(matriculaId)
}

/**
 * Quita de cada adaptación los estudiantes que ya no están en la actividad
 * (el docente los sacó de "Estudiantes de la {rótulo}" después de marcarlos
 * en la adaptación). Sin esto el `PUT .../adaptaciones` arrastraba ids
 * viejos y el backend rechazaba TODO el guardado de adaptaciones.
 */
export function adaptacionesConEstudiantesDeLaActividad(
  values: Pick<Actividad, "asignarTodoElGrupo" | "matriculasIds" | "adaptaciones">,
): Adaptacion[] {
  return values.adaptaciones.map((adaptacion) => ({
    ...adaptacion,
    estudiantesIds: adaptacion.estudiantesIds.filter((id) => esEstudianteDeLaActividad(values, id)),
  }))
}
