import { http, HttpResponse, delay } from "msw"

import { reservationsDb, OFFERED_SEATS_BY_CAMPUS, GROUPS } from "@/mocks/db/reservations"
import {
  DOCUMENT_TYPE_OPTIONS,
  GENDER_OPTIONS,
  RELATIONSHIP_OPTIONS,
  RESIDENCE_OPTIONS,
} from "@/features/coverage/api/ui-mappings"
import type {
  PreMatricula,
  PreMatriculaCatalogsRequest,
  PreMatriculaCatalogsResponse,
  PreMatriculaGroupsByCampus,
  PreMatriculaQueryRequest,
  PreMatriculaQueryResponse,
  PreMatriculaStatus,
} from "@/features/coverage/api/types/pre-matricula"
import type {
  ReservationsQueryFilters,
  Reservation,
} from "@/features/coverage/api/types/reservation"

function matches(value: string, needle: string): boolean {
  return value.toLowerCase().includes(needle.toLowerCase())
}

function applyFilters(rows: Reservation[], filters: ReservationsQueryFilters): Reservation[] {
  return rows.filter((row) => {
    if (filters.firstName && !matches(row.firstName, filters.firstName)) return false
    if (filters.lastName && !matches(row.lastName, filters.lastName)) return false
    if (filters.documentNumber && !row.documentNumber.includes(filters.documentNumber)) return false
    if (filters.campus && !matches(row.campus, filters.campus)) return false
    if (filters.grade != null && row.grade !== filters.grade) return false
    return true
  })
}

/**
 * Cambios persistidos por el PUT, aplicados encima del registro derivado.
 * `reservationsDb` guarda filas de `Reservation`, así que los campos propios
 * de `PreMatricula` (segundo nombre, acudiente, etc.) viven acá.
 */
const preMatriculaOverrides = new Map<string, Partial<PreMatricula>>()

function toPreMatricula(row: Reservation): PreMatricula {
  // Reprobado: ~25 % de los casos, determinístico por documento.
  const failed = row.documentNumber.charCodeAt(1) % 10 < 3
  const targetGrade = failed ? row.grade : row.grade < 11 ? row.grade + 1 : null
  const hasSlot =
    OFFERED_SEATS_BY_CAMPUS[row.campus] != null ? row.documentNumber.charCodeAt(0) % 10 >= 3 : false

  const status: PreMatriculaStatus = hasSlot ? "con_cupo" : "sin_cupo"

  // ── Catálogos determinísticos (estables entre renders) ───────────────────────
  const DOCUMENT_TYPES = DOCUMENT_TYPE_OPTIONS
  const RESIDENCES = RESIDENCE_OPTIONS
  const SECOND_LAST_NAMES = [
    "Gomez",
    "Ramirez",
    "Torres",
    "Vargas",
    "Morales",
    "Jimenez",
    "Rios",
    "Castillo",
    "Mendoza",
    "Guerrero",
  ]
  const SECOND_NAMES = [
    "Sebastián",
    "Alejandro",
    "Felipe",
    "Camilo",
    "Andrés",
    "Valentina",
    "Daniela",
    "Paola",
    "Marcela",
    "Tatiana",
  ]
  const GENDERS = GENDER_OPTIONS
  const STREETS = [
    "Carrera 91 # 40 190",
    "Calle 45 # 12 30",
    "Transversal 18 # 5 60",
    "Avenida 30 # 22 15",
    "Diagonal 72 # 8 44",
  ]
  const RELATIONSHIPS = RELATIONSHIP_OPTIONS
  const GUARDIAN_SECOND_NAMES = [
    "Antonio",
    "Hernando",
    "Roberto",
    "Carlos",
    "Miguel",
    "Patricia",
    "Claudia",
    "Sandra",
    "Lucia",
    "Carmen",
  ]

  // Índices basados en chars del UUID para reproducibilidad
  const c0 = row.id.charCodeAt(0)
  const c1 = row.id.charCodeAt(2)
  const c2 = row.id.charCodeAt(4)

  // ── Estudiante ───────────────────────────────────────────────────────────────
  const documentType = DOCUMENT_TYPES[c0 % DOCUMENT_TYPES.length]
  const secondLastName = SECOND_LAST_NAMES[c0 % SECOND_LAST_NAMES.length]
  const secondName = SECOND_NAMES[c1 % SECOND_NAMES.length]
  const gender = GENDERS[c0 % 2]
  const residence = RESIDENCES[c0 % RESIDENCES.length]
  const address = STREETS[c1 % STREETS.length]

  const baseYear = 2026 - 5 - (c0 % 14)
  const birthMonth = String((c0 % 12) + 1).padStart(2, "0")
  const birthDay = String((c0 % 28) + 1).padStart(2, "0")
  const birthDate = `${baseYear}-${birthMonth}-${birthDay}`

  const normalizedFirst = row.firstName.split(" ")[0].toLowerCase()
  const normalizedLast = row.lastName.split(" ")[0].toLowerCase()
  const email = `${normalizedFirst}.${normalizedLast}@gmail.com`
  const phone = `300${row.documentNumber.slice(0, 7)}`

  // ── Acudiente ────────────────────────────────────────────────────────────────
  const guardianDocumentType = DOCUMENT_TYPES[c1 % DOCUMENT_TYPES.length]
  const guardianDocumentNumber = row.documentNumber.split("").reverse().join("").slice(0, 10)
  const guardianFirstName = row.firstName.split(" ").pop() ?? "Fernney"
  const guardianSecondName = GUARDIAN_SECOND_NAMES[c2 % GUARDIAN_SECOND_NAMES.length]
  const guardianLastName = row.lastName.split(" ")[0]
  const guardianSecondLastName = SECOND_LAST_NAMES[c2 % SECOND_LAST_NAMES.length]
  const guardianLivesWithStudent = c2 % 3 !== 0
  const guardianRelationship = RELATIONSHIPS[c2 % RELATIONSHIPS.length]
  const guardianEmail = `${guardianFirstName.toLowerCase()}.${guardianLastName.toLowerCase()}@gmail.com`
  const guardianPhone = `311${row.documentNumber.slice(3, 10)}`
  const guardianAddress = STREETS[(c2 + 2) % STREETS.length]

  const base: PreMatricula = {
    id: row.id,

    // estudiante
    documentType,
    documentNumber: row.documentNumber,
    firstName: row.firstName.split(" ")[0],
    secondName,
    lastName: row.lastName.split(" ")[0],
    secondLastName,
    birthDate,
    gender,
    email,
    phone,
    residence,
    address,
    grade: row.grade,
    failed,
    targetGrade,
    hasSlot,
    status,
    group: row.group,

    // institución de origen
    campus: row.campus,
    institution: row.institution,
    shift: row.shift,
    educationLevel: row.educationLevel,

    // acudiente
    guardianDocumentType,
    guardianDocumentNumber,
    guardianFirstName,
    guardianSecondName,
    guardianLastName,
    guardianSecondLastName,
    guardianLivesWithStudent,
    guardianRelationship,
    guardianEmail,
    guardianPhone,
    guardianAddress,
  }

  return { ...base, ...preMatriculaOverrides.get(row.id) }
}

