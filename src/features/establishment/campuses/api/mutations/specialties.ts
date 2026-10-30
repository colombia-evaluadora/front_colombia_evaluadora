import { useMutation, useQueryClient } from "@tanstack/react-query"

import { evalCol } from "@/lib/eval-col-client"
import type { MutationConfig } from "@/lib/react-query"
import { campusKeys } from "@/features/establishment/campuses/api/query-keys"
import type { CampusSpecialtyValues } from "@/features/establishment/campuses/api/types/campus"

// Body de las escrituras del catálogo (sso V449): el nombre propio solo con "Otra".
function toBody(values: CampusSpecialtyValues, isOther: boolean) {
  return {
    character: values.characterId,
    specialty: values.specialtyId,
    ownName: isOther ? values.ownName.trim() : null,
    status: values.status,
  }
}

export interface SaveCampusSpecialtyInput {
  campusId: number
  /** `null` agrega; con id modifica ese ítem. */
  specialtyItemId: number | null
  values: CampusSpecialtyValues
  isOther: boolean
}

export async function saveCampusSpecialty({ campusId, specialtyItemId, values, isOther }: SaveCampusSpecialtyInput) {
  if (specialtyItemId == null) {
    await evalCol.postRow(`/establecimientos/sedes/${campusId}/especialidades`, toBody(values, isOther))
    return
  }
  await evalCol.patchRow(`/establecimientos/sedes/especialidades/${specialtyItemId}`, toBody(values, isOther))
}

export interface DeleteCampusSpecialtyInput {
  campusId: number
  specialtyItemId: number
}

/** Baja lógica; si la usan asignaturas o matrículas responde 409 con la lista y solo se puede inactivar. */
export async function deleteCampusSpecialty({ specialtyItemId }: DeleteCampusSpecialtyInput) {
  await evalCol.put(`/establecimientos/sedes/especialidades/${specialtyItemId}/eliminar`)
}

export function useSaveCampusSpecialty({
  mutationConfig,
}: { mutationConfig?: MutationConfig<typeof saveCampusSpecialty> } = {}) {
  const queryClient = useQueryClient()
  const { onSuccess, ...rest } = mutationConfig ?? {}
  return useMutation({
    mutationFn: saveCampusSpecialty,
    ...rest,
    onSuccess: (...args) => {
      queryClient.invalidateQueries({ queryKey: campusKeys.especialidades(args[1].campusId) })
      onSuccess?.(...args)
    },
  })
}

export function useDeleteCampusSpecialty({
  mutationConfig,
}: { mutationConfig?: MutationConfig<typeof deleteCampusSpecialty> } = {}) {
  const queryClient = useQueryClient()
  const { onSuccess, ...rest } = mutationConfig ?? {}
  return useMutation({
    mutationFn: deleteCampusSpecialty,
    ...rest,
    onSuccess: (...args) => {
      queryClient.invalidateQueries({ queryKey: campusKeys.especialidades(args[1].campusId) })
      onSuccess?.(...args)
    },
  })
}
