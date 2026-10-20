import { useMutation, useQueryClient } from "@tanstack/react-query"

import { api } from "@/lib/api-client"
import type { MutationConfig } from "@/lib/react-query"
import { invalidateSubjectRelated } from "./invalidate"

// Baja definitiva; falla si la asignatura sigue en uso.
function deleteSubject(subjectId: number): Promise<void> {
  return api.put(`/eval-col/areas/asignaturas/eliminar/${subjectId}`)
}

interface UseDeleteSubjectOptions {
  mutationConfig?: MutationConfig<typeof deleteSubject>
}

export function useDeleteSubject({ mutationConfig }: UseDeleteSubjectOptions = {}) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: deleteSubject,
    ...mutationConfig,
    onSuccess: (...args) => {
      invalidateSubjectRelated(queryClient)
      mutationConfig?.onSuccess?.(...args)
    },
  })
}

/** Bajas en paralelo sin cortar en la primera que falle; mismo orden de entrada. */
function deleteSubjects(subjectIds: (number | undefined)[]): Promise<PromiseSettledResult<void>[]> {
  return Promise.allSettled(
    subjectIds.map((id) => (id != null ? deleteSubject(id) : Promise.reject())),
  )
}

interface UseDeleteSubjectsOptions {
  mutationConfig?: MutationConfig<typeof deleteSubjects>
}

export function useDeleteSubjects({ mutationConfig }: UseDeleteSubjectsOptions = {}) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: deleteSubjects,
    ...mutationConfig,
    onSuccess: (results, ...rest) => {
      // Una sola invalidación, y solo si se borró al menos una.
      if (results.some((r) => r.status === "fulfilled")) invalidateSubjectRelated(queryClient)
      mutationConfig?.onSuccess?.(results, ...rest)
    },
  })
}
