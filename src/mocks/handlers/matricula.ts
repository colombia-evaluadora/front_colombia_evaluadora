import { http, HttpResponse, delay } from "msw"

import {
  applyBulkMatriculaChange,
  deleteMatriculaById,
  findActiveMatriculaByDocument,
  getMatriculaDetails,
  insertMatricula,
  matriculaDb,
  updateMatriculaDetails,
  updateMatriculaRow,
} from "@/mocks/db/matricula"
import {
  matriculaFieldConfigDb,
  updateMatriculaFieldConfig,
} from "@/mocks/db/matricula-field-config"
import { CAMPUSES, GRADES, GROUPS } from "@/mocks/db/reservations"
import { SHIFTS } from "@/features/coverage/api/schema"
import type {
  BulkMatriculaChangeRequest,
  BulkMatriculaChangeResult,
  CreateMatriculaInput,
  CreateMatriculaResult,
  ExportFormat,
  ExportResult,
  Matricula,
  MatriculaDependentCatalogsRequest,
  MatriculaDependentCatalogsResponse,
  MatriculaDetailResult,
  MatriculaDocumentCheckResult,
  MatriculaFieldConfigMap,
  MatriculaFieldConfigResult,
  MatriculaHomologationInfo,
  MatriculaMutationResult,
  MatriculaQueryFilters,
  MatriculaQueryRequest,
  MatriculaQueryResponse,
} from "@/features/coverage/api/types/matricula"

// Hash determinista y estable (no criptográfico) — solo para variar
// "aleatoriamente" pero siempre igual el resultado según el string de
// entrada, sin depender de `Math.random()`.
function hashString(value: string): number {
  let hash = 0
  for (let i = 0; i < value.length; i++) {
    hash = (hash * 31 + value.charCodeAt(i)) | 0
  }
  return Math.abs(hash)
}

function mixHash(value: number): number {
  let x = value
  x = Math.imul(x ^ (x >>> 16), 0x45d9f3b)
  x = Math.imul(x ^ (x >>> 16), 0x45d9f3b)
  x = x ^ (x >>> 16)
  return Math.abs(x)
}

const EXPORT_FORMAT_LABELS: Record<ExportFormat, string> = {
  pdf: "PDF",
  excel: "Excel",
}

function matches(value: string, needle: string): boolean {
  return value.toLowerCase().includes(needle.toLowerCase())
}

function applyFilters(rows: Matricula[], filters: MatriculaQueryFilters): Matricula[] {
  return rows.filter((row) => {
    if (filters.search) {
      const needle = filters.search
      const matchesSearch =
        matches(row.firstName, needle) ||
        matches(row.lastName, needle) ||
        row.documentNumber.includes(needle) ||
        matches(row.institution, needle) ||
        matches(row.guardian, needle)
      if (!matchesSearch) return false
    }

    if (filters.statuses?.length && !filters.statuses.includes(row.status)) {
      return false
    }

    if (filters.campus && row.campus !== filters.campus) return false
    if (filters.shift && row.shift !== filters.shift) return false
    if (filters.grade != null && row.grade !== filters.grade) return false
    if (filters.group && row.group !== filters.group) return false

    return true
  })
}

function sortValue(row: Matricula, id: string): string | number {
  return (row[id as keyof Matricula] ?? "") as string | number
}

function applySorting(rows: Matricula[], sorting: MatriculaQueryRequest["sorting"]): Matricula[] {
  if (!sorting.length) return rows
  const [{ id, desc }] = sorting
  const sorted = [...rows].sort((a, b) => {
    const av = sortValue(a, id)
    const bv = sortValue(b, id)
    if (av === bv) return 0
    return av > bv ? 1 : -1
  })
  return desc ? sorted.reverse() : sorted
}

