import { useMutation, useQueryClient } from "@tanstack/react-query"

import { api } from "@/lib/api-client"
import type { MutationConfig } from "@/lib/react-query"
import type { ScheduleEntry } from "@/features/establishment/academic-period/api/types/grade-config"

interface UpdateHorarioInput {
  gradeId: number
  entries: ScheduleEntry[]
}

// `POST /eval-col/horarios` (`fn_horario_guardar`, id_query 79). Reemplaza
// TODO el horario del grado (borra lo activo y reinserta) — coincide con que
// `ScheduleBuilder.save()` siempre manda el estado completo de la grilla, no
// un diff. `p_entries` espera exactamente `{grupoId, planItemId, diaId,
// bloque}` por elemento — mismos nombres que `ScheduleEntry`, así que el
// array viaja tal cual sin remapear campos.
function updateHorario({ gradeId, entries }: UpdateHorarioInput): Promise<number> {
  return api.post("/eval-col/horarios", {
    FK_GRADO: gradeId,
    ENTRIES: entries,
  })
}

interface UseUpdateHorarioOptions {
  mutationConfig?: MutationConfig<typeof updateHorario>
}

export function useUpdateHorario({ mutationConfig }: UseUpdateHorarioOptions = {}) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: updateHorario,
    ...mutationConfig,
    onSuccess: (...args) => {
      queryClient.invalidateQueries({ queryKey: ["horario"] })
      mutationConfig?.onSuccess?.(...args)
    },
  })
}
