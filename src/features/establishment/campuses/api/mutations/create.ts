import { env } from "@/config/env"
import { api } from "@/lib/api-client"
import { apiPath } from "@/lib/api-routes"

import type { Campus, CampusDraft } from "@/features/establishment/campuses/api/types/campus"

export interface CreateResult {
  status: "ok" | "error"
  message: string
  campus: Campus
}

/**
 * El binding SQL real (`fn_sed_crear`/`fn_sed_actualizar`) espera `COMUNE`
 * (una sola M) en el body — typo del lado del backend, confirmado contra la
 * query registrada. En vez de tocar esa query, absorbemos la diferencia acá:
 * `commune` (nuestro campo, bien escrito) sale como `comune` en el wire.
 */
function toRealBackendPayload<T extends { commune: string }>(values: T) {
  const { commune, ...rest } = values
  return { ...rest, comune: commune }
}

function toOutgoingPayload<T extends { commune: string }>(values: T) {
  return env.ENABLE_API_MOCKING ? values : toRealBackendPayload(values)
}

// El cliente no manda `id`: lo asigna el backend al crear.
export function create(values: CampusDraft): Promise<CreateResult> {
  return api.post(
    apiPath("/establishments/campuses", "/establecimientos/sedes"),
    toOutgoingPayload(values),
  )
}

/**
 * PATCH, no PUT: el SSO real registra la actualización como
 * `PATCH /establecimientos/sedes/:ID` (`fn_sed_actualizar`). El PUT en ese
 * mismo path es la baja lógica (`fn_sed_soft_delete`), ver `delete.ts`.
 */
export function updateCampus(
  campusId: number,
  values: Campus
): Promise<CreateResult> {
  const url = apiPath(
    `/establishments/campuses/${campusId}`,
    `/establecimientos/sedes/${campusId}`,
  )
  return env.ENABLE_API_MOCKING
    ? api.put(url, toOutgoingPayload(values))
    : api.patch(url, toOutgoingPayload(values))
}
