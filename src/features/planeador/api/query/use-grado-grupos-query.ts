import { useQuery } from "@tanstack/react-query"

import { evalCol } from "@/lib/eval-col-client"

/**
 * `POST /eval-col/grados/:gradoId/grupos/query` — catálogo de grupos de un
 * grado del ESTABLECIMIENTO, no acotado al docente autenticado (mismo
 * endpoint que ya usa Cobertura/Matrícula,
 * `use-matricula-dependent-catalogs-query.ts`).
 *
 * Fallback de `AsignaturaGradoSection` (`form-editar-actividad.tsx`) cuando
 * `docentes/grupos` no trae ningún grupo para el `gradoId` de la unidad
 * elegida: ese catálogo solo lista los grupos donde el DOCENTE dicta una
 * asignatura, pero el listado de unidades del Planeador puede mostrar
 * unidades de grados fuera de ese alcance (un coordinador, o una unidad de
 * otro docente/área) — ahí `gradoId` sí llega bien desde la unidad, pero
 * nunca aparecía ningún grupo para completar "Grado / Grupo", dejando el
 * campo en "Seleccione" y bloqueado sin forma de corregirlo (reportado en
 * vivo, confirmado contra la API real: `docentes/grupos` y `docentes/
 * grado-asignatura` de una docente NO traían ninguno de los dos grados de
 * las unidades que sí podía ver y abrir en el listado).
 *
 * Solo se pide cuando hace falta (`enabled`, ver el caller) — no tiene
 * sentido dispararla en el caso normal, donde `docentes/grupos` ya resuelve
 * todo.
 */
export interface GradoGrupo {
  grupoId: number
  grupoCodigo: string
}

interface GradoGrupoRow {
  id: number
  codigo: string
  jornada_name?: string
}

async function fetchGradoGrupos(gradoId: number): Promise<GradoGrupo[]> {
  const rows = await evalCol.postRows<GradoGrupoRow>(`/grados/${gradoId}/grupos/query`, {
    PAGE_INDEX: "0",
    PAGE_SIZE: "200",
  })
  return rows.map((row) => ({ grupoId: row.id, grupoCodigo: row.codigo }))
}

export const gradoGruposQueryKey = (gradoId: number | undefined) =>
  ["planeador", "grado-grupos", gradoId ?? "none"] as const

export function useGradoGruposQuery(gradoId: number | undefined) {
  return useQuery({
    queryKey: gradoGruposQueryKey(gradoId),
    queryFn: () => fetchGradoGrupos(gradoId as number),
    enabled: gradoId != null,
    staleTime: 1000 * 60,
  })
}
