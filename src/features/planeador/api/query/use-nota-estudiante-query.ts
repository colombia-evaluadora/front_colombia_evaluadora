import { useQuery } from "@tanstack/react-query"

import { evalCol } from "@/lib/eval-col-client"

import type { InstrumentoTipo } from "@/features/planeador/api/types/planilla"
import type { NotaCriterio } from "@/features/planeador/api/types/calificacion"

/** `GET /planeador/actividades/estudiantes/:id/nota` (confirmado real, ver
 *  colección Postman `planeador-planilla-flujo-completo`, paso 5.1). Se usa
 *  para precargar el popover de una celda con lo que el estudiante ya tiene
 *  guardado — la grilla (`/planilla/calificaciones`) solo trae el agregado
 *  (`calificacion`), no la elección por criterio. */
interface NotaEstudianteRow {
  instrumento: InstrumentoTipo | null
  calificacion: number | null
  calificable: "S" | "N" | null
  observacion: string | null
  detalle: unknown
}

export interface NotaEstudiante {
  instrumento: InstrumentoTipo | null
  calificacion: number | null
  calificable: boolean
  observacion: string | null
  notas: NotaCriterio[]
}

interface DetalleRubricaEntry {
  pkCriterio: number
  pkNivel: number
  ponderacion: number
}

/** Solo el shape de RUBRICA está confirmado contra el backend real (el
 *  ejemplo de la colección Postman solo cubrió ese caso) — para
 *  cotejo/escala/otro se deja sin notas previas en vez de adivinar un
 *  shape que podría no calzar; el docente las vuelve a marcar desde cero
 *  en el popover, que sigue funcionando igual. */
function toNotas(instrumento: InstrumentoTipo | null, detalle: unknown): NotaCriterio[] {
  if (instrumento === "RUBRICA" && Array.isArray(detalle)) {
    return (detalle as DetalleRubricaEntry[]).map((d) => ({
      criterioId: d.pkCriterio,
      nivelId: d.pkNivel,
      valor: d.ponderacion,
    }))
  }
  return []
}

function toNotaEstudiante(row: NotaEstudianteRow | undefined): NotaEstudiante {
  return {
    instrumento: row?.instrumento ?? null,
    calificacion: row?.calificacion ?? null,
    calificable: row?.calificable === "S",
    observacion: row?.observacion ?? null,
    notas: toNotas(row?.instrumento ?? null, row?.detalle),
  }
}

export const notaEstudianteQueryKey = (pkTactividadEstudiante: number) =>
  ["planeador", "actividad-estudiante", pkTactividadEstudiante, "nota"] as const

async function fetchNotaEstudiante(pkTactividadEstudiante: number): Promise<NotaEstudiante> {
  const rows = await evalCol.getRows<NotaEstudianteRow>(
    `/planeador/actividades/estudiantes/${pkTactividadEstudiante}/nota`,
  )
  return toNotaEstudiante(rows[0])
}

export function useNotaEstudianteQuery(pkTactividadEstudiante: number | undefined) {
  return useQuery({
    queryKey:
      pkTactividadEstudiante != null
        ? notaEstudianteQueryKey(pkTactividadEstudiante)
        : (["planeador", "actividad-estudiante", "none", "nota"] as const),
    queryFn: () => fetchNotaEstudiante(pkTactividadEstudiante!),
    enabled: pkTactividadEstudiante != null,
    staleTime: 1000 * 10,
  })
}
