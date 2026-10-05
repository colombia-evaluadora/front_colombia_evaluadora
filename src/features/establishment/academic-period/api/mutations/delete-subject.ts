import { useMutation, useQueryClient, type QueryClient } from "@tanstack/react-query"

import { api } from "@/lib/api-client"
import type { MutationConfig } from "@/lib/react-query"
import { academicPeriodKeys } from "@/features/establishment/academic-period/api/query-keys"

// `PUT /eval-col/areas/asignaturas/eliminar/:ID` — baja definitiva de la
// asignatura (falla si sigue en uso en otro plan/periodo).
function deleteSubject(subjectId: number): Promise<void> {
  return api.put(`/eval-col/areas/asignaturas/eliminar/${subjectId}`)
}

/** Lo que cambia al borrar una asignatura: las listas de áreas/asignaturas
 *  y las asignaturas disponibles para agregar al plan de estudio. */
function invalidateAfterSubjectDelete(queryClient: QueryClient) {
  queryClient.invalidateQueries({ queryKey: academicPeriodKeys.areaSubjects.all })
  queryClient.invalidateQueries({ queryKey: academicPeriodKeys.subjects.all })
  queryClient.invalidateQueries({ queryKey: academicPeriodKeys.subjectDetails.all })
  queryClient.invalidateQueries({ queryKey: academicPeriodKeys.studyPlanAvailable.all })
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
      invalidateAfterSubjectDelete(queryClient)
      mutationConfig?.onSuccess?.(...args)
    },
  })
}

/**
 * Varias bajas en paralelo, sin cortar en la primera que falle (las que
 * siguen en uso no se pueden borrar y eso es esperable). Un id `undefined`
 * cuenta como rechazado. Devuelve el resultado de cada una en el mismo orden.
 */
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
      if (results.some((r) => r.status === "fulfilled")) invalidateAfterSubjectDelete(queryClient)
      mutationConfig?.onSuccess?.(results, ...rest)
    },
  })
}
