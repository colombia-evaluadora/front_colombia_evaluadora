import { HttpResponse, delay, http } from "msw"

import { auditsDb } from "@/mocks/db/audits"
import { tableOperationsDb } from "@/mocks/db/table-operations"
import { planeadorDb } from "@/mocks/db/planeador"
import { getSessionOperations } from "@/mocks/handlers/_session-operations"
import { statusToEstadoDerivado } from "@/features/planeador/lib/estado-derivado"

import type { Actividad } from "@/features/planeador/api/types/actividad"
import type { AuditSession, SessionOperation } from "@/features/administration/audits/api/types/audit"
import type { TableOperation } from "@/features/administration/audits/api/types/audit-table"

/**
 * Mock de `POST /api/reportes/{clave}` — el `reporting-service`.
 *
 * A diferencia del resto de los handlers, este NO devuelve JSON: el servicio
 * real responde el binario del reporte, y el front lo descarga leyendo
 * `Content-Disposition` y `X-Report-Rows`. Si el mock devolviera un objeto, el
 * modo mockeado ejercitaría un camino distinto del real y la descarga solo se
 * probaría contra el backend.
 *
 * Los bytes son un PDF y un XLSX mínimos pero VÁLIDOS, así que el navegador
 * los abre de verdad en vez de bajar un archivo roto.
 *
 * `X-Report-Rows` de los reportes "simples" (funcionarios, establecimientos,
 * …) es un `42` fijo: no hay filtros que aplicar, cualquier número visible
 * alcanza. `planeador-actividades` y los tres de auditoría SÍ filtran contra
 * la base mock correspondiente (mismas claves que documentan las colecciones
 * Postman `planeador-actividades-export-all` y `auditoria-export-pdf-excel`),
 * para poder probar en mock que el filtro que llega realmente recorta algo.
 */

/** PDF de una página en blanco, escrito a mano. Suficiente para que un visor lo abra. */
const PDF_MINIMO = [
  "%PDF-1.4",
  "1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj",
  "2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj",
  "3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 595 842]>>endobj",
  "trailer<</Root 1 0 R>>",
  "%%EOF",
].join("\n")

// Reportes "simples": sin filtros propios en el mock, cuentan fijo (42) —
// alcanza para que la descarga se ejercite; el número no representa nada.
// `asistencia`/`matricula` estaban en `ReportKey` (lib/report-client.ts) pero
// faltaban acá: con mocking activo, exportar matrícula o asistencia daba 404
// contra este mismo handler aunque el botón existiera y el backend real
// funcionara — bug de este catálogo, no del backend.
const NOMBRE_POR_CLAVE: Record<string, string> = {
  funcionarios: "funcionarios",
  establecimientos: "establecimientos",
  sedes: "sedes",
  "periodos-academicos": "periodos-academicos",
  "periodos-evaluacion": "periodos-evaluacion",
  "plan-estudio": "plan-estudio",
  grados: "grados",
  areas: "areas",
  escalas: "escalas",
  asignaciones: "asignaciones",
  asistencia: "asistencia",
  matricula: "matricula",
  informes: "informes",
  "informes-tabla": "informe-tabla",
}

function fecha() {
  const hoy = new Date()
  return [
    hoy.getFullYear(),
    String(hoy.getMonth() + 1).padStart(2, "0"),
    String(hoy.getDate()).padStart(2, "0"),
  ].join("")
}

