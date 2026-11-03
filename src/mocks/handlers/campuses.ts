import { delay, http, HttpResponse } from "msw"

import { campusesDb, takeNextCampusId, upsertCampusDetails } from "@/mocks/db/campuses"
import {
  campusDetailsDb,
  campusSpecialtiesDb,
  SPECIALTIES_IN_USE,
  SPECIALTY_CATALOG,
  takeNextSpecialtyItemId,
} from "@/mocks/db/campus-details"
import { establishmentsRowsDb, upsertEstablishmentDetails } from "@/mocks/db/establishments"
import { jornadasDb } from "@/mocks/db/academic-period/jornadas"
import { ZONES } from "@/mocks/db/catalogs/establishment"

import type { Campus, CampusStatus } from "@/features/establishment/campuses/api/types/campus"
import type { InfluenceArea } from "@/features/establishment/campuses/lib/geo"
import { env } from "@/config/env"
import type { RealCampusRow } from "@/features/establishment/campuses/api/query/use-campuses"
import type { RealCampusDetailRow } from "@/features/establishment/campuses/api/query/use-campus"
import type { SedeOption, SedesOptionsResponse } from "@/features/establishment/academic-period/api/types/sede-option"
import type { EstablishmentDetails } from "@/features/establishment/institution/api/types/establishment"

/**
 * Sedes con las rutas y formas del SSO real (`/eval-col/establecimientos/sedes/*`,
 * sso V449): el front tiene un solo camino y estos handlers lo imitan.
 */

const conflict = (message: string) => HttpResponse.json({ status: 409, message }, { status: 409 })
const badRequest = (message: string) => HttpResponse.json({ status: 400, message }, { status: 400 })

function establishmentName(id: number) {
  return establishmentsRowsDb.find((e) => e.id === id)?.name ?? ""
}

function scheduleNames(ids: number[]) {
  return jornadasDb.filter((j) => ids.includes(j.id)).map((j) => j.name)
}

function toRow(campus: Campus): RealCampusRow {
  const detail = campusDetailsDb.get(campus.id)!
  return {
    pk_sede: campus.id,
    codigo: campus.dane,
    nombre: campus.name,
    consecutivo: detail.consecutive,
    es_principal: detail.consecutive === "1",
    fk_establecimiento: detail.establishmentId,
    establecimiento_nombre: establishmentName(detail.establishmentId),
    fk_zona: campus.zone?.id ?? null,
    zona_nombre: campus.zone?.name ?? null,
    jornadas: scheduleNames(detail.workScheduleIds).join(", "),
    estado: detail.status,
  }
}

function toDetailRow(campus: Campus): RealCampusDetailRow {
  const detail = campusDetailsDb.get(campus.id)!
  return {
    ...toRow(campus),
    pk_tsede: campus.id,
    fk_tlv_zona: campus.zone?.id ?? null,
    zona_sincronizada: detail.consecutive === "1",
    fk_testablecimiento: detail.establishmentId,
    comuna: campus.commune,
    barrio: campus.neighborhood,
    direccion: campus.address,
    telefono: campus.phone,
    jornadas: jornadasDb
      .filter((j) => detail.workScheduleIds.includes(j.id))
      .map((j) => ({ id: j.id, nombre: j.name, valor: j.name })),
    georeferenciacion: detail.location,
    area_influencia: detail.influenceArea,
    atiende_discapacidad: campus.id % 2 === 0,
    atiende_victimas_conflicto: campus.id % 3 === 0,
  }
}

function sortValue(row: RealCampusRow, id: string) {
  if (id === "consecutive") return Number(row.consecutivo)
  if (id === "name") return row.nombre
  if (id === "dane") return row.codigo
  if (id === "zone") return row.zona_nombre ?? ""
  if (id === "status") return row.estado
  return row.establecimiento_nombre + String(row.consecutivo).padStart(2, "0")
}

/** Fila de `fn_sed_listar_todos` (opciones de sedes): con estado y jornadas (sso V52). */
export function toSedeOptionRow(campus: Campus): SedeOption {
  const detail = campusDetailsDb.get(campus.id)
  return {
    pk_sede: campus.id,
    codigo: campus.dane,
    nombre: campus.name,
    fk_tlv_zona: campus.zone?.id ?? 0,
    zona_nombre: campus.zone?.name ?? "",
    barrio: campus.neighborhood,
    comuna: campus.commune,
    direccion: campus.address,
    telefono: campus.phone,
    fk_establecimiento: detail?.establishmentId ?? 0,
    estado: detail?.status ?? "A",
    jornadas: jornadasDb
      .filter((j) => detail?.workScheduleIds.includes(j.id))
      .map((j) => ({ id: j.id, nombre: j.name, valor: j.name })),
  }
}