export const matriculaHandlers = [
  // Sede → Jornada → Grado → Grupo — datos ficticios pero deterministas (ver
  // `hashString`). El contrato ya queda listo para el endpoint real de
  // oferta académica; solo hay que reemplazar este handler.
  http.post("*/api/coverage/matricula/catalogos-dependientes", async ({ request }) => {
    await delay(150)

    const { campus, shift, grade } = (await request.json()) as MatriculaDependentCatalogsRequest

    let shifts = [...SHIFTS]
    if (campus && shifts.length > 1) {
      // Simula que no todas las sedes ofrecen todas las jornadas, sin dejar
      // la lista vacía.
      const dropIndex = mixHash(hashString(campus)) % shifts.length
      shifts = shifts.filter((_, index) => index !== dropIndex)
    }

    let grades: number[] = [...GRADES]
    if (shift) {
      // Mismo criterio que arriba: rota el punto de partida para que el
      // subconjunto cambie de verdad entre jornadas, no solo el tamaño.
      const seed = mixHash(hashString(`shift-${shift}`))
      const count = 1 + (seed % GRADES.length)
      const offset = seed % GRADES.length
      grades = Array.from({ length: count }, (_, i) => GRADES[(offset + i) % GRADES.length]).sort(
        (a, b) => a - b,
      )
    }

    let groups = [...GROUPS]
    if (grade != null) {
      // No es solo un slice por cantidad (eso repite "01","02" siempre) —
      // se arma un subconjunto distinto por grado, rotando el punto de
      // partida antes de recortar, para que el CONTENIDO cambie, no solo el
      // tamaño.
      const seed = mixHash(hashString(`grade-${grade}`))
      const count = 1 + (seed % GROUPS.length)
      const offset = seed % GROUPS.length
      groups = Array.from({ length: count }, (_, i) => GROUPS[(offset + i) % GROUPS.length]).sort()
    }

    return HttpResponse.json<MatriculaDependentCatalogsResponse>({ shifts, grades, groups })
  }),

  http.post("*/api/coverage/matricula/query", async ({ request }) => {
    await delay(250)

    const { filters, sorting, pageIndex, pageSize } =
      (await request.json()) as MatriculaQueryRequest

    const filtered = applySorting(applyFilters(matriculaDb, filters), sorting)

    const totalCount = filtered.length
    const safePageSize = pageSize > 0 ? pageSize : 10
    const pageCount = Math.max(1, Math.ceil(totalCount / safePageSize))
    const start = pageIndex * safePageSize

    return HttpResponse.json<MatriculaQueryResponse>({
      rows: filtered.slice(start, start + safePageSize),
      pageCount,
      totalCount,
    })
  }),

  // "Cambio de matrícula masivo" (E01HU33) — Sede/Grado/Grupo son cambios
  // independientes, detectados en el front por los campos que el usuario
  // llenó (ver `dialog-modificar-matricula.tsx`).
  http.post("*/api/coverage/matricula/cambio-masivo", async ({ request }) => {
    await delay(400)

    const body = (await request.json()) as BulkMatriculaChangeRequest
    const result = applyBulkMatriculaChange(body)

    return HttpResponse.json<BulkMatriculaChangeResult>(result)
  }),

  http.post("*/api/coverage/matricula/export", async ({ request }) => {
    await delay(600)

    const { ids, format } = (await request.json()) as { ids: string[]; format: ExportFormat }

    return HttpResponse.json<ExportResult>({
      status: "ok",
      message: `${ids.length} estudiante(s) exportado(s) a ${EXPORT_FORMAT_LABELS[format]}.`,
    })
  }),

  http.post("*/api/coverage/matricula/export-all", async ({ request }) => {
    await delay(600)

    const { filters, format } = (await request.json()) as {
      filters: MatriculaQueryFilters
      format: ExportFormat
    }

    const count = applyFilters(matriculaDb, filters).length

    return HttpResponse.json<ExportResult>({
      status: "ok",
      message: `${count} estudiante(s) exportado(s) a ${EXPORT_FORMAT_LABELS[format]}.`,
    })
  }),

  http.post("*/api/coverage/matricula", async ({ request }) => {
    await delay(300)

    const input = (await request.json()) as CreateMatriculaInput
    const matricula = insertMatricula(input)

    // Simula la detección de notas previas: TODAS las altas "encuentran" que
    // el estudiante ya cursó este grado en otra sede de la misma institución
    // — sin backend real de calificaciones todavía, así el diálogo de
    // homologación se puede probar en cada alta sin depender del azar.
    const otherCampuses = CAMPUSES.filter((campus) => campus !== matricula.campus)
    const homologation: MatriculaHomologationInfo | null =
      otherCampuses.length > 0
        ? {
            previousCampus: otherCampuses[Math.floor(Math.random() * otherCampuses.length)],
            previousInstitution: matricula.institution,
          }
        : null

    return HttpResponse.json<CreateMatriculaResult>({ matricula, homologation })
  }),

  // Va ANTES de `GET /matricula/:id`: MSW matchea handlers en el orden en que
  // se registran (no por especificidad, a diferencia del router), así que si
  // "config" quedara después caería en el `:id` dinámico.
  http.get("*/api/coverage/matricula/config", async () => {
    await delay(200)

    return HttpResponse.json<MatriculaFieldConfigResult>({
      status: "ok",
      message: "",
      fields: matriculaFieldConfigDb,
    })
  }),

  http.put("*/api/coverage/matricula/config", async ({ request }) => {
    await delay(250)

    const fields = (await request.json()) as MatriculaFieldConfigMap
    updateMatriculaFieldConfig(fields)

    return HttpResponse.json<MatriculaFieldConfigResult>({
      status: "ok",
      message: "Configuración guardada.",
      fields: matriculaFieldConfigDb,
    })
  }),

  // Misma razón que "config": ruta estática, tiene que ir antes del `:id`.
  http.get("*/api/coverage/matricula/check", async ({ request }) => {
    await delay(300)

    const documentNumber = new URL(request.url).searchParams.get("documentNumber") ?? ""
    const matricula = findActiveMatriculaByDocument(documentNumber)

    return HttpResponse.json<MatriculaDocumentCheckResult>({
      exists: matricula !== null,
      matricula,
    })
  }),

  http.get("*/api/coverage/matricula/:id", async ({ params }) => {
    await delay(250)

    const idParam = Array.isArray(params.id) ? params.id[0] : params.id
    const found = idParam ? getMatriculaDetails(idParam) : null

    if (!found) {
      return HttpResponse.json<MatriculaDetailResult>(
        { status: "error", message: "Estudiante no encontrado.", matricula: null, details: null },
        { status: 404 },
      )
    }

    return HttpResponse.json<MatriculaDetailResult>({
      status: "ok",
      message: "",
      matricula: found.matricula,
      details: found.details,
    })
  }),

  http.put("*/api/coverage/matricula/:id", async ({ params, request }) => {
    await delay(250)

    const idParam = Array.isArray(params.id) ? params.id[0] : params.id
    const input = (await request.json()) as CreateMatriculaInput
    const updated = idParam ? updateMatriculaDetails(idParam, input) : null

    if (!updated) {
      return HttpResponse.json<MatriculaMutationResult>(
        { status: "error", message: "Estudiante no encontrado.", matricula: null },
        { status: 404 },
      )
    }

    return HttpResponse.json<MatriculaMutationResult>({
      status: "ok",
      message: "Estudiante actualizado.",
      matricula: updated,
    })
  }),

  http.post("*/api/coverage/matricula/:id/retirar", async ({ params }) => {
    await delay(250)

    const idParam = Array.isArray(params.id) ? params.id[0] : params.id
    const updated = idParam ? updateMatriculaRow(idParam, { status: "retirado" }) : null

    if (!updated) {
      return HttpResponse.json<MatriculaMutationResult>(
        { status: "error", message: "Estudiante no encontrado.", matricula: null },
        { status: 404 },
      )
    }

    return HttpResponse.json<MatriculaMutationResult>({
      status: "ok",
      message: "Estudiante retirado.",
      matricula: updated,
    })
  }),

  http.post("*/api/coverage/matricula/:id/reingresar", async ({ params }) => {
    await delay(250)

    const idParam = Array.isArray(params.id) ? params.id[0] : params.id
    const updated = idParam ? updateMatriculaRow(idParam, { status: "cursando" }) : null

    if (!updated) {
      return HttpResponse.json<MatriculaMutationResult>(
        { status: "error", message: "Estudiante no encontrado.", matricula: null },
        { status: 404 },
      )
    }

    return HttpResponse.json<MatriculaMutationResult>({
      status: "ok",
      message: "Estudiante reingresado.",
      matricula: updated,
    })
  }),

  http.delete("*/api/coverage/matricula/:id", async ({ params }) => {
    await delay(250)

    const idParam = Array.isArray(params.id) ? params.id[0] : params.id
    const matricula = matriculaDb.find((item) => item.id === idParam)

    if (!matricula) {
      return HttpResponse.json<ExportResult>(
        { status: "error", message: "Estudiante no encontrado." },
        { status: 404 },
      )
    }

    deleteMatriculaById(matricula.id)

    return HttpResponse.json<ExportResult>({
      status: "ok",
      message: "Estudiante eliminado.",
    })
  }),
]
