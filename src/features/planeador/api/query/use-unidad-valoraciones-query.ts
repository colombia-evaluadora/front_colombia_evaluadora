import { useQuery } from "@tanstack/react-query"

import { evalCol } from "@/lib/eval-col-client"

/**
 * `GET /planeador/unidades/:id/valoraciones` (confirmado real, colección
 * Postman `planeador-guia-completa`, 3.2b) — las valoraciones activas de la
 * escala que aplica a la unidad (derivada de asignatura+grado, o del nivel
 * de enseñanza si esa combinación no tiene criterio configurado). Es el
 * paso previo obligatorio a "Agregar criterio" (3.3): cada nivel de
 * desempeño que se guarda ahí necesita el `pk_tescala_valoracion` real de
 * acá, no un nombre libre — reemplaza a `useNivelesDesempenoNombres`
 * (que solo daba nombres, sin ids reales) para ese formulario puntual.
 *
 * Preferido sobre `POST /escalas/:PERIODO_ACADEMICO_ID` (403 para
 * `CEVAL-DOCENTE`, y mezcla las escalas de todos los niveles de enseñanza
 * del periodo).
 *
 * Shape confirmado con una captura real: la respuesta es un array PELADO
 * (no `{rows: [...]}` — `evalCol.getRows` tolera las dos formas) y la
 * etiqueta viene en `valoracion_nombre`, no `nombre` — el backend real
 * también trae mayúsculas/minúsculas inconsistentes entre valoraciones
 * ("BAJO" vs "basico" vs "alto " con espacio de sobra), de ahí el
 * `.trim()` en el mapeo.
 */
export interface UnidadValoracionRow {
  pk_tescala_valoracion: number
  valoracion_nombre: string
  limite_inferior: number | null
  limite_superior: number | null
  nota_minima: number | null
  nota_maxima: number | null
  valoracion_simbolo: string | null
  valoracion_carita: string | null
}

export interface UnidadValoracion {
  id: number
  nombre: string
  limiteInferior: number | null
  limiteSuperior: number | null
  notaMinima: number | null
  notaMaxima: number | null
  valoracionSimbolo: string | null
  valoracionCarita: string | null
}

/** "BAJO" / "basico" / "alto " → "Bajo" / "Basico" / "Alto" — el backend
 *  real trae mayúsculas/minúsculas inconsistentes entre valoraciones de una
 *  misma escala; se normaliza a "Título" para que la tabla y el modal de
 *  "Agregar criterio" no muestren una mezcla de casos. */
function normalizarCase(value: string): string {
  const trimmed = value.trim()
  if (!trimmed) return trimmed
  return trimmed[0]!.toUpperCase() + trimmed.slice(1).toLowerCase()
}

function toUnidadValoracion(row: UnidadValoracionRow): UnidadValoracion {
  return {
    id: row.pk_tescala_valoracion,
    nombre: normalizarCase(row.valoracion_nombre),
    limiteInferior: row.limite_inferior,
    limiteSuperior: row.limite_superior,
    notaMinima: row.nota_minima,
    notaMaxima: row.nota_maxima,
    valoracionSimbolo: row.valoracion_simbolo,
    valoracionCarita: row.valoracion_carita,
  }
}

async function fetchUnidadValoraciones(unidadId: number): Promise<UnidadValoracion[]> {
  const rows = await evalCol.getRows<UnidadValoracionRow>(
    `/planeador/unidades/${unidadId}/valoraciones`,
  )
  return rows.map(toUnidadValoracion)
}

export const unidadValoracionesQueryKey = (unidadId: number) =>
  ["planeador", "unidad", unidadId, "valoraciones"] as const

export function useUnidadValoracionesQuery(unidadId: number | undefined) {
  return useQuery({
    queryKey:
      unidadId != null
        ? unidadValoracionesQueryKey(unidadId)
        : (["planeador", "unidad", "none", "valoraciones"] as const),
    queryFn: () => fetchUnidadValoraciones(unidadId!),
    enabled: unidadId != null,
    staleTime: 1000 * 60,
  })
}