/** En el mock, la sede 4 (anexa) tiene procesos en curso: se advierten al moverla o convertirla. */
function processesOf(campusId: number) {
  return campusId === 4
    ? { inscripciones: 12, reservas: 0, periodos_abiertos: 1, periodos_inscripciones: 0 }
    : { inscripciones: 0, reservas: 0, periodos_abiertos: 0, periodos_inscripciones: 0 }
}

const asList = (value: unknown) => (Array.isArray(value) ? value.map(String) : [])

function nextConsecutive(establishmentId: number): number | null {
  const used = new Set(
    [...campusDetailsDb.values()].filter((d) => d.establishmentId === establishmentId).map((d) => Number(d.consecutive)),
  )
  for (let n = 2; n <= 99; n += 1) if (!used.has(n)) return n
  return null
}

interface CampusBody {
  name?: string
  dane?: string
  zone?: number | null
  consecutive?: string
  neighborhood?: string
  comune?: string
  address?: string
  phone?: string
  workSchedules?: number[]
  establishmentId?: number
  georeference?: string | null
  /** GeoJSON como texto; "null" quita el área. */
  influenceArea?: string
}

// Las validaciones que el usuario puede disparar desde el formulario, con los textos del SSO.
function validateBody(body: CampusBody, establishmentId: number, ownId: number | null): string | null {
  if (body.workSchedules && body.workSchedules.length === 0) return "Seleccione al menos una jornada para la sede."
  if (body.dane != null && campusesDb.some((c) => c.dane === body.dane && c.id !== ownId)) {
    return "El Código DANE antiguo ya está registrado en otra sede."
  }
  if (
    body.consecutive != null &&
    [...campusDetailsDb.entries()].some(
      ([id, d]) => id !== ownId && d.establishmentId === establishmentId && Number(d.consecutive) === Number(body.consecutive),
    )
  ) {
    return `El consecutivo ${Number(body.consecutive)} ya existe en el establecimiento. Elija otro.`
  }
  return null
}

function applyBody(campus: Campus, body: CampusBody): Campus {
  return {
    ...campus,
    name: body.name ?? campus.name,
    dane: body.dane ?? campus.dane,
    zone: body.zone != null ? (ZONES.find((z) => z.id === body.zone) ?? campus.zone) : campus.zone,
    neighborhood: body.neighborhood ?? campus.neighborhood,
    commune: body.comune ?? campus.commune,
    address: body.address ?? campus.address,
    phone: body.phone ?? campus.phone,
  }
}

