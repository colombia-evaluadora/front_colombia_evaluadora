import { useQuery } from "@tanstack/react-query"

import { evalCol } from "@/lib/eval-col-client"
import type { UnidadActividad } from "@/features/planeador/api/types/unidad-tematica"

/**
 * `GET /planeador/unidades/:id/actividades` (real —
 * `fn_unidad_actividades_listar`, V216/V245 en el repo del SSO, confirmado
 * contra la definición de la función) — actividades ya vinculadas a la
 * unidad, con su `PONDERACION` (columna visible de la pantalla
 * "Actividades" del panel de unidad).
 *
 * `PK_TACTIVIDAD_UNIDAD` (el id de la relación) no lo trae esta fila, y no
 * hace falta: `PATCH /unidades/actividades/:ACT` (desvincular) y
 * `PUT .../ponderacion` (2.10/2.11, ya cableados en
 * `unlink-actividad-unidad.ts`/`update-ponderacion-actividad-unidad.ts`)
 * toman el `PK_TACTIVIDAD` directo en el path, no un id de relación — por
 * eso `id` acá simplemente reusa `actividadId`.
 */
interface UnidadActividadRow {
  pk_tactividad: number
  titulo: string
  tipo_actividad: string | null
  instrumento_evaluacion: string | null
  grupo: string | null
  ponderacion: number | null
}

function toUnidadActividad(row: UnidadActividadRow): UnidadActividad {
  return {
    id: row.pk_tactividad,
    actividadId: row.pk_tactividad,
    nombre: row.titulo,
    // Columna "TIPO" de la tabla — es el catálogo TIPO_ACTIVIDAD
    // (`tipo_actividad`), el mismo que "Tipo de actividad" en el form de
    // alta/edición ("Trabajo en clase", "Otro"...). NO es "Sumativa"/
    // "Formativa" (eso se deriva de `ES_EVALUATIVA`, un campo distinto que
    // esta fila ni siquiera trae).
    tipo: row.tipo_actividad ?? "",
    instrumento: row.instrumento_evaluacion ?? "",
    grupo: row.grupo ?? "",
    ponderacion: row.ponderacion ?? 0,
  }
}

async function fetchUnidadActividades(unidadId: number): Promise<UnidadActividad[]> {
  const rows = await evalCol.getRows<UnidadActividadRow>(
    `/planeador/unidades/${unidadId}/actividades?size=100&offset=0`,
  )
  return rows.map(toUnidadActividad)
}

export const unidadActividadesQueryKey = (unidadId: number) =>
  ["planeador", "unidad", unidadId, "actividades"] as const

export function useUnidadActividadesQuery(unidadId: number | undefined) {
  return useQuery({
    queryKey:
      unidadId != null
        ? unidadActividadesQueryKey(unidadId)
        : (["planeador", "unidad", "none", "actividades"] as const),
    queryFn: () => fetchUnidadActividades(unidadId!),
    enabled: unidadId != null,
    staleTime: 1000 * 30,
  })
}
