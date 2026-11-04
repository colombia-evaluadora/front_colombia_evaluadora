import { evalCol } from "@/lib/eval-col-client"

import type { CampusFormValues } from "@/features/establishment/campuses/api/types/campus"
import { sameInfluenceArea, type InfluenceArea } from "@/features/establishment/campuses/lib/geo"

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
    // "latitud,longitud"; vacía no cambia la guardada (es obligatoria).
    georeference: values.location.trim() || null,
  }
}

/**
 * El área viaja como texto GeoJSON (`BODY.INFLUENCEAREA` es JSONB, como los
 * campos JSONB del planeador). `"null"` la quita; sin la clave, no cambia.
 */
function influenceAreaBody(area: InfluenceArea | null, original: InfluenceArea | null | undefined) {
  if (original !== undefined && sameInfluenceArea(area, original)) return {}
  if (!area) return original ? { influenceArea: "null" } : {}
  return { influenceArea: JSON.stringify(area) }
}

/** Crea una sede anexa: el establecimiento solo viaja en el alta (después solo lo cambia Mover). */
export async function createCampus(values: CampusFormValues): Promise<number> {
  const row = await evalCol.postRow<{ pk_sede_creada: number }>("/establecimientos/sedes", {
    ...toBody(values),
    ...influenceAreaBody(values.influenceArea, null),
    establishmentId: values.establishmentId,
  })
  return Number(row.pk_sede_creada)
}

export interface UpdateCampusInput {
  campusId: number
  values: CampusFormValues
  /** En la principal, nombre, DANE, domicilio y consecutivo vienen del establecimiento: no se mandan. */
  isPrincipal: boolean
  /**
   * Mover a otro establecimiento (Regla 75, solo Superadministrador): el mismo
   * PATCH lleva el destino y el SSO lo aplica en la misma transacción.
   */
  moveTo?: number | null
  /** El área guardada: solo se manda si cambió. */
  originalInfluenceArea?: InfluenceArea | null
}

export async function updateCampus({
  campusId,
  values,
  isPrincipal,
  moveTo,
  originalInfluenceArea,
}: UpdateCampusInput): Promise<number> {
  const body = toBody(values)
  const area = influenceAreaBody(values.influenceArea, originalInfluenceArea)
  // Ubicación y área se editan como en cualquier sede, también en la principal (Regla 85).
  const payload = isPrincipal
    ? { zone: body.zone, workSchedules: body.workSchedules, georeference: body.georeference, ...area }
    : moveTo != null
      ? { ...body, ...area, establishmentId: moveTo }
      : { ...body, ...area }
  const row = await evalCol.patchRow<{ pk_sede_actualizada: number }>(`/establecimientos/sedes/${campusId}`, payload)
  return Number(row.pk_sede_actualizada)
}
