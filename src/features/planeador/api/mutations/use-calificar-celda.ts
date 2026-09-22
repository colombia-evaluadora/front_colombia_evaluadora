import { useMutation, useQueryClient } from "@tanstack/react-query"

import { evalCol } from "@/lib/eval-col-client"
import type { MutationConfig } from "@/lib/react-query"

import { planillaCalificacionesQueryKeyPrefix } from "@/features/planeador/api/query/use-planilla-calificaciones-query"
import { notaEstudianteQueryKey } from "@/features/planeador/api/query/use-nota-estudiante-query"

/**
 * `PUT /planeador/actividades/estudiantes/:id/calificar` (confirmado real,
 * ver colección Postman `planeador-planilla-flujo-completo`, paso 4.1).
 *
 * Dos precondiciones reales que hay que respetar al armar el input:
 * 1. Para RUBRICA, `niveles` debe cubrir TODOS los criterios activos del
 *    instrumento — parcial da 400 ("La rubrica tiene N criterio(s) activo(s)
 *    pero se calificaron M"). Se valida antes de mutar en
 *    `instrumento-grading-fields.tsx` (`instrumentoCompletitud`).
 * 2. Tiene que haber asistencia registrada para `fecha` — si no, 400. No hay
 *    forma de validarlo desde el front sin otro endpoint; el error del
 *    backend se muestra tal cual en el toast.
 */
export type CalificarCeldaInput = {
  pkTactividadEstudiante: number
  /** `yyyy-MM-dd` — la fecha de la actividad (`PlanillaColumna.fechaInicio`). */
  fecha: string
} & (
  | { tipo: "RUBRICA"; niveles: { pkCriterio: number; pkNivel: number }[] }
  | { tipo: "LISTA_COTEJO"; itemsMarcados: number[] }
  | { tipo: "ESCALA_CUALITATIVA"; pkNivel: number }
  | { tipo: "VALOR_NUMERICO"; valorNumerico: number }
  | {
      tipo: "ESCALA_CRITERIOS"
      criterios: ({ criterioIndex: number } & ({ pkNivel: number } | { valorNumerico: number }))[]
    }
)

function buildCalificacion(input: CalificarCeldaInput): unknown {
  switch (input.tipo) {
    case "RUBRICA":
      return { niveles: input.niveles }
    // Confirmado real contra `instrumentos-por-tipo-evaluacion.md` (§5,
    // tabla de payloads de PUT .../calificar): `{"itemsMarcados":[pk,…]}`,
    // solo los pk de los ítems marcados -- NO `{items:[{pkItem,cumplido}]}`
    // (lo que mandaba este archivo antes). Con la forma vieja el backend no
    // reconocía el campo `items` y la lista de cotejo no se guardaba.
    case "LISTA_COTEJO":
      return { itemsMarcados: input.itemsMarcados }
    case "ESCALA_CUALITATIVA":
      return { pkNivel: input.pkNivel }
    case "VALOR_NUMERICO":
      return { valorNumerico: input.valorNumerico }
    // Un valor POR criterio general de la escala (V472,
    // fn_actividad_nota_calificar_escala_criterios) -- la fachada del
    // backend (fn_actividad_nota_calificar) despacha acá SOLO si el body
    // trae la clave "criterios"; sin ella sigue el camino de siempre
    // (ESCALA_CUALITATIVA/VALOR_NUMERICO arriba).
    case "ESCALA_CRITERIOS":
      return { criterios: input.criterios }
  }
}

interface CalificarCeldaResult {
  calificacion: number | null
}

function calificarCelda(input: CalificarCeldaInput): Promise<CalificarCeldaResult> {
  return evalCol.putRow(
    `/planeador/actividades/estudiantes/${input.pkTactividadEstudiante}/calificar`,
    // `CALIFICACION` está declarado JSONB del lado del backend y espera un
    // STRING ya serializado, no un objeto anidado nativo — mandarlo como
    // objeto lo aplana en "placeholders sin tipo declarado" (400). Mismo bug
    // de binder que `DEFINICION` en `PUT .../instrumento`, confirmado con
    // pruebas reales contra el backend.
    { CALIFICACION: JSON.stringify(buildCalificacion(input)), FECHA: input.fecha },
  )
}

interface UseCalificarCeldaOptions {
  mutationConfig?: MutationConfig<typeof calificarCelda>
}

export function useCalificarCeldaMutation({ mutationConfig }: UseCalificarCeldaOptions = {}) {
  const queryClient = useQueryClient()
  const { onSuccess, ...restConfig } = mutationConfig ?? {}

  return useMutation({
    mutationFn: calificarCelda,
    onSuccess: (result, variables, ...rest) => {
      queryClient.invalidateQueries({ queryKey: planillaCalificacionesQueryKeyPrefix() })
      queryClient.invalidateQueries({
        queryKey: notaEstudianteQueryKey(variables.pkTactividadEstudiante),
      })
      onSuccess?.(result, variables, ...rest)
    },
    ...restConfig,
  })
}