export const campusHandlers = [
  // Geocodificador (Nominatim): con mocks no se sale a internet. Una dirección con
  // "sin mapa" no se encuentra; el resto cae cerca de Valledupar.
  http.get(env.GEOCODER_URL, async ({ request }) => {
    await delay(400)
    const q = new URL(request.url).searchParams.get("q") ?? ""
    if (/sin mapa/i.test(q)) return HttpResponse.json([])
    return HttpResponse.json([{ lat: "10.473600", lon: "-73.253900", display_name: q }])
  }),

  // Antes de `/sedes/:id`: MSW usa la primera ruta que coincide. En el mock se puede crear en todos.
  http.get("*/api/eval-col/establecimientos/sedes/establecimientos-disponibles", async () => {
    await delay(150)
    return HttpResponse.json({ rows: establishmentsRowsDb.map((e) => ({ id: e.id, name: e.name })) })
  }),

  http.get("*/api/establishments/campuses/options", async () => {
    await delay(150)
    // Las opciones llevan estado y jornadas (permisos de funcionarios: Reglas 84 y 100).
    return HttpResponse.json({
      rows: campusesDb.map((campus) => {
        const option = toSedeOptionRow(campus)
        return {
          ...campus,
          status: option.estado,
          workSchedules: (option.jornadas ?? []).map((j) => ({ id: j.id, name: j.nombre })),
        }
      }),
    })
  }),

  // DTO real (`fn_sed_listar_todos`) para `useSedeOptionsQuery`; sin él el mock pierde sedes.
  http.get("*/api/eval-col/establecimientos/sedes/opciones", async () => {
    await delay(150)
    return HttpResponse.json<SedesOptionsResponse>({
      rows: campusesDb.map(toSedeOptionRow),
    })
  }),

  http.post("*/api/eval-col/establecimientos/sedes/query", async ({ request }) => {
    await delay(250)
    const body = (await request.json().catch(() => null)) as {
      filters?: Record<string, unknown>
      sorting?: { id?: string; desc?: boolean } | null
      pageIndex?: number
      pageSize?: number
    } | null
    const filters = body?.filters ?? {}
    const search = typeof filters.search === "string" ? filters.search.trim().toLowerCase() : ""
    const establishments = asList(filters.establishments)
    const zones = asList(filters.zones)
    const workSchedules = asList(filters.workSchedules)
    const statuses = asList(filters.statuses)

    let rows = campusesDb.map(toRow).filter((row) => {
      if (search && !row.nombre.toLowerCase().includes(search) && !row.codigo.includes(search)) return false
      if (establishments.length && !establishments.includes(String(row.fk_establecimiento))) return false
      if (zones.length && !zones.includes(ZONES.find((z) => z.id === row.fk_zona)?.code ?? "")) return false
      if (workSchedules.length && !workSchedules.some((j) => (row.jornadas ?? "").split(", ").includes(j))) return false
      if (statuses.length && !statuses.includes(row.estado)) return false
      return true
    })
    const sortId = body?.sorting?.id ?? ""
    rows = [...rows].sort((a, b) => {
      const av = sortValue(a, sortId)
      const bv = sortValue(b, sortId)
      return av === bv ? 0 : av > bv ? 1 : -1
    })
    if (body?.sorting?.desc) rows.reverse()

    const pageSize = Number(body?.pageSize) > 0 ? Number(body?.pageSize) : 10
    const pageIndex = Math.max(Number(body?.pageIndex) || 0, 0)
    return HttpResponse.json({
      rows: [
        {
          rows: rows.slice(pageIndex * pageSize, (pageIndex + 1) * pageSize),
          total_count: rows.length,
          page_count: Math.ceil(rows.length / pageSize),
          page_index: pageIndex,
          page_size: pageSize,
        },
      ],
    })
  }),

  http.get("*/api/eval-col/establecimientos/sedes/especialidades/catalogo", async () => {
    await delay(150)
    return HttpResponse.json({ rows: SPECIALTY_CATALOG })
  }),

  http.patch("*/api/eval-col/establecimientos/sedes/especialidades/:id", async ({ params, request }) => {
    await delay(250)
    const item = campusSpecialtiesDb.find((s) => s.id === Number(params.id))
    if (!item) return HttpResponse.json({ message: "No se encontró la especialidad en el catálogo de la sede." }, { status: 404 })
    const body = (await request.json()) as { specialty: number; ownName: string | null; status: CampusStatus }
    item.specialtyId = body.specialty
    item.ownName = body.ownName
    item.status = body.status
    return HttpResponse.json({ rows: [{ pk_sede_especialidad: item.id }] })
  }),

  http.put("*/api/eval-col/establecimientos/sedes/especialidades/:id/eliminar", async ({ params }) => {
    await delay(250)
    const index = campusSpecialtiesDb.findIndex((s) => s.id === Number(params.id))
    if (index < 0) return HttpResponse.json({ message: "No se encontró la especialidad en el catálogo de la sede." }, { status: 404 })
    const item = campusSpecialtiesDb[index]
    if (SPECIALTIES_IN_USE.has(item.specialtyId)) {
      const name = SPECIALTY_CATALOG.find((c) => c.id === item.specialtyId)?.nombre ?? ""
      return conflict(
        `No se puede eliminar la especialidad ${name} porque la usan: 2 asignaturas (Contabilidad, Gestión empresarial) y 38 matrículas con Carácter/Especialidad/Énfasis ${name}. Puede inactivarla.`,
      )
    }
    campusSpecialtiesDb.splice(index, 1)
    return HttpResponse.json({ rows: [{ pk_sede_especialidad: item.id }] })
  }),

  http.get("*/api/eval-col/establecimientos/sedes/:id/especialidades", async ({ params }) => {
    await delay(150)
    const rows = campusSpecialtiesDb
      .filter((s) => s.campusId === Number(params.id))
      .map((s) => {
        const c = SPECIALTY_CATALOG.find((x) => x.id === s.specialtyId)!
        return {
          pk_sede_especialidad: s.id,
          fk_caracter: c.fk_caracter,
          caracter_nombre: c.caracter_nombre,
          fk_especialidad: c.id,
          especialidad_nombre: c.nombre,
          nombre_propio: s.ownName,
          es_otra: c.es_otra,
          estado: s.status,
        }
      })
    return HttpResponse.json({ rows })
  }),

  http.post("*/api/eval-col/establecimientos/sedes/:id/especialidades", async ({ params, request }) => {
    await delay(250)
    const campusId = Number(params.id)
    const body = (await request.json()) as { specialty: number; ownName: string | null; status: CampusStatus }
    const repeated = campusSpecialtiesDb.some(
      (s) =>
        s.campusId === campusId &&
        (body.ownName
          ? (s.ownName ?? "").toLowerCase() === body.ownName.toLowerCase()
          : s.ownName == null && s.specialtyId === body.specialty),
    )
    if (repeated) {
      const name = body.ownName ?? SPECIALTY_CATALOG.find((c) => c.id === body.specialty)?.nombre
      return conflict(`La especialidad ${name} ya está en el catálogo de la sede.`)
    }
    const id = takeNextSpecialtyItemId()
    campusSpecialtiesDb.push({ id, campusId, specialtyId: body.specialty, ownName: body.ownName, status: body.status })
    return HttpResponse.json({ rows: [{ pk_sede_especialidad: id }] })
  }),

  http.put("*/api/eval-col/establecimientos/sedes/:id/estado", async ({ params, request }) => {
    await delay(250)
    const campus = campusesDb.find((c) => c.id === Number(params.id))
    const detail = campus ? campusDetailsDb.get(campus.id) : undefined
    if (!campus || !detail) return HttpResponse.json({ message: "No se encontró la sede solicitada" }, { status: 404 })
    const { status } = (await request.json()) as { status: CampusStatus }
    // En el mock la principal tiene un período abierto: no se puede inactivar (Regla 100).
    if (status === "I" && detail.consecutive === "1") {
      return conflict(
        `No se puede inactivar la sede ${campus.name} porque tiene períodos académicos en Inscripciones o Abiertos: 2026 - Mañana (Abierto).`,
      )
    }
    detail.status = status
    return HttpResponse.json({ rows: [{ pk_sede: campus.id }] })
  }),

  http.get("*/api/eval-col/establecimientos/sedes/:id/procesos-en-curso", async ({ params }) => {
    await delay(150)
    return HttpResponse.json({ rows: [processesOf(Number(params.id))] })
  }),

  // Convertir una sede anexa en establecimiento (Regla 92): pasa a ser su principal.
  http.post("*/api/eval-col/establecimientos/sedes/:id/convertir", async ({ params, request }) => {
    await delay(400)
    const campus = campusesDb.find((c) => c.id === Number(params.id))
    const detail = campus ? campusDetailsDb.get(campus.id) : undefined
    if (!campus || !detail) return HttpResponse.json({ message: "No se encontró la sede solicitada" }, { status: 404 })
    if (detail.consecutive === "1") return badRequest("La sede principal (consecutivo 1) no se puede convertir en establecimiento.")
    const body = (await request.json()) as {
      basicInfo: { name: string; dane: string; nit: string; ownershipType: number; serviceModality: number }
      address: { zone: number | null; district: string | null; commune: string | null; address: string | null }
      contact: { phone: string | null }
      principal: number | null
    }
    if (!body.principal) return badRequest("El rector del establecimiento es obligatorio.")
    if (establishmentsRowsDb.some((e) => e.nit === body.basicInfo.nit)) {
      return conflict("Ya existe un establecimiento con ese NIT.")
    }
    const zone = ZONES.find((z) => z.id === body.address.zone) ?? null
    const { details } = upsertEstablishmentDetails({
      basicInfo: {
        name: body.basicInfo.name,
        dane: body.basicInfo.dane,
        nit: body.basicInfo.nit,
        ownershipType: { id: body.basicInfo.ownershipType, code: "", name: "" },
        serviceModality: { id: body.basicInfo.serviceModality, code: "", name: "" },
      },
      address: { municipality: null, zone, district: null, commune: null, locality: null, address: body.address.address ?? "" },
      contact: { email: "", website: "", phone: body.contact.phone ?? "" },
      additionalInfo: {} as EstablishmentDetails["additionalInfo"],
      principal: null,
      secretary: null,
    })
    upsertCampusDetails({ ...campus, name: body.basicInfo.name, dane: body.basicInfo.dane })
    detail.establishmentId = details.id as number
    detail.consecutive = "1"
    return HttpResponse.json({ rows: [{ pk_establecimiento_creado: details.id }] })
  }),

  http.get("*/api/eval-col/establecimientos/sedes/:id", async ({ params }) => {
    await delay(150)
    const campus = campusesDb.find((c) => c.id === Number(params.id))
    return HttpResponse.json({ rows: campus ? [toDetailRow(campus)] : [] })
  }),

  http.post("*/api/eval-col/establecimientos/sedes", async ({ request }) => {
    await delay(300)
    const body = (await request.json()) as CampusBody
    const establishmentId = Number(body.establishmentId)
    if (!body.georeference) {
      return badRequest("La ubicación de la sede es obligatoria: ubíquela con la dirección o márquela en el mapa.")
    }
    const error = validateBody(body, establishmentId, null)
    if (error) return error.startsWith("Seleccione") ? badRequest(error) : conflict(error)
    const id = takeNextCampusId()
    const campus = applyBody(
      { id, name: "", dane: "", zone: null, neighborhood: "", commune: "", address: "", phone: "" },
      body,
    )
    upsertCampusDetails(campus)
    campusDetailsDb.set(id, {
      establishmentId,
      consecutive: String(Number(body.consecutive) || nextConsecutive(establishmentId) || 2),
      status: "A",
      workScheduleIds: body.workSchedules ?? [],
      location: body.georeference ?? null,
      influenceArea: body.influenceArea ? (JSON.parse(body.influenceArea) as InfluenceArea | null) : null,
    })
    return HttpResponse.json({ rows: [{ pk_sede_creada: id }] })
  }),

  http.patch("*/api/eval-col/establecimientos/sedes/:id", async ({ params, request }) => {
    await delay(300)
    const campus = campusesDb.find((c) => c.id === Number(params.id))
    const detail = campus ? campusDetailsDb.get(campus.id) : undefined
    if (!campus || !detail) return HttpResponse.json({ message: "No se encontró la sede solicitada" }, { status: 404 })
    const body = (await request.json()) as CampusBody
    // Otro establecimiento en el cuerpo = mover la sede (Regla 75): se valida contra el destino.
    const moveTo = body.establishmentId != null && body.establishmentId !== detail.establishmentId ? body.establishmentId : null
    const principal = detail.consecutive === "1"
    if (moveTo != null && principal) return badRequest("La sede principal (consecutivo 1) no se puede mover a otro establecimiento.")
    const error = validateBody(
      moveTo != null ? { ...body, consecutive: body.consecutive ?? detail.consecutive } : body,
      moveTo ?? detail.establishmentId,
      campus.id,
    )
    if (error) return error.startsWith("Seleccione") ? badRequest(error) : conflict(error)
    // La principal no cambia lo que viene del establecimiento (Regla 85).
    upsertCampusDetails(principal ? applyBody(campus, { zone: body.zone }) : applyBody(campus, body))
    if (moveTo != null) detail.establishmentId = moveTo
    if (!principal && body.consecutive) detail.consecutive = String(Number(body.consecutive))
    if (body.workSchedules) detail.workScheduleIds = body.workSchedules
    if (body.georeference) detail.location = body.georeference
    if (body.influenceArea !== undefined) detail.influenceArea = JSON.parse(body.influenceArea) as InfluenceArea | null
    return HttpResponse.json({ rows: [{ pk_sede_actualizada: campus.id }] })
  }),

  http.get("*/api/eval-col/establecimientos/:id/sedes/consecutivo", async ({ params }) => {
    await delay(100)
    return HttpResponse.json({ rows: [{ consecutivo: nextConsecutive(Number(params.id)) }] })
  }),

  http.get("*/api/eval-col/establecimientos/:id/sedes", async ({ params }) => {
    await delay(100)
    const id = Number(params.id)
    const rows = campusesDb
      .filter((c) => campusDetailsDb.get(c.id)?.establishmentId === id)
      .map((c) => ({ pk_sede: c.id, nombre: c.name, consecutivo: campusDetailsDb.get(c.id)?.consecutive ?? "" }))
    return HttpResponse.json({ rows })
  }),
]
