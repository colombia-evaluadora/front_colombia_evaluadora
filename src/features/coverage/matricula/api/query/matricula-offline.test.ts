import "fake-indexeddb/auto"

import { QueryClient } from "@tanstack/react-query"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { __closeDbForTests, DB_NAME, getDb } from "@/lib/offline/db"
import {
  __resetPersisterForTests,
  activatePersistUser,
  flushPersistQueue,
  restoreUserQueries,
  setDeviceMode,
  startQueryPersister,
} from "@/lib/offline/query-persister"
import { selectRowFields } from "@/lib/offline/query-meta"
import { openString } from "@/lib/offline/vault"

// La query de la lista importa el cliente HTTP real; acá no hay red.
vi.mock("@/lib/api-client", () => ({ api: { query: vi.fn(), post: vi.fn() } }))

const { MATRICULA_LISTA_POR_DEFECTO, MATRICULA_OFFLINE_FIELDS, matriculaListaMeta } = await import(
  "@/features/coverage/matricula/api/query/use-matricula-query"
)
const { matriculaKeys } = await import("@/features/coverage/matricula/api/query-keys")

const USER = "rector@example.com"

/** Una fila como la deja `toMatricula`, más campos sensibles que un backend futuro podría agregar. */
const filaCompleta = {
  id: "41",
  documentType: "TI",
  documentNumber: "1012345678",
  firstName: "Ana María",
  lastName: "Pérez Gómez",
  institution: "IE La Esperanza",
  campus: "Sede principal",
  shift: "MAÑANA",
  educationLevel: "BASICA_PRIMARIA",
  grade: 3,
  group: "301",
  enrollmentDate: "2026-02-01",
  status: "Cursando",
  // Fuera de la lista blanca:
  guardian: "Carlos Pérez (Padre)",
  hasGrades: true,
  direccion: "Calle 1 # 2-3",
  telefono: "3001234567",
  correo: "ana@example.com",
  eps: "Sura",
  discapacidad: "Ninguna",
  foto: "archivo-99",
  acudiente: { nombre: "Carlos", telefono: "3009999999" },
  // Una clave permitida con un valor no primitivo tampoco pasa.
  campusDetalle: { direccion: "x" },
}

const respuesta = { rows: [filaCompleta, { ...filaCompleta, id: "42", guardian: "" }], pageCount: 1, totalCount: 2 }

const SENSIBLES = ["Carlos", "Calle 1", "3001234567", "ana@example.com", "Sura", "archivo-99"]

async function resetDb() {
  __resetPersisterForTests()
  await __closeDbForTests()
  await new Promise<void>((resolve) => {
    const req = indexedDB.deleteDatabase(DB_NAME)
    req.onsuccess = req.onerror = req.onblocked = () => resolve()
  })
}

beforeEach(async () => {
  await resetDb()
})

describe("matrícula sin conexión (P6: solo datos básicos)", () => {
  it("persistSelect deja en cada fila SOLO los campos de la lista blanca", () => {
    const persisted = matriculaListaMeta().persistSelect?.(respuesta) as {
      rows: Record<string, unknown>[]
      pageCount: number
      totalCount: number
    }
    expect(persisted.pageCount).toBe(1)
    expect(persisted.totalCount).toBe(2)
    expect(Object.keys(persisted).sort()).toEqual(["pageCount", "rows", "totalCount"])
    for (const row of persisted.rows) {
      for (const key of Object.keys(row)) expect(MATRICULA_OFFLINE_FIELDS).toContain(key)
    }
    expect(persisted.rows[0]).toEqual({
      id: "41",
      documentType: "TI",
      documentNumber: "1012345678",
      firstName: "Ana María",
      lastName: "Pérez Gómez",
      institution: "IE La Esperanza",
      campus: "Sede principal",
      shift: "MAÑANA",
      educationLevel: "BASICA_PRIMARIA",
      grade: 3,
      group: "301",
      enrollmentDate: "2026-02-01",
      status: "Cursando",
    })
    // No muta lo que ve la pantalla con red.
    expect(respuesta.rows[0].guardian).toBe("Carlos Pérez (Padre)")
  })

  it("lo que llega a IndexedDB no tiene acudiente ni campos sensibles, y se restaura así", async () => {
    await setDeviceMode("personal")
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    startQueryPersister(client)
    await activatePersistUser(client, USER)
    const queryKey = matriculaKeys.lista(MATRICULA_LISTA_POR_DEFECTO)
    await client.fetchQuery({ queryKey, queryFn: () => respuesta, meta: matriculaListaMeta() })
    await flushPersistQueue()

    const db = await getDb()
    const filas = await db.getAllFromIndex("queries", "byUser", USER)
    expect(filas).toHaveLength(1)
    // Cifrado en reposo: se abre con la misma bóveda que usa la app.
    const json = (await openString(filas[0].data)) as string
    for (const texto of SENSIBLES) expect(json).not.toContain(texto)
    const guardado = JSON.parse(json) as { rows: Record<string, unknown>[] }
    const claves = new Set(guardado.rows.flatMap((row) => Object.keys(row)))
    expect([...claves].every((key) => (MATRICULA_OFFLINE_FIELDS as readonly string[]).includes(key))).toBe(true)
    expect(claves.has("guardian")).toBe(false)

    // En memoria (pantalla con red) se sigue viendo todo.
    expect((client.getQueryData(queryKey) as typeof respuesta).rows[0].guardian).toBe("Carlos Pérez (Padre)")

    // Un equipo que arranca sin red restaura la copia recortada.
    const offline = new QueryClient()
    await restoreUserQueries(offline, USER)
    const restaurado = offline.getQueryData(queryKey) as { rows: Record<string, unknown>[]; totalCount: number }
    expect(restaurado.totalCount).toBe(2)
    expect(restaurado.rows[0].firstName).toBe("Ana María")
    expect(restaurado.rows[0]).not.toHaveProperty("guardian")
  })
})

describe("selectRowFields", () => {
  it("falla cerrado con formas desconocidas: no se persiste nada", () => {
    const select = selectRowFields(["id"])
    expect(select({ data: [{ id: 1 }] })).toBeUndefined()
    expect(select("texto")).toBeUndefined()
    expect(select([{ id: 1, nombre: "x" }, 3])).toEqual([{ id: 1 }])
  })
})
