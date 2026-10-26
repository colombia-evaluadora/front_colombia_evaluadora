import { useQuery } from "@tanstack/react-query"

import { evalCol } from "@/lib/eval-col-client"
import { planeadorKeys } from "@/features/planeador/api/query-keys"
import { TTL_OFFLINE, offlineMeta } from "@/lib/offline/query-meta"

/**
 * `GET /planeador/actividades/escala-precarga` (V496.4, `fn_actividad_escala_precarga`):
 * valores iniciales del constructor "Escala de valoración" (Reglas 40-42) para el
 * contexto de la actividad. La escala sale del criterio de evaluación vigente de
 * (asignatura, grado) —el "select de criterio" del Período Académico—, si no del
 * período, si no del NIVEL DE ENSEÑANZA del grado; el formato de calificación de ese
 * criterio da el `valorMaximo` de la variante numérica.
 *
 * Los niveles traen etiqueta y puntaje (`LIMITE_PROMEDIO` de la banda, convertido al
 * formato numérico cuando lo hay). `descriptor` llega siempre `null`: la escala del
 * período (`TVALORACION`) no tiene descripción por nivel, así que el docente la escribe.
 */
interface RawPrecargaNivel {
  fkTescalaValoracion: number
  orden: number | null
  codigo: string | null
  etiqueta: string
  descriptor: string | null
  puntaje: number | null
}

interface RawPrecarga {
  contexto?: { fkTasignatura: number | null; fkTgrado: number | null; fkTescala: number | null; escala: string | null }
  formato?: { valor: string | null; nombre: string | null; esNumerico: boolean; notaMaxima: number | null }
  tipoSugerido?: "NUMERICA" | "CUALITATIVA"
  valorMaximo?: number | null
  rango?: { valorMinimo: number | null; valorMaximo: number | null } | null
  niveles?: RawPrecargaNivel[]
}

export interface EscalaPrecargaNivel {
  nombre: string
  descripcion: string
  ponderacion: number | undefined
}

export interface EscalaPrecarga {
  /** Nombre de la escala del período que se usó (para el aviso del form). */
  escala: string | null
  /** Formato de calificación del criterio de evaluación ("De cero a cinco", …). */
  formato: string | null
  /** Valor mínimo sugerido para la variante numérica (extremo inferior de las bandas). */
  valorMinimo: number
  /** Regla 40: nota máxima del formato de calificación (100 si no es numérico). */
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

export function toEscalaPrecarga(raw: RawPrecarga | null | undefined): EscalaPrecarga {
  return {
    escala: raw?.contexto?.escala ?? null,
    formato: raw?.formato?.nombre ?? null,
    valorMinimo: redondear(raw?.rango?.valorMinimo) ?? 0,
    valorMaximo: redondear(raw?.valorMaximo),
    niveles: (raw?.niveles ?? []).map((nivel) => ({
      nombre: (nivel.etiqueta ?? "").trim(),
      descripcion: (nivel.descriptor ?? "").trim(),
      ponderacion: redondear(nivel.puntaje),
    })),
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

export function useEscalaPrecargaQuery(params: EscalaPrecargaParams, enabled = true) {
  const query = toQueryString(params)
  return useQuery({
    meta: offlineMeta(TTL_OFFLINE.grupo),
    queryKey: [...planeadorKeys.all, "escala-precarga", query ?? "none"] as const,
    queryFn: () => fetchEscalaPrecarga(query!),
    enabled: enabled && query != null,
    staleTime: 1000 * 60 * 5,
  })
}
