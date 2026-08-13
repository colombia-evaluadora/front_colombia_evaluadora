import { env } from "@/config/env"
import { api } from "@/lib/api-client"
import { toUpperKeys } from "@/lib/uppercase-keys"
import type { EstablishmentDetails } from "@/features/establishment/institution/api/types/establishment"

export interface CreateResult {
  status: "ok" | "error"
  message: string
  establishment: EstablishmentDetails
}

/**
 * Adapta `EstablishmentDetails` al contrato del binding SQL real
 * (`fn_est_crear` / `fn_est_actualizar`), que difiere del modelo interno en
 * tres puntos:
 *
 * - `principal`/`secretary`: el binding castea `:BODY.PRINCIPAL` directo a
 *   `BIGINT` (espera el id de la persona ya persistida, no el objeto
 *   completo que arma `UserDetailsForm`).
 * - `address.district/commune/locality`: son VARCHAR de texto libre en la
 *   base (`BARRIO`, `COMUNA`, `LOCALIDAD`), no catálogos — el front los
 *   modela como `CatalogItem | null` solo para reusar el `<Select>`, pero acá
 *   hay que mandar el texto (`.name`), no el objeto.
 * - `additionalInfo.licenseStatus`: no tiene columna en la función (el único
 *   parámetro relacionado, `p_licencia_funcionamiento`, es VARCHAR libre sin
 *   relación confirmada con este catálogo). Se omite hasta que el equipo de
 *   backend confirme qué debe llevar ese campo — mandar el id del catálogo
 *   ahí es lo que está mal hoy.
 *
 * Después de armar esta forma, `toUpperKeys` traduce todas las keys a
 * mayúsculas porque el binding resuelve los paths del body en mayúsculas
 * (`:BODY.BASICINFO.NAME`) de forma case-sensitive.
 */
function toRealBackendPayload(values: EstablishmentDetails) {
  const { principal, secretary, address, additionalInfo, ...rest } = values
  const { licenseStatus: _licenseStatus, ...additionalInfoWithoutLicenseStatus } = additionalInfo

  return toUpperKeys({
    ...rest,
    address: {
      ...address,
      district: address.district?.name ?? null,
      commune: address.commune?.name ?? null,
      locality: address.locality?.name ?? null,
    },
    additionalInfo: additionalInfoWithoutLicenseStatus,
    principal: principal?.id ?? null,
    secretary: secretary?.id ?? null,
  })
}

/**
 * El mock espera `EstablishmentDetails` en camelCase tal cual; el backend
 * real espera el contrato adaptado por `toRealBackendPayload`. Alternar acá
 * evita tener dos implementaciones de `create`/`updateEstablishment`.
 */
function toOutgoingPayload(values: EstablishmentDetails) {
  return env.ENABLE_API_MOCKING ? values : toRealBackendPayload(values)
}

export function create(values: EstablishmentDetails): Promise<CreateResult> {
  return api.post("/establishments", toOutgoingPayload(values))
}

export function updateEstablishment(
  establishmentId: number,
  values: EstablishmentDetails
): Promise<CreateResult> {
  return api.put(`/establishments/${establishmentId}`, toOutgoingPayload(values))
}
