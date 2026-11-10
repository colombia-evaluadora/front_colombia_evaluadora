import { setupServer } from "msw/node"
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest"

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
const { postMultipart } = await import("@/lib/files")
const { entidadTerritorialHandlers } = await import("@/mocks/handlers/entidad-territorial")
const { TERRITORIAL_BASE } =
  await import("@/features/coverage/inscripcion-reservas/api/query/use-territorial-query")
type Calendario =
  import("@/features/coverage/inscripcion-reservas/api/types/territorial").CalendarioCobertura

api.defaults.baseURL = "http://localhost/api"
const server = setupServer(...entidadTerritorialHandlers)
beforeAll(() => server.listen({ onUnhandledRequest: "error" }))
afterAll(() => server.close())

const status = (e: unknown) => (e as { response?: { status?: number } }).response?.status
const calendarios = async () =>
  (await evalCol.getRow<{ datos: Calendario[] }>(`${TERRITORIAL_BASE}/calendarios`)).datos
const CAL = `/eval-col${TERRITORIAL_BASE}/calendarios`
const base = {
  ANIO: 2028,
  MODALIDAD: "Anual",
  CICLO: 1,
  INICIO_INSCRIPCION: "2027-10-01",
  FECHA_CIERRE_INSCRIPCION: "2027-11-30",
  FECHA_LIMITE_MATRICULA: "2028-01-31",
  PLAZO_SOLICITUD_RETIRO: 5,
  ESTADO: "BORRADOR",
}

