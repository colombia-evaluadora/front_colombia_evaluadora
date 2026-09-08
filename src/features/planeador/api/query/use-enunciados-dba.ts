import { useReferenteCurricularQuery } from "@/features/planeador/api/query/use-referente-curricular-query"

/**
 * Enunciados de DBA disponibles para la unidad — antes salían de
 * `POST /referentes-curriculares/query` (`useCurricularReferencesQuery`),
 * que responde 403 para `CEVAL-DOCENTE` (confirmado en vivo).
 *
 * El reemplazo real es `GET /planeador/referente-curricular?grado=&
 * asignatura=` (3.0, `use-referente-curricular-query.ts`) — se deriva de
 * GRADO+ASIGNATURA en vez de un `:id` de unidad, así que ya funciona
 * mientras se está creando o editando la unidad, antes de guardar (antes
 * dependía de `GET /unidades/:id/referente`, que exige una unidad YA
 * EXISTENTE). Sigue trayendo un árbol `enunciados[]` con
 * `relacionadoConUnidad`/`pkTunidadEnunciado` en la variante de unidad,
 * pero el nombre del campo de TEXTO de cada enunciado no está confirmado
 * contra ninguna respuesta real — adivinarlo ahora repetiría el mismo
 * error que ya pasó con `valoracion_nombre` (se asumió `nombre`, era otro
 * campo). Mientras no haya una captura real con enunciados, esto devuelve
 * vacío en vez de inventar un mapeo que probablemente no calce.
 */
export function useEnunciadosDbaQuery(gradoId: number | undefined, asignaturaId: number | undefined) {
  const { isPending } = useReferenteCurricularQuery(gradoId, asignaturaId)
  return { enunciados: [] as { id: number; text: string }[], isPending: gradoId != null && isPending }
}
