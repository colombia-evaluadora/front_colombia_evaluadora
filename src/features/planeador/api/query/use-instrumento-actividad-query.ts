import { useQuery } from "@tanstack/react-query"

import { evalCol } from "@/lib/eval-col-client"

import type { InstrumentoActividad, InstrumentoTipo } from "@/features/planeador/api/types/planilla"

/** `GET /planeador/actividades/:id/instrumento` (confirmado real, ver
 *  colección Postman `planeador-planilla-flujo-completo`, paso 3.1). Un 200
 *  con `instrumento: null` significa "todavía sin definir" — el endpoint no
 *  devuelve 404 en ese caso. */
interface InstrumentoActividadRow {
  instrumento: InstrumentoTipo | null
  instrumento_nombre: string | null
  definicion: unknown
}

const SIN_DEFINIR: InstrumentoActividad = {
  instrumento: null,
  instrumentoNombre: null,
  definicion: null,
}

function toInstrumentoActividad(row: InstrumentoActividadRow | undefined): InstrumentoActividad {
  if (!row || !row.instrumento) return SIN_DEFINIR
  return {
    instrumento: row.instrumento,
    instrumentoNombre: row.instrumento_nombre,
    definicion: row.definicion,
  } as InstrumentoActividad
}

export const instrumentoActividadQueryKey = (actividadId: number) =>
  ["planeador", "actividad", actividadId, "instrumento"] as const

async function fetchInstrumentoActividad(actividadId: number): Promise<InstrumentoActividad> {
  const rows = await evalCol.getRows<InstrumentoActividadRow>(
    `/planeador/actividades/${actividadId}/instrumento`,
  )
  return toInstrumentoActividad(rows[0])
}

/**
 * Instrumento de evaluación de UNA actividad puntual — la fuente real de
 * `pkCriterio`/`pkNivel`/`pkItem` que exige calificar. Independiente de la
 * rúbrica de la Unidad temática (`Actividad.rubrica` del mock, que vive en
 * `trubrica_unidad`/`tcriterio_unidad`): mandar el criterio de la unidad al
 * calificar da 400 en el backend real — confirmado con pruebas.
 */
export function useInstrumentoActividadQuery(actividadId: number | undefined) {
  return useQuery({
    queryKey:
      actividadId != null
        ? instrumentoActividadQueryKey(actividadId)
        : (["planeador", "actividad", "none", "instrumento"] as const),
    queryFn: () => fetchInstrumentoActividad(actividadId!),
    enabled: actividadId != null,
    staleTime: 1000 * 60,
  })
}
