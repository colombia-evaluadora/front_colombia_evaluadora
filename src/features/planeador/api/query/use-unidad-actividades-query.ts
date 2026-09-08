import { useQuery } from "@tanstack/react-query"

import { evalCol } from "@/lib/eval-col-client"
import type { UnidadActividad } from "@/features/planeador/api/types/unidad-tematica"

/**
 * `GET /planeador/unidades/:id/actividades` (real, colección Postman
 * `planeador-guia-completa`, 2.8) — actividades ya vinculadas a la unidad,
 * con su `PONDERACION` (columna visible de la pantalla "Actividades" del
 * panel de unidad).
 *
 * SIN captura real confirmada todavía — la colección solo describe el
 * contenido en prosa ("ACTIVIDAD / TIPO / INSTRUMENTO / GRUPO / %", orden
 * por `actividad|tipo|instrumento|grupo|porcentaje"). Los nombres de campo
 * de abajo son la mejor aproximación, siguiendo el patrón ya confirmado en
 * otros endpoints de este módulo (`pk_tactividad`, `titulo`…) — pueden no
 * coincidir 1:1. Revisar contra una respuesta real cuanto antes.
 *
 * `PK_TACTIVIDAD_UNIDAD` (el id de la relación) tampoco está confirmado, y
 * no hace falta: `PATCH /unidades/actividades/:ACT` (desvincular) y
 * `PUT .../ponderacion` (2.10/2.11, ya cableados en
 * `unlink-actividad-unidad.ts`/`update-ponderacion-actividad-unidad.ts`)
 * toman el `PK_TACTIVIDAD` directo en el path, no un id de relación — por
 * eso `id` acá simplemente reusa `actividadId`.
 */
interface UnidadActividadRow {
  pk_tactividad: number
  titulo: string
  tipo_actividad?: string | null
  es_evaluativa?: "S" | "N"
  instrumento_evaluacion?: string | null
  grupo?: string | null
  ponderacion?: number | null
}

function toUnidadActividad(row: UnidadActividadRow): UnidadActividad {
  return {
    id: row.pk_tactividad,
    actividadId: row.pk_tactividad,
    nombre: row.titulo,
    // "Formativa"/"Sumativa" se deriva de `es_evaluativa` si viene (mismo
    // criterio que el resto del front); si no, cae al texto libre del
    // catálogo `TIPO_ACTIVIDAD`.
    tipo: row.es_evaluativa != null ? (row.es_evaluativa === "S" ? "Sumativa" : "Formativa") : (row.tipo_actividad ?? ""),
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
