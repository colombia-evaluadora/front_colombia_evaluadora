import { useQuery } from "@tanstack/react-query"

import { api } from "@/lib/api-client"
import { defaultRecuperacionCampoDisponible, type Actividad } from "@/features/planeador/api/types/actividad"
import { toInstrumentosPermitidos } from "@/features/planeador/api/query/use-instrumento-evaluacion-catalog"

/**
 * `GET /planeador/unidades/:id/configuracion-actividad?ES_SUMATIVA=S|N`
 * (confirmado real, colección Postman `planeador-flujo-unidad-actividad`,
 * paso 6): el equivalente de `campos_disponibles` de
 * `GET /actividades/:id/configuracion` (guía completa, 5.1) para cuando la
 * actividad TODAVÍA no existe — ese otro endpoint exige un PK de actividad
 * que en el formulario de alta no hay. Con la unidad ya elegida en el
 * `<Select>` de "Unidad temática asociada", esto dice qué mostrar/exigir
 * ANTES de crear, con la misma forma que ya usa el detalle real
 * (`Actividad.camposDisponibles`).
 *
 * El parámetro de ESTA ruta es `ES_SUMATIVA`, no `ES_EVALUATIVA` (que sí es
 * el nombre correcto para el campo `ES_EVALUATIVA` del body de
 * `POST`/`PUT /planeador/actividades` — son dos cosas distintas, no un
 * alias). Va en MAYÚSCULAS y como `S`/`N` en la query — el binder del motor
 * solo hace `toUpperCase()`, así que `?esSumativa=` se ignora en silencio
 * (mismo aviso documentado en la colección Postman).
 */
type CamposDisponibles = NonNullable<Actividad["camposDisponibles"]>

/** Misma fila cruda que `GET .../actividades/:id` — `evaluacion.
 *  instrumentosPermitidos` viene como `{pk, valor, etiqueta}[]`, no
 *  `string[]` (ver `toInstrumentosPermitidos`). */
type CamposDisponiblesRaw = Omit<CamposDisponibles, "evaluacion" | "recuperacion"> & {
  evaluacion: Omit<CamposDisponibles["evaluacion"], "instrumentosPermitidos"> & {
    instrumentosPermitidos: Parameters<typeof toInstrumentosPermitidos>[0]
  }
  recuperacion?: CamposDisponibles["recuperacion"]
}

interface ConfiguracionActividadRow {
  configuracion: { campos_disponibles: CamposDisponiblesRaw }
}

/** Mismo blindaje de forma que `use-unidad-referente-query.ts`: tolera
 *  array suelto, `{rows: [...]}`, u objeto suelto. */
function firstRow(body: unknown): ConfiguracionActividadRow | undefined {
  if (Array.isArray(body)) return body[0] as ConfiguracionActividadRow | undefined
  if (body != null && typeof body === "object" && "rows" in body) {
    const rows = (body as { rows?: unknown }).rows
    return Array.isArray(rows) ? (rows[0] as ConfiguracionActividadRow | undefined) : undefined
  }
  return body as ConfiguracionActividadRow | undefined
}

async function fetchConfiguracionActividad(
  unidadId: number,
  esEvaluativa: boolean,
): Promise<CamposDisponibles | undefined> {
  const body = await api.get(
    `/eval-col/planeador/unidades/${unidadId}/configuracion-actividad?ES_SUMATIVA=${esEvaluativa ? "S" : "N"}`,
  )
  const campos = firstRow(body)?.configuracion?.campos_disponibles
  if (!campos) return undefined
  return {
    ...campos,
    evaluacion: {
      ...campos.evaluacion,
      instrumentosPermitidos: toInstrumentosPermitidos(campos.evaluacion.instrumentosPermitidos),
    },
    recuperacion: campos.recuperacion ?? defaultRecuperacionCampoDisponible(),
  }
}

export const configuracionActividadQueryKey = (unidadId: number, esEvaluativa: boolean) =>
  ["planeador", "unidad", unidadId, "configuracion-actividad", esEvaluativa] as const

/**
 * Campos obligatorios/visibles para crear una actividad EN esta unidad,
 * antes de que la actividad exista todavía — la misma fuente de verdad que
 * `EvaluacionSection` ya usa para editar (`Actividad.camposDisponibles`),
 * en vez de re-adivinar la regla del lado del cliente con
 * `useUnidadReferenteQuery`/`useReferenteCurricularQuery`.
 */
export function useConfiguracionActividadQuery(unidadId: number | undefined, esEvaluativa: boolean) {
  return useQuery({
    queryKey:
      unidadId != null
        ? configuracionActividadQueryKey(unidadId, esEvaluativa)
        : (["planeador", "unidad", "none", "configuracion-actividad", esEvaluativa] as const),
    queryFn: () => fetchConfiguracionActividad(unidadId!, esEvaluativa),
    enabled: unidadId != null,
    staleTime: 1000 * 60,
  })
}
