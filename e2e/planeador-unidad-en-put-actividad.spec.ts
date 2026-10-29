import { expect, test, type Page, type Request } from "@playwright/test"

// QA 73 (CU-86e3wrwyb): "La actividad se vincula a una unidad aunque el
// formulario presenta un error por falta de selección de evidencias".
// El formulario de la actividad ya no llama a
// `PUT /planeador/unidades/:ID/actividades/:ACT`: la unidad (asignar, mover o
// quitar) viaja en el único `PUT /planeador/actividades/:ID`, con sus
// evidencias. El mock de ese PUT reproduce las validaciones del backend
// (22023 sin evidencias, 23514 periodo cerrado) y no escribe nada si falla.
// Contra el dev server con MSW (`playwright.config.ts`).

const ACTIVIDAD = 602
const SHOTS = process.env.QA73_SHOTS

test.describe.configure({ timeout: 240_000 })

interface Fixture {
  unidades: { a: number; b: number; sinEvidencias: number }
  nombres: { a: string; b: string; sinEvidencias: string }
}

async function login(page: Page, to: string) {
  await page.goto(`/login?redirectTo=${encodeURIComponent(to)}`)
  await page.getByLabel("Correo electrónico").fill("docente@example.com")
  await page.getByLabel("Contraseña", { exact: true }).fill("password")
  await page.getByRole("button", { name: "Ingresar" }).click()
  await page.waitForURL((url) => url.pathname.startsWith("/app/"))
}

/**
 * Prepara la DB en memoria del mock (mismo módulo que usa MSW en la página):
 * la actividad 602 queda sin unidad y se crean tres unidades de su mismo
 * grado/asignatura — A y B con un enunciado (ofrecen evidencias) y una sin
 * enunciados (solo promedia).
 */
async function prepararDb(page: Page, opts: { unidadInicial?: "a"; fechaCerrada?: boolean } = {}): Promise<Fixture> {
  return page.evaluate(
    async ({ actividadId, opts }) => {
      const dbU = await import("/src/mocks/db/unidades-tematicas.ts")
      const dbA = await import("/src/mocks/db/planeador.ts")
      const actividad = dbA.planeadorDb.find((a: { id: number }) => a.id === actividadId)
      dbU.unlinkActividadFromUnidad(actividadId)
      const base = dbU.unidadesTematicasDb[0]
      const maxId = Math.max(...dbU.unidadesTematicasDb.map((u: { id: number }) => u.id))
      const crear = (offset: number, nombre: string, conEnunciado: boolean, metodo: string) => {
        const id = maxId + offset
        dbU.unidadesTematicasDb.push({
          ...structuredClone(base),
          id,
          nombre,
          grado: actividad.grado,
          asignatura: actividad.asignatura,
          metodoCalculo: metodo,
          enunciadosDba: conEnunciado ? [{ id: 7000 + offset, text: `Enunciado ${nombre}` }] : [],
          criterios: [],
          actividades: [],
        })
        return id
      }
      const nombres = { a: "QA73 Unidad A", b: "QA73 Unidad B", sinEvidencias: "QA73 Unidad promedio" }
      const unidades = {
        a: crear(1, nombres.a, true, "Promedio simple"),
        b: crear(2, nombres.b, true, "Promedio simple"),
        sinEvidencias: crear(3, nombres.sinEvidencias, false, "Promedio simple"),
      }
      actividad.unidad = { id: 0, nombre: "" }
      actividad.evidenciasIds = []
      actividad.criteriosUnidadIds = []
      if (opts.fechaCerrada) {
        actividad.fechaInicio = "2020-03-02"
        actividad.fechaCierre = "2020-03-20"
      }
      if (opts.unidadInicial === "a") {
        dbU.addActividadToUnidad(unidades.a, actividadId, 0)
        actividad.unidad = { id: unidades.a, nombre: nombres.a }
        actividad.evidenciasIds = [900_000 + 7001]
      }
      return { unidades, nombres }
    },
    { actividadId: ACTIVIDAD, opts },
  )
}

/** Actividades vinculadas a una unidad, leídas de la "API" (mock). */
async function vinculadas(page: Page, unidadId: number): Promise<{ actividadId?: number; id?: number }[]> {
  return page.evaluate(async (unidadId) => {
    const dbU = await import("/src/mocks/db/unidades-tematicas.ts")
    return dbU.unidadesTematicasDb.find((u: { id: number }) => u.id === unidadId)?.actividades ?? []
  }, unidadId)
}

