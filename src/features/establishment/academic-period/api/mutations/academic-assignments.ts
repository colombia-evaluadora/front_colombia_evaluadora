import { useMutation, useQueryClient } from "@tanstack/react-query"

import { api } from "@/lib/api-client"
import type { MutationConfig } from "@/lib/react-query"
import type { AcademicAssignmentStatus } from "@/features/establishment/academic-period/api/types/academic-assignment"
import { academicPeriodKeys } from "@/features/establishment/academic-period/api/query-keys"

interface SaveAcademicAssignmentInput {
  academicPeriodId: number
  // Con id modifica esa asignación (un solo grupo); sin id crea una por grupo.
  id?: number
  funcionarioId: string
  groupIds: number[]
  subjectId: number
}

// `POST /eval-col/asignaciones/crear` y `PUT /eval-col/asignaciones/:id`
// (Sección 5.4). El back valida la asignación única por Grupo y [Área]
// (Regla 69) y que el docente tenga el rol activo en la Sede y Jornada (Regla 68).
function saveAcademicAssignment({
  academicPeriodId,
  id,
  funcionarioId,
  groupIds,
  subjectId,
}: SaveAcademicAssignmentInput) {
  if (id != null) {
    return api.put(`/eval-col/asignaciones/${id}`, {
      FK_FUNCIONARIO: funcionarioId,
      FK_GRUPO: groupIds[0],
      FK_ASIGNATURA: subjectId,
    })
  }
  return api.post("/eval-col/asignaciones/crear", {
    ACADEMIC_PERIOD_ID: academicPeriodId,
    FK_FUNCIONARIO: funcionarioId,
    FK_GRUPOS: groupIds,
    FK_ASIGNATURA: subjectId,
  })
}

function setAcademicAssignmentStatus({
  id,
  status,
}: {
  id: number
  status: AcademicAssignmentStatus
}) {
  return api.patch(`/eval-col/asignaciones/${id}/estado`, { ESTADO: status })
}

// Se permite siempre (Regla 70): lo registrado queda sin propietario.
function deleteAcademicAssignment({ id }: { id: number }) {
  return api.patch(`/eval-col/asignaciones/${id}/eliminar`)
}

function useAssignmentMutation<TVars>(
  mutationFn: (vars: TVars) => Promise<unknown>,
  mutationConfig?: MutationConfig<(vars: TVars) => Promise<unknown>>,
) {
  const queryClient = useQueryClient()
  const { onSuccess, ...rest } = mutationConfig ?? {}
  return useMutation({
    mutationFn,
    ...rest,
    onSuccess: (...args) => {
      queryClient.invalidateQueries({ queryKey: academicPeriodKeys.academicAssignments.all })
      // Gestión Académica y el pool anterior leen de estas.
      queryClient.invalidateQueries({ queryKey: academicPeriodKeys.teacherAssignments.all })
      queryClient.invalidateQueries({ queryKey: academicPeriodKeys.assignmentSubjects.all })
      onSuccess?.(...args)
    },
  })
}

export const useSaveAcademicAssignment = (
  options: { mutationConfig?: MutationConfig<typeof saveAcademicAssignment> } = {},
) => useAssignmentMutation(saveAcademicAssignment, options.mutationConfig)

export const useSetAcademicAssignmentStatus = (
  options: { mutationConfig?: MutationConfig<typeof setAcademicAssignmentStatus> } = {},
) => useAssignmentMutation(setAcademicAssignmentStatus, options.mutationConfig)

export const useDeleteAcademicAssignment = (
  options: { mutationConfig?: MutationConfig<typeof deleteAcademicAssignment> } = {},
) => useAssignmentMutation(deleteAcademicAssignment, options.mutationConfig)
