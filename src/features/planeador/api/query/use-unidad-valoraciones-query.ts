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
 * OJO: la colección documenta los campos de límites (`limite_inferior`/
 * `limite_superior`/`nota_minima`/`nota_maxima`/`valoracion_simbolo`/
 * `valoracion_carita`) explícitamente en su prosa, pero NO trae una
 * respuesta real capturada — el nombre del campo "etiqueta" (Bajo/Básico/
 * Alto/Superior) no está confirmado; se asume `nombre` por ser el patrón
 * general de este backend (`SelectCategoryRow.nombre`, etc.).
 */
export interface UnidadValoracionRow {
  pk_tescala_valoracion: number
  nombre: string
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

function toUnidadValoracion(row: UnidadValoracionRow): UnidadValoracion {
  return {
    id: row.pk_tescala_valoracion,
    nombre: row.nombre,
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
