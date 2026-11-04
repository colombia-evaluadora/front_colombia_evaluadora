import { useMutation, useQueryClient } from "@tanstack/react-query"

import { evalCol } from "@/lib/eval-col-client"
import type { MutationConfig } from "@/lib/react-query"
import { invalidateCampuses } from "@/features/establishment/campuses/api/mutations/invalidate-campuses"
import { establishmentKeys } from "@/features/establishment/institution/api/query-keys"
import type { EstablishmentDetails } from "@/features/establishment/institution/api/types/establishment"

export interface ConvertCampusInput {
  campusId: number
  /** El establecimiento a crear, con rector y secretaria ya guardados (llevan `id`). */
  values: EstablishmentDetails
}

/**
 * `POST /establecimientos/sedes/:ID/convertir` (sso V576, Regla 92). El cuerpo es
 * el del alta del establecimiento, pero solo con lo obligatorio y lo que viene de
 * la sede: el validador de placeholders rechaza cualquier hoja no declarada.
 */
function toBody({ basicInfo, address, contact, additionalInfo, principal, secretary }: EstablishmentDetails) {
  return {
    basicInfo: {
      name: basicInfo.name.trim(),
      dane: basicInfo.dane.trim(),
      nit: basicInfo.nit.trim(),
      ownershipType: basicInfo.ownershipType?.id ?? null,
      serviceModality: basicInfo.serviceModality?.id ?? null,
    },
    address: {
      municipality: address.municipality?.id ?? null,
      zone: address.zone?.id ?? null,
      district: address.district?.name.trim() || null,
      commune: address.commune?.name.trim() || null,
      address: address.address.trim() || null,
    },
    contact: { phone: contact.phone.trim() || null },
    additionalInfo: { calendar: additionalInfo.calendar?.id ?? null },
    principal: principal?.id ?? null,
    secretary: secretary?.id ?? null,
  }
}

/** Devuelve el PK del establecimiento creado. */
export async function convertCampus({ campusId, values }: ConvertCampusInput): Promise<number> {
  const row = await evalCol.postRow<{ pk_establecimiento_creado: number }>(
    `/establecimientos/sedes/${campusId}/convertir`,
    toBody(values),
  )
  return Number(row.pk_establecimiento_creado)
}

export function useConvertCampus({ mutationConfig }: { mutationConfig?: MutationConfig<typeof convertCampus> } = {}) {
  const queryClient = useQueryClient()
  const { onSuccess, ...rest } = mutationConfig ?? {}
  return useMutation({
    mutationFn: convertCampus,
    ...rest,
    onSuccess: (...args) => {
      invalidateCampuses(queryClient)
      // Hay un establecimiento nuevo: el listado y los selectores de EE cambian.
      queryClient.invalidateQueries({ queryKey: establishmentKeys.all })
      onSuccess?.(...args)
    },
  })
}
