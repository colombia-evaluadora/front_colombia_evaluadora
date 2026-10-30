import { proveedorMeta } from "@/lib/offline/query-meta"
import { useQuery } from "@tanstack/react-query"

import { evalCol } from "@/lib/eval-col-client"

import type { CampusDetail, CampusStatus } from "@/features/establishment/campuses/api/types/campus"
import { campusKeys } from "@/features/establishment/campuses/api/query-keys"

/** Fila de `fn_sed_detalle` (sso V448): la sede y lo calculado. */
export interface RealCampusDetailRow {
  pk_tsede: number
  codigo: string
  nombre: string
  consecutivo: string | null
  fk_tlv_zona: number | null
  zona_nombre: string | null
  zona_sincronizada: boolean | null
  fk_testablecimiento: number
  establecimiento_nombre: string | null
  comuna: string | null
  barrio: string | null
  direccion: string | null
  telefono: string | null
  jornadas: { id: number; nombre: string; valor: string }[] | null
  atiende_discapacidad: boolean | null
  atiende_victimas_conflicto: boolean | null
  estado: CampusStatus | null
  es_principal: boolean | null
}

export function toCampusDetail(row: RealCampusDetailRow): CampusDetail {
  return {
    id: row.pk_tsede,
    establishmentId: row.fk_testablecimiento,
    establishmentName: row.establecimiento_nombre ?? "",
    consecutive: row.consecutivo ?? "",
    isPrincipal: row.es_principal === true,
    name: row.nombre ?? "",
    dane: row.codigo ?? "",
    zoneId: row.fk_tlv_zona,
    zoneName: row.zona_nombre ?? "",
    zoneSynced: row.zona_sincronizada === true,
    neighborhood: row.barrio ?? "",
    commune: row.comuna ?? "",
    address: row.direccion ?? "",
    phone: row.telefono ?? "",
    workSchedules: (row.jornadas ?? []).map((j) => ({ id: j.id, name: j.nombre })),
    status: row.estado === "I" ? "I" : "A",
    attendsDisability: row.atiende_discapacidad === true,
    attendsConflictVictims: row.atiende_victimas_conflicto === true,
  }
}

// `GET /establecimientos/sedes/:ID`. Sin filas es una sede borrada: la página muestra "no encontrada".
export async function fetchCampus(id: number): Promise<CampusDetail> {
  return toCampusDetail(await evalCol.getRow<RealCampusDetailRow>(`/establecimientos/sedes/${id}`))
}

export function useCampusQuery(id: number | null) {
  return useQuery({
    queryKey: campusKeys.detalle(id ?? "none"),
    meta: proveedorMeta(),
    queryFn: () => fetchCampus(id as number),
    enabled: Boolean(id),
  })
}