describe("mock de Entidad territorial", () => {
  it("crea un calendario y rechaza fechas fuera de orden o repetidos", async () => {
    await postMultipart(CAL, base, {})
    expect((await calendarios()).some((c) => c.anio === 2028 && c.estado === "BORRADOR")).toBe(true)
    expect(status(await postMultipart(CAL, base, {}).catch((e) => e))).toBe(400)
    const malo = { ...base, ANIO: 2029, FECHA_LIMITE_MATRICULA: "2027-11-01" }
    expect(status(await postMultipart(CAL, malo, {}).catch((e) => e))).toBe(400)
  })

  it("publica un Borrador y solo amplía la fecha límite de uno Publicado", async () => {
    const borrador = (await calendarios()).find((c) => c.estado === "BORRADOR")!
    const ampliar = (id: number, fecha: string) =>
      postMultipart(
        `${CAL}/${id}/ampliar`,
        { FECHA: fecha, ESTABLECIMIENTOS: "[1]", MOTIVO: "Paro" },
        {},
      )
    expect(status(await ampliar(borrador.id, "2030-01-01").catch((e) => e))).toBe(400)
    await evalCol.postRow(`${TERRITORIAL_BASE}/calendarios/${borrador.id}/publicar`, {})
    expect(status(await ampliar(borrador.id, borrador.fechaLimiteMatricula).catch((e) => e))).toBe(
      400,
    )
    await ampliar(borrador.id, "2030-01-01")
    // General: sin establecimientos cambia la fecha del calendario; el cierre no va por establecimiento.
    const cierre = (ees: string) =>
      postMultipart(
        `${CAL}/${borrador.id}/ampliar`,
        { CAMPO: "FECHA_CIERRE_INSCRIPCION", FECHA: "2029-12-01", ESTABLECIMIENTOS: ees, MOTIVO: "Paro" },
        {},
      )
    expect(status(await cierre("[1]").catch((e) => e))).toBe(400)
    await cierre("[]")
    expect((await calendarios()).find((c) => c.id === borrador.id)?.fechaCierreInscripcion).toBe(
      "2029-12-01",
    )
    const enLinea = (b: object) =>
      evalCol.postRow(`${TERRITORIAL_BASE}/calendarios/${borrador.id}/inscripcion-en-linea`, b)
    expect(status(await enLinea({ ACCION: "HABILITAR", ESTABLECIMIENTOS: "[]", MOTIVO: "x" }).catch((e) => e))).toBe(400)
    await enLinea({ ACCION: "SUSPENDER", ESTABLECIMIENTOS: "[1,2]", MOTIVO: "Paro" })
  })

  it("devolver la proyección exige una observación de 10 a 500 caracteres", async () => {
    const corta = await evalCol
      .postRow(`${TERRITORIAL_BASE}/proyeccion/2/devolver`, { OBSERVACION: "corta" })
      .catch((e) => e)
    expect(status(corta)).toBe(400)
    await evalCol.postRow(`${TERRITORIAL_BASE}/proyeccion/2/devolver`, {
      OBSERVACION: "Faltan grupos en 6°.",
    })
    await evalCol.postRow(`${TERRITORIAL_BASE}/proyeccion/2/aprobar`, {})
  })

  it("Ver proyección: cupo libre = cupo − vienen y las sedes suman el grado", async () => {
    type Detalle =
      import("@/features/coverage/inscripcion-reservas/api/types/territorial").ProyeccionDetalle
    const { datos } = await evalCol.getRow<{ datos: Detalle }>(`${TERRITORIAL_BASE}/proyeccion/2`)
    expect(datos.detalle.filter((g) => g.cupoLibre! < 0)).toHaveLength(datos.gradosConDeficit)
    for (const g of datos.detalle) {
      expect(g.cupoLibre).toBe(g.cupoProyectado - g.vienen!)
      expect(g.sedes.reduce((n, s) => n + s.cupoProyectado, 0)).toBe(g.cupoProyectado)
      expect(g.sedes.reduce((n, s) => n + s.vienen!, 0)).toBe(g.vienen)
    }
  })

  it("Seguimiento: por grado y por sede suman lo mismo que la lista", async () => {
    type Fila = { sinContinuidad: number; cursando: number }
    const lista = (
      await evalCol.getRow<{ datos: (Fila & { establecimientoId: number })[] }>(
        `${TERRITORIAL_BASE}/seguimiento`,
      )
    ).datos
    const sur = lista.find((x) => x.sinContinuidad === 7)!
    const d = (
      await evalCol.getRow<{ datos: { porGrado: (Fila & { hijos: Fila[] })[]; porSede: Fila[] } }>(
        `${TERRITORIAL_BASE}/seguimiento/${sur.establecimientoId}`,
      )
    ).datos
    const suma = (xs: Fila[], k: keyof Fila) => xs.reduce((a, x) => a + x[k], 0)
    expect(suma(d.porGrado, "sinContinuidad")).toBe(7)
    expect(suma(d.porSede, "cursando")).toBe(sur.cursando)
    expect(suma(d.porGrado[0].hijos, "cursando")).toBe(d.porGrado[0].cursando)
  })

  it("Redistribución: ubicar pasa a Ubicados sin grupo y liberar lo devuelve", async () => {
    type R = { id: number; aspirante: string; sedeCercana: string | null }
    type U = { id: number; aspirante: string; estado: string }
    const red = async () =>
      (await evalCol.postRow<{ datos: { filas: R[] } }>(`${TERRITORIAL_BASE}/consulta/redistribucion`, {}))
        .datos.filas
    const ubi = async () =>
      (await evalCol.getRow<{ datos: U[] }>(`${TERRITORIAL_BASE}/ubicados`)).datos
    const ubicar = (b: object) => evalCol.postRow(`${TERRITORIAL_BASE}/redistribucion/ubicar`, b)
    const antes = await red()
    const sara = antes.find((r) => r.aspirante === "Sara Gil Mena")!
    // Contratado sin cupo contratado libre en la opción 1: 400.
    const sinCupo = {
      INSCRIPCIONES: JSON.stringify([sara.id]),
      FK_OPCION: 1,
      TIPO_CUPO: "CONTRATADO",
      REQUIERE_CONFIRMACION: "S",
    }
    expect(status(await ubicar(sinCupo).catch((e) => e))).toBe(400)
    await ubicar({ ...sinCupo, TIPO_CUPO: "OFICIAL" })
    expect((await red()).some((r) => r.id === sara.id)).toBe(false)
    const nueva = (await ubi()).find((u) => u.aspirante === "Sara Gil Mena")!
    expect(nueva.estado).toBe("PENDIENTE_CONFIRMACION")
    // Varios a la vez: rechaza si alguno no tiene sede cercana.
    const sinSede = antes.find((r) => !r.sedeCercana)!
    const varios = {
      INSCRIPCIONES: JSON.stringify([sinSede.id]),
      FK_OPCION: null,
      TIPO_CUPO: "OFICIAL",
      REQUIERE_CONFIRMACION: "N",
    }
    expect(status(await ubicar(varios).catch((e) => e))).toBe(400)
    const liberar = (m: string) =>
      evalCol.postRow(`${TERRITORIAL_BASE}/ubicados/${nueva.id}/liberar`, { MOTIVO: m })
    expect(status(await liberar("corto").catch((e) => e))).toBe(400)
    await liberar("La familia se trasladó a otro municipio.")
    expect((await red()).some((r) => r.aspirante === "Sara Gil Mena")).toBe(true)
  })

  it("Cupo contratado: entre ocupados y retenidos y el cupo menos las propias", async () => {
    const guardar = (n: number) =>
      evalCol.postRow(`${TERRITORIAL_BASE}/cupos-contratados/1`, { CUPO_CONTRATADO: n })
    expect(status(await guardar(6).catch((e) => e))).toBe(400)
    expect(status(await guardar(16).catch((e) => e))).toBe(400)
    await guardar(12)
    type C = { id: number; libresContratados: number }
    const lista = async (b: object = {}) =>
      (
        await evalCol.postRow<{ datos: { total: number; filas: C[] } }>(
          `${TERRITORIAL_BASE}/consulta/cupos-contratados`,
          b,
        )
      ).datos
    expect((await lista()).filas.find((c) => c.id === 1)?.libresContratados).toBe(5)
    // Paginado en el back y solo grupos de oferentes.
    const p = await lista({ PAGEINDEX: 0, PAGESIZE: 1 })
    expect([p.total, p.filas.length]).toEqual([4, 1])
    const oferentes = (ids: number[]) =>
      evalCol.postRow(`${TERRITORIAL_BASE}/oferentes`, { ESTABLECIMIENTOS: JSON.stringify(ids) })
    expect(status(await oferentes([1, 6, 7]).catch((e) => e))).toBe(400)
    expect(status(await oferentes([6]).catch((e) => e))).toBe(409)
    await oferentes([4, 6, 7])
  })

  it("Solicitudes de retiro: solo se deciden Vencidas u Objetadas", async () => {
    const r = (id: number, accion: string, b = {}) =>
      evalCol.postRow(`${TERRITORIAL_BASE}/solicitudes-retiro/${id}/${accion}`, b)
    expect(status(await r(1, "registrar-retiro").catch((e) => e))).toBe(400)
    await r(2, "registrar-retiro")
    expect(status(await r(3, "cerrar", { MOTIVO: "corto" }).catch((e) => e))).toBe(400)
    await r(3, "cerrar", { MOTIVO: "La estudiante sigue asistiendo al origen." })
    type S = { id: number; estado: string }
    const lista = (await evalCol.getRow<{ datos: S[] }>(`${TERRITORIAL_BASE}/solicitudes-retiro`))
      .datos
    expect(lista.find((s) => s.id === 2)?.estado).toBe("ATENDIDA")
    expect(lista.find((s) => s.id === 3)?.estado).toBe("POR_ANULAR_DESTINO")
  })

  it("Orientar exige tema y una orientación de 10 a 1000 caracteres", async () => {
    const enviar = (o: string) =>
      evalCol.postRow(`${TERRITORIAL_BASE}/orientaciones`, {
        FK_ESTABLECIMIENTO: 5,
        MOTIVO: "FALTA_CONTINUIDAD",
        TEMA: "Cobertura",
        ORIENTACION: o,
      })
    expect(status(await enviar("corta").catch((e) => e))).toBe(400)
    await enviar("Revise los cupos del grado 1°.")
    type O = { orientacion: string; estado: string; alerta: string | null }
    const lista = (await evalCol.getRow<{ datos: O[] }>(`${TERRITORIAL_BASE}/orientaciones`)).datos
    const nueva = lista.find((o) => o.orientacion === "Revise los cupos del grado 1°.")!
    expect(nueva.estado).toBe("ENVIADA")
    expect(nueva.alerta).toBe("continuidad")
  })
})
