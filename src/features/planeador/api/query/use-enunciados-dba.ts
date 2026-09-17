import { useReferenteCurricularQuery } from "@/features/planeador/api/query/use-referente-curricular-query"

/**
 * Enunciados de DBA disponibles para la unidad — antes salían de
 * `POST /referentes-curriculares/query` (`useCurricularReferencesQuery`),
 * que responde 403 para `CEVAL-DOCENTE` (confirmado en vivo).
 *
 * El reemplazo real es `GET /planeador/referente-curricular?grado=&
 * asignatura=` (3.0, `use-referente-curricular-query.ts`) — se deriva de
 * GRADO+ASIGNATURA en vez de un `:id` de unidad, así que ya funciona
 * mientras se está creando o editando la unidad, antes de guardar.
 *
 * El texto de cada enunciado viene confirmado contra una respuesta real en
 * `enunciados[].texto` (no `nombre`/`descripcion`) — acá solo se toma el
 * nivel 1 (el enunciado en sí); las `evidencias[]` anidadas de nivel 2 son
 * para marcar en la ACTIVIDAD (una vez que su unidad ya relacionó el
 * enunciado padre), no se ofrecen en este selector de unidad.
 */
export function useEnunciadosDbaQuery(gradoId: number | undefined, asignaturaId: number | undefined) {
  const { data, isPending } = useReferenteCurricularQuery(gradoId, asignaturaId)
  return {
    enunciados: data?.enunciados ?? [],
    // El referente define cómo se llama la sección y para qué sirve; el
    // llamador cae a su texto por defecto mientras no haya referente.
    nombre: data?.nombre ?? null,
    descripcion: data?.descripcion ?? null,
    isPending: gradoId != null && isPending,
  }
}
