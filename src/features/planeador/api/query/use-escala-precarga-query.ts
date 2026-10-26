import { queryOptions, useQuery } from "@tanstack/react-query"

import { evalCol } from "@/lib/eval-col-client"
import { planeadorKeys } from "@/features/planeador/api/query-keys"
import type {
  EscalaPrecargaNivelRaw,
  EscalaValoracionTipo,
  InstrumentoPermitidoVariante,
} from "@/features/planeador/api/types/actividad"
import { TTL_OFFLINE, offlineMeta } from "@/lib/offline/query-meta"

/**
 * Precarga de la Escala de valoración (Regla 40): valores iniciales que el front COPIA al
 * formulario (no son un límite; guardar nunca toca la escala institucional). La escala
 * aplicable sale del criterio de evaluación vigente de (asignatura, grado), si no del
 * período, si no del NIVEL DE ENSEÑANZA del grado; el formato de calificación de ese
 * criterio convierte los porcentajes de las bandas a la nota del colegio (5, 10 o 100).
 *
 * Fuentes:
 * - Principal: `variantes[].precarga` de `ESCALA_VALORACION` en la configuración de la
 *   actividad (`evaluacion.instrumentosPermitidos[]` y, para "Otro", `campos.
 *   metodoValoracion.catalogo[]`, Regla 41). Elegir instrumento/variante no hace petición.
 * - `GET /planeador/actividades/escala-precarga` (V496.4): solo para "Restaurar valores
 *   de la institución" o si la configuración no trae `precarga` (respuesta anterior).
 *
 * `descriptor` es `TESCALA_VALORACION.DESCRIPCION` (V71.1, #844); si llega `null`, el
 * docente lo escribe.
 */
interface RawPrecarga {
  contexto?: { fkTasignatura: number | null; fkTgrado: number | null; fkTescala: number | null; escala: string | null }
  formato?: { valor: string | null; nombre: string | null; esNumerico: boolean; notaMaxima: number | null }
  tipoSugerido?: "NUMERICA" | "CUALITATIVA"
  valorMaximo?: number | null
  rango?: { valorMinimo: number | null; valorMaximo: number | null } | null
  niveles?: EscalaPrecargaNivelRaw[]
}

export interface EscalaPrecargaNivel {
  nombre: string
  descripcion: string
  ponderacion: number | undefined
}

export interface EscalaPrecarga {
  /** Nombre de la escala aplicable (solo lo trae `GET escala-precarga`). */
  escala: string | null
  /** Formato de calificación del criterio de evaluación ("De cero a cinco", …). */
  formato: string | null
  /** Valor mínimo inicial de la variante numérica. */
  valorMinimo: number
  /** Valor máximo inicial de la variante numérica. */
  valorMaximo: number | undefined
  niveles: EscalaPrecargaNivel[]
}

export interface EscalaPrecargaParams {
  actividadId?: number
  unidadId?: number
  grupoId?: number
  asignaturaId?: number
}

/** Puntaje del nivel con a lo sumo 2 decimales (el backend guarda NUMERIC(5,2)). */
function redondear(valor: number | null | undefined): number | undefined {
  return valor == null ? undefined : Math.round(Number(valor) * 100) / 100
}

function toNiveles(niveles: EscalaPrecargaNivelRaw[] | undefined): EscalaPrecargaNivel[] {
  return (niveles ?? []).map((nivel) => ({
    nombre: (nivel.etiqueta ?? "").trim(),
    descripcion: (nivel.descriptor ?? "").trim(),
    ponderacion: redondear(nivel.puntaje),
  }))
}

/** Respuesta de `GET escala-precarga`. El rango de las bandas tiene prioridad sobre la nota máxima. */
export function toEscalaPrecarga(raw: RawPrecarga | null | undefined): EscalaPrecarga {
  return {
    escala: raw?.contexto?.escala ?? null,
    formato: raw?.formato?.nombre ?? null,
    valorMinimo: redondear(raw?.rango?.valorMinimo) ?? 0,
    valorMaximo: redondear(raw?.rango?.valorMaximo) ?? redondear(raw?.valorMaximo),
    niveles: toNiveles(raw?.niveles),
  }
}

