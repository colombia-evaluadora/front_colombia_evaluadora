import { useMutation, useQueryClient } from "@tanstack/react-query"

import { api } from "@/lib/api-client"
import type { MutationConfig } from "@/lib/react-query"
import type { MutationResult } from "@/features/establishment/academic-period/api/types/study-plan"

// `PUT /eval-col/plan-asignaturas/:ID/eliminar` (`fn_plan_eliminar`,
// id_query 74 — PUT desde V68).
function deleteStudyPlanItem(codigo: number): Promise<MutationResult> {
  return api.put(`/eval-col/plan-asignaturas/${codigo}/eliminar`)
}

interface UseDeleteStudyPlanItemOptions {
  mutationConfig?: MutationConfig<typeof deleteStudyPlanItem>
}

export function useDeleteStudyPlanItem({ mutationConfig }: UseDeleteStudyPlanItemOptions = {}) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: deleteStudyPlanItem,
    ...mutationConfig,
    onSuccess: (...args) => {
      queryClient.invalidateQueries({ queryKey: ["study-plans"] })
      // Al eliminar un ítem del plan, esa asignatura vuelve a estar
      // "disponible" para agregarla de nuevo — sin esto el combobox de
      // Agregar plan de estudio no la mostraba hasta cerrar y reabrir el
      // diálogo del grado.
      queryClient.invalidateQueries({ queryKey: ["study-plan-available"] })
      mutationConfig?.onSuccess?.(...args)
    },
  })
}