async function detalle(page: Page) {
  return page.evaluate(async (id) => {
    const dbA = await import("/src/mocks/db/planeador.ts")
    const a = dbA.planeadorDb.find((x: { id: number }) => x.id === id)
    return { unidad: a.unidad.id as number, evidencias: a.evidenciasIds as number[] }
  }, ACTIVIDAD)
}

/** Escrituras (PUT/PATCH/POST) del planeador durante el guardado. */
function capturarEscrituras(page: Page) {
  const writes: string[] = []
  const onRequest = (req: Request) => {
    if (!["PUT", "PATCH", "POST", "DELETE"].includes(req.method())) return
    const url = new URL(req.url())
    if (!url.pathname.startsWith("/api/eval-col/planeador/")) return
    writes.push(`${req.method()} ${url.pathname}`)
  }
  page.on("request", onRequest)
  return writes
}

/** Navegación del lado del cliente: un `goto` recargaría la página y con ella la DB del mock. */
async function abrirEdicion(page: Page) {
  const to = `/app/planeador/actividades/${ACTIVIDAD}/editar`
  await page.evaluate(async (to) => {
    const router = (window as unknown as { __ceRouter: { navigate(o: { to: string }): Promise<void> } }).__ceRouter
    await router.navigate({ to })
  }, to)
  await page.waitForURL((url) => url.pathname === to, { timeout: 30_000 })
  await expect(page.getByRole("button", { name: "Cerrar" })).toBeVisible({ timeout: 60_000 })
  await expect(page.getByText("Cargando…")).toHaveCount(0, { timeout: 60_000 })
}

async function elegirUnidad(page: Page, nombre: string) {
  await page.getByRole("combobox", { name: /Unidad temática|Proyecto/ }).click()
  await page.getByRole("option", { name: nombre }).click()
}

async function guardar(page: Page) {
  await page.getByRole("button", { name: "Guardar" }).click()
}

