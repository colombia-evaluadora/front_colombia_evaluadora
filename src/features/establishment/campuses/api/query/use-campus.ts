import { proveedorMeta } from "@/lib/offline/query-meta"
import { useQuery } from "@tanstack/react-query"

import { api } from "@/lib/api-client"
import { apiPath } from "@/lib/api-routes"
import { unwrapRow } from "@/lib/response-envelope"
import { env } from "@/config/env"

import type { Campus, CampusDetailInfo } from "@/features/establishment/campuses/api/types/campus"
import { campusKeys } from "@/features/establishment/campuses/api/query-keys"

interface CampusQueryResult {
  status: "ok"
  campus: Campus
  /** Solo lectura del detalle real; ausente con mocks. */
  info?: CampusDetailInfo
}

/** Fila cruda de `fn_sed_buscar_por_pk`; `fk_tlv_zona` llega sin resolver. */
interface RealCampusDetailRow {
  pk_tsede: number
  codigo: string
  nombre: string
  fk_tlv_zona: number | null
  fk_testablecimiento: number
  consecutivo: string | null
  localidad: string | null
  georeferenciacion: string | null
  establecimiento_nombre: string | null
  jornadas: string[] | null
  atiende_discapacidad: boolean | null
  atiende_victimas_conflicto: boolean | null
  comuna: string | null
  barrio: string | null
  direccion: string | null
  telefono: string | null
}

// `zone` sin code/name: la query no resuelve TLISTA_VALOR; lo completa dialog-manage.
function toCampus(row: RealCampusDetailRow): Campus {
  return {
    id: row.pk_tsede,
    name: row.nombre,
    dane: row.codigo ?? "",
    zone: row.fk_tlv_zona === null ? null : { id: row.fk_tlv_zona, code: "", name: "" },
    neighborhood: row.barrio ?? "",
    commune: row.comuna ?? "",
    address: row.direccion ?? "",
    phone: row.telefono ?? "",
    locality: row.localidad ?? "",
    georeference: row.georeferenciacion ?? "",
    // Inmutable en edición; se arrastra para filtrar el catálogo de zonas.
    establishmentId: row.fk_testablecimiento,
  }
}

function toCampusDetailInfo(row: RealCampusDetailRow): CampusDetailInfo {
  return {
    establishmentName: row.establecimiento_nombre ?? "",
    consecutive: row.consecutivo ?? "",
    workSchedules: row.jornadas ?? [],
    attendsDisability: row.atiende_discapacidad === true,
    attendsConflictVictims: row.atiende_victimas_conflicto === true,
  }
}

async function fetchCampus(id: number): Promise<CampusQueryResult> {
  if (env.ENABLE_API_MOCKING) {
    return api.get(apiPath(`/establishments/campuses/${id}`, `/establecimientos/sedes/${id}`))
  }

  const row = unwrapRow<RealCampusDetailRow>(
    (await api.get(`/eval-col/establecimientos/sedes/${id}`)) as unknown as
      | { rows: RealCampusDetailRow[] }
      | RealCampusDetailRow,
  )
  return { status: "ok", campus: toCampus(row), info: toCampusDetailInfo(row) }
}

export function useCampusQuery(id: number | null, enabled = true) {
  return useQuery({
    queryKey: campusKeys.detalle(id),
    meta: proveedorMeta(),
    queryFn: () => fetchCampus(id as number),
    enabled: enabled && Boolean(id),
  })
}
