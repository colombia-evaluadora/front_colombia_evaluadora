import { useMutation, useQueryClient } from "@tanstack/react-query"

import { evalCol } from "@/lib/eval-col-client"
import type { MutationConfig } from "@/lib/react-query"

import { planillaCalificacionesQueryKeyPrefix } from "@/features/planeador/api/query/use-planilla-calificaciones-query"

/**
 * `PUT /planeador/actividades/:id/calificar-bulk/<tipo>` (confirmado real,
 * ver colección Postman `planeador-planilla-flujo-completo`, pasos 4.2-4.4).
 *
 * Para Rúbrica/Lista de cotejo, el bulk aplica UN criterio+nivel (o UN ítem)
 * a varios estudiantes por request — "calificar en bloque" dispara un
 * request por cada criterio que el docente llenó en el form, cada uno con la
 * misma lista de estudiantes. Escala de valoración con 2+ criterios generales
 * es la excepción: un solo request con `criterios` (todos los valores juntos,
 * V484), igual que exige calificar una celda.
 *
 * Los tres endpoints NO son intercambiables: cada uno exige que la actividad
 * de `actividadId` use justo ese instrumento (rúbrica/cotejo/escala) — se
 * resuelve una sola vez con `useInstrumentoActividadQuery` antes de armar
 * el input, nunca se asume.
 */
export type CalificarBulkInput = {
  actividadId: number
  estudianteIds: number[]
  /** `yyyy-MM-dd` — la fecha de la actividad (`PlanillaColumna.fechaInicio`). */
  fecha: string
} & (
  | { tipo: "RUBRICA"; pkCriterio: number; pkNivel: number }
  | { tipo: "LISTA_COTEJO"; pkItem: number; cumplido: boolean }
  | { tipo: "ESCALA_VALORACION"; pkNivel: number }
  /** Escala NUMÉRICA (sin niveles cualitativos): `calificar-bulk/escala`
   *  acepta VALOR_NUMERICO en vez de PK_NIVEL (V227). */
  | { tipo: "ESCALA_VALORACION"; valorNumerico: number }
  /** Escala con 2+ criterios generales (V472): desde V484 el bulk acepta
   *  CRITERIOS — un valor por criterio, el mismo juego para todos los
   *  estudiantes de `estudianteIds`. Exactamente uno de `pkNivel`/
   *  `valorNumerico` por elemento, según si la escala es cualitativa o
   *  numérica (uniforme para toda la escala, nunca mezclado). */
  | {
      tipo: "ESCALA_VALORACION"
      criterios: { criterioIndex: number; pkNivel?: number; valorNumerico?: number }[]
    }
)

const BULK_PATH: Record<CalificarBulkInput["tipo"], string> = {
  RUBRICA: "rubrica",
  LISTA_COTEJO: "cotejo",
  ESCALA_VALORACION: "escala",
}

function buildBulkBody(input: CalificarBulkInput): Record<string, unknown> {
  const base = { ESTUDIANTES: input.estudianteIds, FECHA: input.fecha }
  if (input.tipo === "RUBRICA") {
    return { ...base, PK_CRITERIO: input.pkCriterio, PK_NIVEL: input.pkNivel }
  }
  if (input.tipo === "LISTA_COTEJO") {
    return { ...base, PK_ITEM: input.pkItem, CUMPLIDO: input.cumplido ? "S" : "N" }
  }
  if ("criterios" in input) {
    return {
      ...base,
      CRITERIOS: input.criterios.map((c) => ({
        criterioIndex: c.criterioIndex,
        ...(c.pkNivel != null ? { pkNivel: c.pkNivel } : { valorNumerico: c.valorNumerico }),
      })),
    }
  }
  if ("valorNumerico" in input) {
    return { ...base, VALOR_NUMERICO: input.valorNumerico }
  }
  return { ...base, PK_NIVEL: input.pkNivel }
}

function calificarBulk(input: CalificarBulkInput): Promise<unknown> {
  return evalCol.putRow(
    `/planeador/actividades/${input.actividadId}/calificar-bulk/${BULK_PATH[input.tipo]}`,
    buildBulkBody(input),
  )
}

interface UseCalificarBulkOptions {
  mutationConfig?: MutationConfig<typeof calificarBulk>
}

export function useCalificarBulkMutation({ mutationConfig }: UseCalificarBulkOptions = {}) {
  const queryClient = useQueryClient()
  const { onSuccess, ...restConfig } = mutationConfig ?? {}

  return useMutation({
    mutationFn: calificarBulk,
    onSuccess: (...args) => {
      queryClient.invalidateQueries({ queryKey: planillaCalificacionesQueryKeyPrefix() })
      onSuccess?.(...args)
    },
    ...restConfig,
  })
}
