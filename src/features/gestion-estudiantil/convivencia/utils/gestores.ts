import type { CasoRow } from "@/features/gestion-estudiantil/convivencia/api/types"
import type { Opcion } from "@/features/gestion-estudiantil/commons/utils/opcion"

/** Suma a las opciones de gestor los que aparecen en una página del listado; un gestor no se repite. */
export function acumularGestores(prev: Opcion[], filas: Pick<CasoRow, "fk_tfuncionario_gestor" | "gestor_nombre">[]): Opcion[] {
  const m = new Map(prev.map((o) => [o.value, o.label]))
  for (const r of filas) if (r.fk_tfuncionario_gestor && r.gestor_nombre) m.set(String(r.fk_tfuncionario_gestor), r.gestor_nombre)
  return [...m].map(([value, label]) => ({ value, label }))
}
