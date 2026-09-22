import { useQuery } from "@tanstack/react-query"

import { evalCol } from "@/lib/eval-col-client"

import type { CeldaEvidencia, InstrumentoTipo } from "@/features/planeador/api/types/planilla"
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
  evidencias?: CeldaEvidencia[] | null
}

export interface NotaEstudiante {
  instrumento: InstrumentoTipo | null
  calificacion: number | null
  calificable: boolean
  observacion: string | null
  notas: NotaCriterio[]
  /** Imágenes de la observación (actividades formativas) — vacío en una
   *  actividad con nota. */
  evidencias: CeldaEvidencia[]
}

interface DetalleRubricaEntry {
  pkCriterio: number
  pkNivel: number
  ponderacion: number
}

interface DetalleCotejoEntry {
  pkItem: number
  cumplido: "S" | "N"
}

/** `ESCALA_VALORACION` (las dos variantes) y `OTRO` (que hoy SIEMPRE se
 *  califica como un valor numérico plano, ver `buildCalificarCeldaInput`)
 *  comparten el mismo objeto de tres campos — confirmado real contra
 *  producción (`GET .../nota` de una actividad "Otro" delegada en escala
 *  numérica): `{"valor":3.0,"pkNivel":null,"ponderacion":null}`. */
interface DetalleEscalaEntry {
  valor: number | null
  pkNivel: number | null
  ponderacion: number | null
}

/**
 * Confirmado real contra producción (`GET /planeador/actividades/
 * estudiantes/:id/nota`) para RUBRICA, LISTA_COTEJO y ESCALA_VALORACION/OTRO
 * numérica — antes solo se confiaba en RUBRICA (el único que cubría el
 * ejemplo de la colección Postman) y el resto se dejaba sin notas previas:
 * el popover de una celda ya calificada con lista de cotejo, escala o
 * "Otro" se veía vacío (checkboxes destildados, campo sin valor) aunque el
 * badge de la grilla mostrara la nota correcta — esa nota SÍ vive en
 * `celda.calificacion`, que la grilla lee aparte y ya funcionaba bien.
 */
function toNotas(instrumento: InstrumentoTipo | null, detalle: unknown): NotaCriterio[] {
  if (instrumento === "RUBRICA" && Array.isArray(detalle)) {
    return (detalle as DetalleRubricaEntry[]).map((d) => ({
      criterioId: d.pkCriterio,
      nivelId: d.pkNivel,
      valor: d.ponderacion,
    }))
  }
  if (instrumento === "LISTA_COTEJO" && Array.isArray(detalle)) {
    // `ListaCotejoFields` lee "tildado" por PRESENCIA en `notas`
    // (`notaDe(value, item.pk) !== undefined`), no por un booleano adentro
    // — los ítems con `cumplido: "N"` quedan afuera, no con `valor: 0`.
    return (detalle as DetalleCotejoEntry[])
      .filter((d) => d.cumplido === "S")
      .map((d) => ({ criterioId: d.pkItem, valor: 100 }))
  }
  if ((instrumento === "ESCALA_VALORACION" || instrumento === "OTRO") && detalle && typeof detalle === "object") {
    const d = detalle as DetalleEscalaEntry
    // Variante CUALITATIVA de la escala: shape inferido por simetría con la
    // NUMERICA (mismo objeto, acá `pkNivel` en vez de `valor`) — todavía sin
    // un ejemplo real en producción (no hay ninguna escala cualitativa
    // calificada en la base al momento de este fix). Degrada a notas
    // vacías si en la práctica no calza, mismo comportamiento que antes.
    if (d.pkNivel != null) {
      return [{ criterioId: 0, nivelId: d.pkNivel, valor: d.ponderacion ?? undefined }]
    }
    // NUMERICA / OTRO (siempre numérico, ver `buildCalificarCeldaInput`):
    // `valor` es el valorNumerico crudo tal como lo exige `PUT .../calificar`
    // (la escala 1-5, no un porcentaje ya calculado — el backend rescala).
    if (d.valor != null) {
      return [{ criterioId: 0, valor: d.valor }]
    }
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
    evidencias: row?.evidencias ?? [],
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
