import { env } from "@/config/env"
import { api } from "@/lib/api-client"
import { apiPath } from "@/lib/api-routes"
import { unwrapRow } from "@/lib/response-envelope"
import type { EstablishmentDetails } from "@/features/establishment/institution/api/types/establishment"

export interface CreateResult {
  status: "ok" | "error"
  message: string
  establishment: EstablishmentDetails
}

/**
 * Adapta `EstablishmentDetails` al contrato del binding SQL real
 * (`fn_est_crear` / `fn_est_actualizar`):
 *
 * - `principal`/`secretary`: el binding castea `:BODY.PRINCIPAL` directo a
 *   `BIGINT` (espera el id de la persona ya persistida, no el objeto
 *   completo que arma `UserDetailsForm`).
 * - `address.district/commune/locality`: son VARCHAR de texto libre en la
 *   base (`BARRIO`, `COMUNA`, `LOCALIDAD`), no catálogos — el front los
 *   modela como `CatalogItem | null` solo para reusar el `<Select>`, pero acá
 *   hay que mandar el texto (`.name`), no el objeto.
 * - `ownershipType`, `address.zone`, `address.municipality`, y los 5 de
 *   `additionalInfo` (calendar/teachingLanguage/costRegime/
 *   populationGender/tuitionRange/disabilityType): son `CatalogItem | null`
 *   en el front pero cada uno se aplana a su `id` a secas. El validador de
 *   placeholders de la plataforma recorre TODO el JSON del body — mandar el
 *   objeto completo (con `.code`/`.name` de más, sin tipo declarado en la
 *   query) hace que rechace la petición entera aunque `.id` sí esté
 *   declarado. Mismo motivo por el que se aplanó `zone` en sedes
 *   (campuses/api/mutations/create.ts) — las queries 40/87 ya se
 *   actualizaron para esperar `BODY.X` en vez de `BODY.X.ID`.
 *
 * `additionalInfo.licenseStatus` ya es texto libre (`string`) en el tipo de
 * dominio, así que viaja tal cual dentro de `additionalInfo` — sin mapeo.
 */
function toRealBackendPayload(values: EstablishmentDetails) {
  // `id` se saca a propósito: ni la query de crear ni la de actualizar
  // declaran `BODY.ID` (el PK de actualizar va por la URL, `PARAM.ID`) — si
  // viaja igual, el validador de placeholders lo rechaza como el resto de
  // los campos sin tipo declarado.
  const { id: _id, principal, secretary, basicInfo, address, additionalInfo: fullAdditionalInfo, ...rest } = values
  // `operatingLicense` no tiene columna real detrás (`LICENCIA_FUNCIONAMIENTO`
  // es el VARCHAR que ya cubre `licenseStatus`) ni está declarado en la
  // query — viaja igual si no se saca, y queda como leaf sin tipo.
  const { operatingLicense: _operatingLicense, ...additionalInfo } = fullAdditionalInfo

  return {
    ...rest,
    basicInfo: {
      ...basicInfo,
      ownershipType: basicInfo.ownershipType?.id ?? null,
    },
    address: {
      ...address,
      zone: address.zone?.id ?? null,
      municipality: address.municipality?.id ?? null,
      district: address.district?.name ?? null,
      commune: address.commune?.name ?? null,
      locality: address.locality?.name ?? null,
    },
    additionalInfo: {
      ...additionalInfo,
      calendar: additionalInfo.calendar?.id ?? null,
      teachingLanguage: additionalInfo.teachingLanguage?.id ?? null,
      costRegime: additionalInfo.costRegime?.id ?? null,
      populationGender: additionalInfo.populationGender?.id ?? null,
      tuitionRange: additionalInfo.tuitionRange?.id ?? null,
      disabilityType: additionalInfo.disabilityType?.id ?? null,
    },
    principal: principal?.id ?? null,
    secretary: secretary?.id ?? null,
  }
}

/**
 * El mock espera `EstablishmentDetails` en camelCase tal cual; el backend
 * real espera el contrato adaptado por `toRealBackendPayload`. Alternar acá
 * evita tener dos implementaciones de `create`/`updateEstablishment`.
 */
function toOutgoingPayload(values: EstablishmentDetails) {
  return env.ENABLE_API_MOCKING ? values : toRealBackendPayload(values)
}

/**
 * En real, la respuesta es `{ rows: [{ pk_establecimiento_creado }] }` (ver
 * `unwrapRow`) — no el `EstablishmentDetails` completo que arma el mock. Se
 * sintetiza un `CreateResult` con lo mínimo que necesita el caller (el id
 * nuevo, para poder enlazar rector/secretaria después de crear); no hay
 * round-trip a un GET por detalle acá.
 */
interface RealCreateRow {
  pk_establecimiento_creado: number
}

export async function create(values: EstablishmentDetails): Promise<CreateResult> {
  // El response interceptor de `api` ya desenvuelve `response.data` en
  // runtime; el tipo de Axios no lo refleja (ver use-user-by-document.ts
  // para el mismo patrón).
  const response = (await api.post(
    apiPath("/establishments", "/establecimientos"),
    toOutgoingPayload(values),
  )) as unknown as CreateResult | RealCreateRow | { rows: RealCreateRow[] }

  if (env.ENABLE_API_MOCKING) return response as CreateResult

  const row = unwrapRow<RealCreateRow>(response as RealCreateRow | { rows: RealCreateRow[] })
  return {
    status: "ok",
    message: "Establecimiento creado.",
    establishment: { ...values, id: row.pk_establecimiento_creado },
  }
}

/**
 * PATCH, no PUT: el registrado en el SSO real para actualizar es
 * `PATCH /establecimientos/:ID` (llama a `fn_est_actualizar`, un PATCH
 * parcial de verdad). `PUT /establecimientos/:ID` es otra cosa — la baja
 * lógica (`fn_est_soft_delete`), ver `delete.ts`.
 */
export function updateEstablishment(
  establishmentId: number,
  values: EstablishmentDetails
): Promise<CreateResult> {
  const url = apiPath(`/establishments/${establishmentId}`, `/establecimientos/${establishmentId}`)
  return env.ENABLE_API_MOCKING
    ? api.put(url, toOutgoingPayload(values))
    : api.patch(url, toOutgoingPayload(values))
}
