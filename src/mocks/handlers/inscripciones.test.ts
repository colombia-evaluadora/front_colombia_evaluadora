import { setupServer } from "msw/node"
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest"

// Un solo camino: el front llama a las rutas reales (sso V426) y el mock las imita.
vi.mock("@/config/env", () => ({
  env: {
    API_URL: "http://localhost/api",
    ENABLE_API_MOCKING: false,
    APP_URL: "http://localhost",
    NAME: "TEST",
  },
}))
vi.stubGlobal("window", { location: { pathname: "/app", href: "/app" } })
vi.mock("sonner", () => ({ toast: { error: vi.fn() } }))

const { api } = await import("@/lib/api-client")
const { evalCol } = await import("@/lib/eval-col-client")
const { inscripcionesHandlers } = await import("@/mocks/handlers/inscripciones")
const { inscripcionesConfiguracionHandlers } =
  await import("@/mocks/handlers/inscripciones-configuracion")
const {
  fetchInscripciones,
  fetchGruposAdmisionRows,
  fetchOpcionesCupo,
  toInscripcionDetalle,
  INSCRIPCIONES_BASE,
  datos,
} = await import("@/features/coverage/inscripcion-reservas/api/query/use-inscripciones-query")

type EstadoOpcion = import("@/features/coverage/inscripcion-reservas/api/types/inscripcion").EstadoOpcion

api.defaults.baseURL = "http://localhost/api"
const server = setupServer(...inscripcionesHandlers, ...inscripcionesConfiguracionHandlers)
beforeAll(() => server.listen({ onUnhandledRequest: "error" }))
afterAll(() => server.close())

const grupo = {
  id: "1",
  establecimientoId: 1,
  anio: 2027,
  modalidad: "Anual",
  ciclo: 1,
  desempate: "SORTEO" as const,
  fechaCierre: "",
  sorteoEjecutado: true,
  grados: [],
  jornadas: [],
}
const lista = (estados: EstadoOpcion[] = ["PENDIENTE", "EN_LISTA_ESPERA"]) =>
  fetchInscripciones(grupo, {
    filters: { grado: "1°", jornada: "Mañana", estados },
    pageIndex: 0,
    pageSize: 50,
  })
const status = (e: unknown) => (e as { response?: { status?: number } }).response?.status

describe("mock de Inscripciones con la forma del back", () => {
  it("lista en orden de admisión con posición, total y número de sorteo formateado", async () => {
    const r = await lista()
    expect(r.totalCount).toBe(r.rows.length)
    expect(r.rows.map((o) => o.posicion)).toEqual(
      [...r.rows.map((o) => o.posicion)].sort((a, b) => a - b),
    )
    expect(r.rows.every((o) => /^\d{4}$/.test(o.numeroSorteo ?? ""))).toBe(true)
    expect(r.cuposDisponibles).toBe(12)
  })

  it("admitir devuelve el resumen y descuenta el cupo", async () => {
    const [primera] = (await lista(["PENDIENTE"])).rows
    const r = datos(
      await evalCol.postRow<{ datos: { admitidas: number } }>(`${INSCRIPCIONES_BASE}/admitir`, {
        IDS: [Number(primera.id)],
      }),
    )
    expect(r.admitidas).toBe(1)
    expect((await lista()).cuposDisponibles).toBe(11)
  })

  it("no admitir sin motivo responde 400", async () => {
    const err = await evalCol
      .postRow(`${INSCRIPCIONES_BASE}/no-admitir`, { IDS: [1], FK_TLV_MOTIVO: null })
      .catch((e) => e)
    expect(status(err)).toBe(400)
  })

  it("el detalle se convierte al modelo de la pantalla", async () => {
    const [o] = (await lista()).rows
    const d = toInscripcionDetalle(
      datos(await evalCol.getRow(`${INSCRIPCIONES_BASE}/${o.inscripcionId}`)),
    )
    expect(d.numeroInscripcion).toBe(o.numeroInscripcion)
    expect(d.grado).toBe("1°")
    expect(d.acudiente.parentesco).toBe("Madre")
  })

  it("ampliar agrega una opción Pendiente al final y no pasa de tres", async () => {
    const o = (await lista()).rows.find((x) => x.totalOpciones === 1 && x.estadoInscripcion === "INSCRITA")!
    await evalCol.postRow(`${INSCRIPCIONES_BASE}/${o.inscripcionId}/ampliar`, {
      PERIODO: 101,
      GRADO: 1,
    })
    const d = toInscripcionDetalle(
      datos(await evalCol.getRow(`${INSCRIPCIONES_BASE}/${o.inscripcionId}`)),
    )
    expect(d.opciones.at(-1)).toMatchObject({ preferencia: 2, estado: "PENDIENTE" })
    await evalCol.postRow(`${INSCRIPCIONES_BASE}/${o.inscripcionId}/ampliar`, {
      PERIODO: 102,
      GRADO: 1,
    })
    const err = await evalCol
      .postRow(`${INSCRIPCIONES_BASE}/${o.inscripcionId}/ampliar`, { PERIODO: 103, GRADO: 1 })
      .catch((e) => e)
    expect(status(err)).toBe(400)
  })

  it("elegir deja la opción Admitida y descarta las demás", async () => {
    const porElegir = (await lista(["ADMITIDA"])).rows.find(
      (x) => x.estadoInscripcion === "POR_ELEGIR",
    )!
    const antes = toInscripcionDetalle(
      datos(await evalCol.getRow(`${INSCRIPCIONES_BASE}/${porElegir.inscripcionId}`)),
    )
    const otra = antes.opciones.find((x) => x.id !== porElegir.id && x.estado === "ADMITIDA")!
    await evalCol.postRow(`${INSCRIPCIONES_BASE}/opciones/${otra.id}/elegir`, {})
    const d = toInscripcionDetalle(
      datos(await evalCol.getRow(`${INSCRIPCIONES_BASE}/${porElegir.inscripcionId}`)),
    )
    expect(d.estado).toBe("ADMITIDA")
    expect(d.opciones.map((x) => x.estado)).toEqual(["DESCARTADA", "ADMITIDA"])
    const err = await evalCol
      .postRow(`${INSCRIPCIONES_BASE}/opciones/${porElegir.id}/elegir`, {})
      .catch((e) => e)
    expect(status(err)).toBe(400)
  })

  it("lista con la situación de edad del back", async () => {
    const r = await lista()
    expect(r.rows.some((o) => o.situacionEdad !== "SIN_CALCULAR")).toBe(true)
  })

  it("la cascada trae períodos de varios establecimientos con sus grados", async () => {
    const periodos = await fetchOpcionesCupo()
    expect(new Set(periodos.map((p) => p.establecimiento)).size).toBeGreaterThan(1)
    expect(periodos[0].grados.map((g) => g.nombre)).toContain("1°")
  })

  it("grupos del establecimiento con sus períodos", async () => {
    const grupos = await fetchGruposAdmisionRows(1)
    expect(grupos[0].periodos.length).toBeGreaterThan(0)
  })
})
