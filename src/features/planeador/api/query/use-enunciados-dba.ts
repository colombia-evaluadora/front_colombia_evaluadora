import { useUnidadReferenteQuery } from "@/features/planeador/api/query/use-unidad-referente-query"

/**
 * Enunciados de DBA disponibles para la unidad — antes salían de
 * `POST /referentes-curriculares/query` (`useCurricularReferencesQuery`),
 * que responde 403 para `CEVAL-DOCENTE` (confirmado en vivo, igual que ya
 * se corrigió en `useEnfoquePedagogicoDerivado`).
 *
 * El reemplazo real es el mismo `GET /unidades/:id/referente` que ya usa
 * el enfoque pedagógico (`use-unidad-referente-query.ts`) — trae un árbol
 * `enunciados[]` con `relacionadoConUnidad`/`pkTunidadEnunciado` (esos dos
 * SÍ confirmados por la colección Postman), pero el nombre del campo de
 * TEXTO de cada enunciado no está confirmado contra ninguna respuesta
 * real — adivinarlo ahora repetiría el mismo error que ya pasó con
 * `valoracion_nombre` (se asumió `nombre`, era otro campo). Mientras no
 * haya una captura real con enunciados, esto devuelve vacío en vez de
 * inventar un mapeo que probablemente no calce — al menos ya no dispara
 * el request que daba 403.
 */
export function useEnunciadosDbaQuery(unidadId: number | undefined) {
  const { isPending } = useUnidadReferenteQuery(unidadId)
  return { enunciados: [] as { id: number; text: string }[], isPending: unidadId != null && isPending }
}
