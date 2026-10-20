import type { QueryClient } from "@tanstack/react-query"

/**
 * Todo lo de Informes (`["informes", ...]`): la tabla del grupo, la planilla,
 * el historial y las dos alertas. Lo llama quien cambia algo de lo que sale la
 * nota de una asignatura —calificar, observar, editar o eliminar actividades,
 * ponderaciones, unidades, asistencia— o resuelve una solicitud de corrección:
 * cualquiera de esos cambios puede crear o resolver un "cambio pendiente"
 * (alerta naranja) o una "planilla sin calificar" (alerta roja). Sin esto la
 * pantalla de Informes muestra el conteo viejo hasta que la consulta vence.
 */
export function invalidarInformes(queryClient: QueryClient) {
  return queryClient.invalidateQueries({ queryKey: ["informes"] })
}