/** Error con status propio — lo que el handler traduce a la respuesta 4xx real. */
class ReportError extends Error {
  status: number

  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

// Mismo problema que documentan `real-mapping.ts` (auditoría) y los mocks de
// `audits.ts`/`audit-tables.ts`: "desde/hasta" puede llegar como fecha sola
// (`yyyy-MM-dd`) o con hora (`yyyy-MM-dd'T'HH:mm`); se normaliza a ISO acá
// para poder comparar contra `occurredAt`/`startedAt`, que siempre son ISO.
function toComparableIso(value: string, boundary: "start" | "end"): string {
  const hasTime = value.includes("T")
  const iso = hasTime ? value : `${value}T${boundary === "start" ? "00:00:00.000" : "23:59:59.999"}`
  return new Date(iso).toISOString()
}

interface PlaneadorReporteFilters {
  SEARCH?: string
  ESTADOS?: string[]
  FECHA_DESDE?: string
  FECHA_HASTA?: string
  DIA?: string
  IDS?: unknown[]
}

/**
 * Filtra `planeadorDb` con las claves reales de V404 (colección Postman
 * `planeador-actividades-export-all`). No todas tienen equivalente en el
 * mock: `ASIGNATURA`/`GRUPO`/`UNIDAD`/`TIPO_ACTIVIDAD`/`INSTRUMENTO`/
 * `FUNCIONARIO` son ids reales (`FK_*`/`pk_lista_valor`) que `planeadorDb`
 * no modela como tales (son texto plano) — se aceptan sin tumbar el
 * request, pero no recortan nada en mock, mismo criterio que
 * `gradoIdMock`/`asignaturaIdMock` en `mocks/handlers/planeador.ts` (ids
 * sintéticos que no vale la pena replicar acá solo para el conteo).
 */
function filtrarActividadesReporte(rows: Actividad[], filters: PlaneadorReporteFilters | undefined): Actividad[] {
  const f = filters ?? {}

  // Mismo binder que el real: cada elemento de `IDS` tiene que ser número.
  if (f.IDS?.length && f.IDS.some((id) => typeof id !== "number")) {
    throw new ReportError(400, "IDS debe ser un array de números.")
  }

  return rows.filter((row) => {
    if (f.IDS?.length && !f.IDS.includes(row.id)) return false
    if (f.SEARCH) {
      const needle = f.SEARCH.toLowerCase()
      const haystack = [row.nombre, row.observaciones, row.unidad.nombre, row.instrumento]
        .join(" ")
        .toLowerCase()
      if (!haystack.includes(needle)) return false
    }
    if (f.ESTADOS?.length && !f.ESTADOS.includes(statusToEstadoDerivado(row.status))) {
      return false
    }
    if (f.FECHA_DESDE && row.fechaCierre < f.FECHA_DESDE) return false
    if (f.FECHA_HASTA && row.fechaInicio > f.FECHA_HASTA) return false
    if (f.DIA && !(row.fechaInicio <= f.DIA && row.fechaCierre >= f.DIA)) return false
    return true
  })
}

interface AuditoriaSesionesReporteFilters {
  AUTHOR?: string
  STATUS?: string
  STARTEDFROM?: string
  STARTEDTO?: string
  IDS?: string
}

/** Filtra `auditsDb` con las claves de `POST /reportes/auditoria-sesiones`. */
function filtrarSesionesReporte(
  rows: AuditSession[],
  filters: AuditoriaSesionesReporteFilters | undefined,
): AuditSession[] {
  const f = filters ?? {}

  // `IDS` (CSV de `family_id`) tiene prioridad sobre el resto — igual que
  // documenta la colección Postman (mismo criterio que `/audits/stats`).
  if (f.IDS) {
    const ids = new Set(f.IDS.split(",").filter(Boolean))
    return rows.filter((row) => ids.has(row.id))
  }

  return rows.filter((row) => {
    if (f.AUTHOR) {
      const needle = f.AUTHOR.toLowerCase()
      if (!row.authorName.toLowerCase().includes(needle) && !row.ip.toLowerCase().includes(needle)) {
        return false
      }
    }
    if (f.STATUS && row.status !== f.STATUS) return false
    if (f.STARTEDFROM && row.startedAt < toComparableIso(f.STARTEDFROM, "start")) return false
    if (f.STARTEDTO && row.startedAt > toComparableIso(f.STARTEDTO, "end")) return false
    return true
  })
}

interface AuditoriaOperacionesReporteFilters {
  AUTHOR?: string
  OPERATIONCH?: "c" | "u" | "d"
  OCCURREDFROM?: string
  OCCURREDTO?: string
}

const OPERATIONCH_A_OPERATION: Record<string, TableOperation["operation"]> = {
  c: "INSERT",
  u: "UPDATE",
  d: "DELETE",
}

function filtrarOperacionesReporte<T extends { authorName?: string; ip?: string; operation: TableOperation["operation"]; occurredAt: string }>(
  rows: T[],
  filters: AuditoriaOperacionesReporteFilters | undefined,
): T[] {
  const f = filters ?? {}
  return rows.filter((row) => {
    if (f.AUTHOR) {
      const needle = f.AUTHOR.toLowerCase()
      const matchesAuthor = row.authorName?.toLowerCase().includes(needle)
      const matchesIp = row.ip?.toLowerCase().includes(needle)
      if (!matchesAuthor && !matchesIp) return false
    }
    if (f.OPERATIONCH && row.operation !== OPERATIONCH_A_OPERATION[f.OPERATIONCH]) return false
    if (f.OCCURREDFROM && row.occurredAt < toComparableIso(f.OCCURREDFROM, "start")) return false
    if (f.OCCURREDTO && row.occurredAt > toComparableIso(f.OCCURREDTO, "end")) return false
    return true
  })
}

/** Cuenta las filas de cada reporte con filtro propio; `null` = clave desconocida. */
function contarFilas(clave: string, body: Record<string, unknown>): number | null {
  const filters = body.filters as Record<string, unknown> | undefined

  if (clave === "planeador-actividades") {
    return filtrarActividadesReporte(planeadorDb, filters as PlaneadorReporteFilters).length
  }

  if (clave === "auditoria-sesiones") {
    return filtrarSesionesReporte(auditsDb, filters as AuditoriaSesionesReporteFilters).length
  }

  if (clave === "auditoria-tabla-operaciones") {
    const slug = (filters as { SLUG?: string } | undefined)?.SLUG
    // Sin SLUG el reporte real sale VACÍO, no completo (ClickHouse no tiene
    // `RAISE`, así que entre "cero filas" y "el audit_log entero" la única
    // opción segura es cero) — mismo contrato en el mock.
    if (!slug) return 0
    // "Exportar seleccionados" manda `IDS` (CSV de `<lsn>-<seq>`, un formato
    // que el mock no replica en `TableOperation.id`) — el conteo se toma
    // directo de la cantidad de ids pedidos, como ya hacía el mock viejo de
    // `/audit-tables/:slug/operations/export`.
    const idsCsv = (filters as { IDS?: string } | undefined)?.IDS
    if (idsCsv) return idsCsv.split(",").filter(Boolean).length
    const rows: TableOperation[] = tableOperationsDb[slug] ?? []
    return filtrarOperacionesReporte(rows, filters as AuditoriaOperacionesReporteFilters).length
  }

  if (clave === "auditoria-sesion-operaciones") {
    const sessionId = (filters as { SESSIONID?: string } | undefined)?.SESSIONID
    if (!sessionId) return 0
    // Mismo criterio que en `auditoria-tabla-operaciones`: "exportar
    // seleccionados" (el sheet de la sesión no tiene filtros) manda `IDS`.
    const idsCsv = (filters as { IDS?: string } | undefined)?.IDS
    if (idsCsv) return idsCsv.split(",").filter(Boolean).length
    const session = auditsDb.find((row) => row.id === sessionId)
    if (!session) return 0
    const rows: SessionOperation[] = getSessionOperations(session)
    const tableSlug = (filters as { TABLESLUG?: string } | undefined)?.TABLESLUG
    const scoped = tableSlug ? rows.filter((row) => row.tableSlug === tableSlug) : rows
    return filtrarOperacionesReporte(scoped, filters as AuditoriaOperacionesReporteFilters).length
  }

  return null
}

export const reportesHandlers = [
  http.post("*/api/reportes/:clave", async ({ params, request }) => {
    await delay(700)

    const clave = String(params["clave"])
    const body = (await request.json()) as Record<string, unknown>
    const format = body.format as string | undefined

    if (format !== "pdf" && format !== "excel") {
      return HttpResponse.json(
        { message: `Formato '${format}' no soportado. Usa 'pdf' o 'excel'.` },
        { status: 400 },
      )
    }

    let filas: number
    try {
      const conFiltro = contarFilas(clave, body)
      if (conFiltro != null) {
        filas = conFiltro
      } else {
        const base = NOMBRE_POR_CLAVE[clave]
        if (!base) {
          // Mismo 404 que da el servicio para una clave que no está en su catálogo.
          return HttpResponse.json({ message: `No existe el reporte '${clave}'.` }, { status: 404 })
        }
        filas = 42
      }
    } catch (error) {
      if (error instanceof ReportError) {
        return HttpResponse.json({ message: error.message }, { status: error.status })
      }
      throw error
    }

    const esPdf = format === "pdf"
    const cuerpo = esPdf
      ? new TextEncoder().encode(PDF_MINIMO)
      : // Un .xlsx es un ZIP; con la firma PK basta para que el mock sea
        // reconocible como tal sin construir un libro entero.
        new Uint8Array([0x50, 0x4b, 0x03, 0x04])

    return new HttpResponse(cuerpo, {
      status: 200,
      headers: {
        "Content-Type": esPdf
          ? "application/pdf"
          : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${clave}-${fecha()}.${esPdf ? "pdf" : "xlsx"}"`,
        "X-Report-Rows": String(filas),
      },
    })
  }),
]
