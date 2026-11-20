// @vitest-environment jsdom
import { setupServer } from "msw/node"
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest"

// El front llama a los uuids públicos reales (sso V425/V426/V432/V433) y el mock los imita.
vi.mock("@/config/env", () => ({
  env: {
    API_URL: "http://localhost/api",
    ENABLE_API_MOCKING: false,
    APP_URL: "http://localhost",
    NAME: "TEST",
  },
}))

vi.mock("sonner", () => ({ toast: { error: vi.fn() } }))

const { inscripcionPublicaHandlers } = await import("@/mocks/handlers/inscripcion-publica")
const { fetchContextoInscripcion, pedirCodigoRegistro, registrarInscripcion } =
  await import("@/features/publico/inscribir/api/inscripcion-publica")
const { anularInscripcionPublica, consultarInscripcion, elegirOpcionPublica, responderUbicacion } =
  await import("@/features/publico/consultar/api/consulta-publica")
const { createInitialMatriculaValues } = await import("@/features/coverage/matricula/utils/matricula-form-defaults")

const server = setupServer(...inscripcionPublicaHandlers)
beforeAll(() => server.listen({ onUnhandledRequest: "error" }))
afterAll(() => server.close())

const registro = (codigo: string) => ({
  datos: createInitialMatriculaValues(),
  correo: "acudiente@correo.com",
  codigo,
  opciones: [{ periodo: 100, grado: 10006 }],
  documentoHermano: null,
  paisOrigen: null,
  lenguaMaterna: null,
  condicionMigratoria: null,
  autorizaDatos: false,
})

describe("inscripción pública (mock)", () => {
  it("el contexto está habilitado y trae cascada y catálogos", async () => {
    const c = await fetchContextoInscripcion()
    expect(c.habilitada).toBe(true)
    expect(c.opciones.length).toBeGreaterThan(0)
    expect(c.catalogos?.listas?.TIPO_DOCUMENTO?.length).toBeGreaterThan(0)
  })

  it("envía el código y registra con número; un código errado devuelve los intentos", async () => {
    expect(await pedirCodigoRegistro("acudiente@correo.com")).toBeNull()
    const mal = await registrarInscripcion(registro("111111"))
    expect(mal).toMatchObject({ registrada: false, intentosRestantes: 4 })
    const ok = await registrarInscripcion(registro("123456"))
    expect(ok.registrada).toBe(true)
    if (ok.registrada) {
      expect(ok.mensaje).toBe(`Inscripción ${ok.numeroInscripcion} registrada.`)
      expect(ok.autorizacionPendiente).toBe(true)
    }
  })
})

describe("acciones de Consultar inscripción (mock)", () => {
  it("Quedarme con esta opción descarta las demás", async () => {
    const c = { numero: "0211", documento: "1098456123", codigo: "123456" }
    const r = await consultarInscripcion(c)
    if (!r.encontrada) throw new Error("no encontrada")
    const admitida = r.inscripcion.opciones.find((o) => o.estado === "ADMITIDA")!
    const i = await elegirOpcionPublica(c, admitida.id!)
    expect(i.estado).toBe("ADMITIDA")
    expect(i.opciones.filter((o) => o.estado !== "ADMITIDA").every((o) => o.estado === "DESCARTADA" || o.estado === "NO_ADMITIDA")).toBe(true)
  })

  it("confirma la ubicación propuesta", async () => {
    const c = { numero: "0178", documento: "1097123456", codigo: "123456" }
    const r = await consultarInscripcion(c)
    expect(r.encontrada && r.inscripcion.estado).toBe("UBICACION_PROPUESTA")
    const { inscripcion } = await responderUbicacion(c, true)
    expect(inscripcion.estado).toBe("UBICADO")
  })

  it("anula con motivo: todas las opciones Descartadas", async () => {
    const c = { numero: "0302", documento: "1098555777", codigo: "123456" }
    const i = await anularInscripcionPublica(c, 1)
    expect(i.estado).toBe("ANULADA")
    expect(i.opciones.every((o) => o.estado === "DESCARTADA")).toBe(true)
  })

  it("con un código inválido la acción falla con el mensaje del backend", async () => {
    await expect(anularInscripcionPublica({ numero: "0302", documento: "1098555777", codigo: "x" }, 1)).rejects.toThrow(
      /no coinciden/,
    )
  })
})
