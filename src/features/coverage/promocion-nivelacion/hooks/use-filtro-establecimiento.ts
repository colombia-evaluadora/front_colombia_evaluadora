import { useEstablecimientosPromocionQuery } from "@/features/coverage/promocion-nivelacion/api/promocion"
import type { Filtro } from "@/features/coverage/promocion-nivelacion/components/filtros"

/**
 * Filtro Establecimiento (Sección 7): solo si el usuario alcanza más de uno, como el Supervisor y el
 * Administrador territorial. Va primero; al cambiarlo se limpian los filtros que dependen de él.
 */
export function useFiltroEstablecimiento(valor: string | undefined): Filtro[] {
  const { data } = useEstablecimientosPromocionQuery()
  if (!data || data.length < 2) return []
  return [{ key: "ee", label: "Establecimiento", options: data.map((e) => ({ value: String(e.id), label: e.nombre })), value: valor ?? "" }]
}

/** Lo que se limpia al cambiar de establecimiento: sus sedes, jornadas, períodos, grados y grupos. */
export const LIMPIAR_POR_ESTABLECIMIENTO = { sede: undefined, jornada: undefined, periodo: undefined, grado: undefined, grupo: undefined }