function sortValue(row: PreMatricula, id: string): string | number {
  return (row[id as keyof PreMatricula] ?? "") as string | number
}

function applySorting(
  rows: PreMatricula[],
  sorting: PreMatriculaQueryRequest["sorting"],
): PreMatricula[] {
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

export const preMatriculaHandlers = [
  http.post("/api/coverage/pre-matricula/query", async ({ request }) => {
    await delay(300)
    const { filters, sorting, pageIndex, pageSize } =
      (await request.json()) as PreMatriculaQueryRequest

    const filteredReservations = applyFilters(reservationsDb, filters)
    const rows = applySorting(filteredReservations.map(toPreMatricula), sorting)

    const totalCount = rows.length
    const pageCount = Math.max(1, Math.ceil(totalCount / pageSize))
    const start = pageIndex * pageSize

    return HttpResponse.json<PreMatriculaQueryResponse>({
      rows: rows.slice(start, start + pageSize),
      pageCount,
      totalCount,
    })
  }),

  /**
   * Devuelve los grupos disponibles agrupados por sede para los registros
   * seleccionados. Si `ids` está vacío, usa todas las sedes.
   */
  http.post("/api/coverage/pre-matricula/catalogs", async ({ request }) => {
    await delay(150)
    const { ids } = (await request.json()) as PreMatriculaCatalogsRequest

    const selectedRows = ids.length
      ? reservationsDb.filter((r) => ids.includes(r.id))
      : reservationsDb

    const campusSet = [...new Set(selectedRows.map((r) => r.campus))].sort()

    const result: PreMatriculaGroupsByCampus[] = campusSet.map((campus) => ({
      campus,
      groups: [...GROUPS].sort(),
    }))

    return HttpResponse.json<PreMatriculaCatalogsResponse>(result)
  }),

  http.put("/api/coverage/pre-matricula/:id", async ({ request, params }) => {
    await delay(300)
    const { id } = params as { id: string }

    if (!reservationsDb.some((r) => r.id === id)) {
      return HttpResponse.json(
        { status: "error", message: "Registro no encontrado." },
        { status: 404 },
      )
    }

    const changes = (await request.json()) as Partial<PreMatricula>
    preMatriculaOverrides.set(id, {
      ...preMatriculaOverrides.get(id),
      ...changes,
    })

    return HttpResponse.json({ status: "ok", message: "Registro actualizado correctamente." })
  }),

  http.delete("/api/coverage/pre-matricula/:id", async ({ params }) => {
    await delay(300)
    const { id } = params as { id: string }
    const index = reservationsDb.findIndex((r) => r.id === id)

    if (index === -1) {
      return HttpResponse.json(
        { status: "error", message: "Registro no encontrado." },
        { status: 404 },
      )
    }

    reservationsDb.splice(index, 1)
    return HttpResponse.json({ status: "ok", message: "Registro eliminado correctamente." })
  }),
]
