import { evalCol } from "@/lib/eval-col-client"

import type { CampusFormValues } from "@/features/establishment/campuses/api/types/campus"

/**
 * Body de `POST` / `PATCH /establecimientos/sedes` (sso V449). El validador de
 * placeholders rechaza cualquier hoja no declarada, así que se arma a mano:
 * `zone` va como id y `comune` conserva el typo del backend.
 */
function toBody(values: CampusFormValues) {
  return {
    name: values.name.trim(),
    dane: values.dane.trim(),
    zone: values.zoneId,
    consecutive: values.consecutive.trim(),
    neighborhood: values.neighborhood.trim(),
    comune: values.commune.trim(),
    address: values.address.trim(),
    phone: values.phone.trim(),
    workSchedules: values.workScheduleIds,
  }
}

/** Crea una sede anexa: el establecimiento solo viaja en el alta (después es inmutable). */
export async function createCampus(values: CampusFormValues): Promise<number> {
  const row = await evalCol.postRow<{ pk_sede_creada: number }>("/establecimientos/sedes", {
    ...toBody(values),
    establishmentId: values.establishmentId,
  })
  return Number(row.pk_sede_creada)
}

export interface UpdateCampusInput {
  campusId: number
  values: CampusFormValues
  /** En la principal, nombre, DANE, domicilio y consecutivo vienen del establecimiento: no se mandan. */
  isPrincipal: boolean
}

export async function updateCampus({ campusId, values, isPrincipal }: UpdateCampusInput): Promise<number> {
  const body = toBody(values)
  const payload = isPrincipal ? { zone: body.zone, workSchedules: body.workSchedules } : body
  const row = await evalCol.patchRow<{ pk_sede_actualizada: number }>(`/establecimientos/sedes/${campusId}`, payload)
  return Number(row.pk_sede_actualizada)
}