const TIPO_POR_VARIANTE: Record<string, EscalaValoracionTipo> = {
  CUALITATIVA: "Cualitativa",
  NUMERICA: "Numérica",
}

/** Variantes de la escala que llegaron en la configuración, con su precarga ya mapeada. */
export interface EscalaVariantesConfig {
  /** Solo las que admite el `tipoEvaluacion` del referente (lo decide el backend). */
  permitidas: EscalaValoracionTipo[]
  /** `undefined` si la configuración no trae `precarga` (respuesta previa a la Regla 40). */
  precargas: Partial<Record<EscalaValoracionTipo, EscalaPrecarga>> | undefined
}

/**
 * `variantes[]` de `ESCALA_VALORACION` → modos permitidos y precarga por modo. `precarga:
 * null` → form vacío; `niveles: []` → el docente agrega los niveles a mano. Devuelve
 * `null` si no hay variantes reconocibles (sin configuración): el form decide por
 * `tipoEvaluacion` y la petición de respaldo.
 */
export function toEscalaVariantesConfig(
  variantes: InstrumentoPermitidoVariante[] | undefined,
): EscalaVariantesConfig | null {
  const reconocidas = (variantes ?? []).filter((v) => TIPO_POR_VARIANTE[v.valor] != null)
  if (reconocidas.length === 0) return null
  const conPrecarga = reconocidas.some((v) => v.precarga !== undefined)
  const precargas: Partial<Record<EscalaValoracionTipo, EscalaPrecarga>> = {}
  for (const v of reconocidas) {
    precargas[TIPO_POR_VARIANTE[v.valor]!] = {
      escala: null,
      formato: null,
      valorMinimo: redondear(v.precarga?.valorMinimo) ?? 0,
      valorMaximo: redondear(v.precarga?.valorMaximo),
      niveles: toNiveles(v.precarga?.niveles),
    }
  }
  return {
    permitidas: reconocidas.map((v) => TIPO_POR_VARIANTE[v.valor]!),
    precargas: conPrecarga ? precargas : undefined,
  }
}

/** Grupo + asignatura (el grado de la actividad) si están; si no, la unidad o la actividad guardada. */
function toQueryString({ actividadId, unidadId, grupoId, asignaturaId }: EscalaPrecargaParams): string | null {
  const params = new URLSearchParams()
  if (grupoId && asignaturaId) {
    params.set("GRUPO", String(grupoId))
    params.set("ASIGNATURA", String(asignaturaId))
  } else if (unidadId) params.set("UNIDAD", String(unidadId))
  else if (actividadId) params.set("ACTIVIDAD", String(actividadId))
  else return null
  return params.toString()
}

async function fetchEscalaPrecarga(query: string): Promise<EscalaPrecarga> {
  const rows = await evalCol.getRows<{ precarga: RawPrecarga } | RawPrecarga>(
    `/planeador/actividades/escala-precarga?${query}`,
  )
  const row = rows[0]
  const raw = row && "precarga" in row ? row.precarga : (row as RawPrecarga | undefined)
  return toEscalaPrecarga(raw)
}

export function escalaPrecargaQueryOptions(params: EscalaPrecargaParams) {
  const query = toQueryString(params)
  return queryOptions({
    meta: offlineMeta(TTL_OFFLINE.grupo),
    queryKey: [...planeadorKeys.all, "escala-precarga", query ?? "none"] as const,
    queryFn: () => fetchEscalaPrecarga(query!),
    enabled: query != null,
    staleTime: 1000 * 60 * 5,
  })
}

/** Respaldo cuando la configuración no trae `variantes[].precarga`. */
export function useEscalaPrecargaQuery(params: EscalaPrecargaParams, enabled = true) {
  const options = escalaPrecargaQueryOptions(params)
  return useQuery({ ...options, enabled: enabled && options.enabled !== false })
}