async function shot(page: Page, name: string) {
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/${name}.png`, fullPage: true })
}

test.beforeEach(async ({ page }) => {
  await page.goto("/login")
  await page.evaluate(
    () =>
      new Promise<void>((resolve) => {
        sessionStorage.clear()
        localStorage.clear()
        const req = indexedDB.deleteDatabase("ce-offline")
        req.onsuccess = req.onerror = req.onblocked = () => resolve()
      }),
  )
  await login(page, "/app/planeador/actividades")
  await expect(page.getByRole("region", { name: "Listado de actividades" })).toBeVisible({ timeout: 60_000 })
})

test("1) asignar unidad sin marcar evidencias: error, UNA sola petición y no queda vinculada", async ({ page }) => {
  const fx = await prepararDb(page)
  await abrirEdicion(page)
  await elegirUnidad(page, fx.nombres.a)
  const writes = capturarEscrituras(page)
  await guardar(page)
  await expect(page.getByText(/al menos una evidencia/)).toBeVisible({ timeout: 30_000 })
  await shot(page, "1-sin-evidencias-error")
  expect(writes).toEqual([`PUT /api/eval-col/planeador/actividades/${ACTIVIDAD}`])
  expect(await vinculadas(page, fx.unidades.a)).toHaveLength(0)
  expect((await detalle(page)).unidad).toBe(0)
  // El formulario sigue abierto con lo elegido.
  await expect(page).toHaveURL(new RegExp(`/actividades/${ACTIVIDAD}/editar`))
  await expect(page.getByRole("combobox", { name: /Unidad temática|Proyecto/ })).toContainText(fx.nombres.a)
})

test("2) asignar unidad marcando una evidencia: se guarda con sus evidencias", async ({ page }) => {
  const fx = await prepararDb(page)
  await abrirEdicion(page)
  await elegirUnidad(page, fx.nombres.a)
  await page.getByRole("checkbox", { name: /Evidencia de: Enunciado QA73 Unidad A/ }).click()
  const writes = capturarEscrituras(page)
  await guardar(page)
  await page.waitForURL((url) => !url.pathname.endsWith("/editar"), { timeout: 30_000 })
  await shot(page, "2-con-evidencia-ok")
  expect(writes.filter((w) => w.includes("/unidades/"))).toEqual([])
  expect(writes[0]).toBe(`PUT /api/eval-col/planeador/actividades/${ACTIVIDAD}`)
  expect((await vinculadas(page, fx.unidades.a)).map((a) => a.actividadId)).toEqual([ACTIVIDAD])
  expect(await detalle(page)).toEqual({ unidad: fx.unidades.a, evidencias: [900_000 + 7001] })
})

test("3) mover de A a B sin marcar evidencias de B: error y sigue en A con sus evidencias", async ({ page }) => {
  const fx = await prepararDb(page, { unidadInicial: "a" })
  await abrirEdicion(page)
  await elegirUnidad(page, fx.nombres.b)
  const writes = capturarEscrituras(page)
  await guardar(page)
  await expect(page.getByText(/al menos una evidencia/)).toBeVisible({ timeout: 30_000 })
  await shot(page, "3-mover-sin-evidencias-error")
  expect(writes).toEqual([`PUT /api/eval-col/planeador/actividades/${ACTIVIDAD}`])
  expect(await vinculadas(page, fx.unidades.b)).toHaveLength(0)
  expect((await vinculadas(page, fx.unidades.a)).map((a) => a.actividadId)).toEqual([ACTIVIDAD])
  expect(await detalle(page)).toEqual({ unidad: fx.unidades.a, evidencias: [900_000 + 7001] })
})

test("4) quitar la unidad: DESVINCULAR_UNIDAD en el PUT y sale del listado", async ({ page }) => {
  const fx = await prepararDb(page, { unidadInicial: "a" })
  await abrirEdicion(page)
  const body = page.waitForRequest(
    (r) => r.method() === "PUT" && new URL(r.url()).pathname === `/api/eval-col/planeador/actividades/${ACTIVIDAD}`,
  )
  await page.getByRole("combobox", { name: /Unidad temática|Proyecto/ }).click()
  await page.getByRole("option", { name: "Seleccione" }).click()
  const writes = capturarEscrituras(page)
  await guardar(page)
  expect((await body).postDataJSON()).toMatchObject({ DESVINCULAR_UNIDAD: true })
  await page.waitForURL((url) => !url.pathname.endsWith("/editar"), { timeout: 30_000 })
  await shot(page, "4-quitar-unidad-ok")
  expect(writes.filter((w) => w.includes("/unidades/"))).toEqual([])
  expect(await vinculadas(page, fx.unidades.a)).toHaveLength(0)
  expect((await detalle(page)).unidad).toBe(0)
})

test("5) unidad sin evidencias (solo promedia): se guarda sin pedirlas", async ({ page }) => {
  const fx = await prepararDb(page)
  await abrirEdicion(page)
  await elegirUnidad(page, fx.nombres.sinEvidencias)
  const writes = capturarEscrituras(page)
  await guardar(page)
  await page.waitForURL((url) => !url.pathname.endsWith("/editar"), { timeout: 30_000 })
  await shot(page, "5-sin-evidencias-ofrecidas-ok")
  expect(writes.filter((w) => w.includes("/unidades/"))).toEqual([])
  expect((await vinculadas(page, fx.unidades.sinEvidencias)).map((a) => a.actividadId)).toEqual([ACTIVIDAD])
})

test("6) fechas en periodo cerrado: error 23514 y sigue sin unidad", async ({ page }) => {
  const fx = await prepararDb(page, { fechaCerrada: true })
  await abrirEdicion(page)
  await elegirUnidad(page, fx.nombres.sinEvidencias)
  const writes = capturarEscrituras(page)
  const resp = page.waitForResponse(
    (r) => r.request().method() === "PUT" && new URL(r.url()).pathname === `/api/eval-col/planeador/actividades/${ACTIVIDAD}`,
  )
  await guardar(page)
  const r = await resp
  expect(r.status()).toBe(400)
  expect((await r.json()).code).toBe("23514")
  await expect(page.getByText(/periodo cerrado/)).toBeVisible({ timeout: 30_000 })
  await shot(page, "6-periodo-cerrado-error")
  expect(writes).toEqual([`PUT /api/eval-col/planeador/actividades/${ACTIVIDAD}`])
  expect(await vinculadas(page, fx.unidades.sinEvidencias)).toHaveLength(0)
  expect((await detalle(page)).unidad).toBe(0)
})
