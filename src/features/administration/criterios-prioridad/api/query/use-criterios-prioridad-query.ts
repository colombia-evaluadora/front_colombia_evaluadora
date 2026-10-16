import { useQuery } from "@tanstack/react-query"

import { evalCol } from "@/lib/eval-col-client"

import { criterioPrioridadKeys } from "@/features/administration/criterios-prioridad/api/query-keys"
import type {
  BloqueOpcion,
  CriterioPrioridad,
  Resultado,
} from "@/features/administration/criterios-prioridad/api/types/criterio-prioridad"

// Son pocos (los 9 iniciales y los que agregue el Superadministrador): orden y
// página se resuelven en el front, como en Áreas oficiales.
async function fetchCriteriosPrioridad() {
  const [row] = await evalCol.getRows<Resultado<CriterioPrioridad[]>>("/criterios-prioridad")
  return row?.resultado ?? []
}

export function useCriteriosPrioridadQuery() {
  return useQuery({ queryKey: criterioPrioridadKeys.lista, queryFn: fetchCriteriosPrioridad })
}

async function fetchCriterioCampos() {
  const [row] = await evalCol.getRows<Resultado<BloqueOpcion[]>>(
    "/catalogos/criterios-prioridad/campos",
  )
  return row?.resultado ?? []
}

/**
 * Bloques 2.2–2.13 e Inscripción con sus campos evaluables, las reglas que
 * admite cada uno (con el motivo de las que no) y los valores de su lista.
 * Sin `staleTime` largo: depende de la Lista de Valores (ordinal, valores).
 */
export function useCriterioCamposQuery({ enabled = true }: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: criterioPrioridadKeys.campos,
    queryFn: fetchCriterioCampos,
    enabled,
  })
}
