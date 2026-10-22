import { expect, test, type Page } from "@playwright/test"

// Preparar incremental (`add-offline-preparar-incremental`): la segunda
// corrida de "Preparar todo" justo después de la primera no rehace nada.
// - Lo fresco (catálogos 1 día, datos de grupo 4 h) ni se pide.
// - Planilla y asistencia se revisan con `If-None-Match` y vuelven 304.
// - Lo que llega igual no se reescribe en IndexedDB.
// MSW emula el ETag del backend real (`src/mocks/browser.ts`).

interface RunStats {
  durationMs: number
  fresh: number
  notModified: number
  fetched: number
  conditionalRequests: number
  notModifiedRequests: number
  rowsWritten: number
  rowsUnchanged: number
}

interface Snapshot {
  running: boolean
  lastPrepareAt: number | null
  lastOutcome: string | null
  lastRunStats: RunStats | null
}

async function login(page: Page, email: string) {
  await page.goto("/login")
  await page.evaluate(
    () =>
      new Promise<void>((resolve) => {
        localStorage.clear()
        sessionStorage.clear()
        const req = indexedDB.deleteDatabase("ce-offline")
        req.onsuccess = req.onerror = req.onblocked = () => resolve()
      }),
  )
  await page.reload()
  await page.getByLabel("Correo electrónico").fill(email)
  await page.getByLabel("Contraseña", { exact: true }).fill("password")
  const compartido = page.getByRole("checkbox", { name: "Este es un equipo compartido" })
  if (await compartido.isChecked()) await compartido.click()
  await page.getByRole("button", { name: "Ingresar" }).click()
  await page.waitForURL((url) => url.pathname.startsWith("/app/"))
  await page.waitForLoadState("networkidle")
}

function snapshot(page: Page): Promise<Snapshot> {
  return page.evaluate(
    () => (window as unknown as { __cePrepare: { getSnapshot: () => Snapshot } }).__cePrepare.getSnapshot(),
  )
}

/** Arranca "Preparar todo" desde el diálogo y espera a que la corrida termine. */
async function prepararTodo(page: Page): Promise<RunStats> {
  const antes = (await snapshot(page)).lastPrepareAt ?? 0
  await page.getByRole("button", { name: "Cuenta de usuario" }).click()
  await page.getByRole("menuitem", { name: "Preparar para usar sin conexión" }).click()
  const dialog = page.getByRole("dialog", { name: "Preparar para usar sin conexión" })
  const boton = dialog.getByRole("button", { name: /^(Preparar todo|Continuar)$/ })
  await expect(boton).toBeEnabled({ timeout: 30_000 })
  await boton.click()
  await expect(dialog).toBeHidden()
  await expect
    .poll(
      async () => {
        const s = await snapshot(page)
        return !s.running && (s.lastPrepareAt ?? 0) > antes
      },
      { timeout: 420_000, intervals: [250, 500, 1000] },
    )
    .toBe(true)
  const s = await snapshot(page)
  expect(s.lastOutcome).toBe("ok")
  return s.lastRunStats as RunStats
}

test("Preparar dos veces: la segunda es condicional, no reescribe nada y tarda mucho menos", async ({
  page,
}) => {
  test.setTimeout(900_000)
  // Cuenta las escrituras reales en el store `queries` de IndexedDB (no
  // depende de los contadores de la app).
  await page.addInitScript(() => {
    const w = window as unknown as { __idbQueryPuts: number }
    w.__idbQueryPuts = 0
    const put = IDBObjectStore.prototype.put
    IDBObjectStore.prototype.put = function (this: IDBObjectStore, ...args: Parameters<IDBObjectStore["put"]>) {
      if (this.name === "queries") w.__idbQueryPuts++
      return put.apply(this, args)
    }
  })
  await login(page, "docente@example.com")
  const puts = () => page.evaluate(() => (window as unknown as { __idbQueryPuts: number }).__idbQueryPuts)

  // Requests a la API por corrida (las ve Playwright aunque las responda MSW).
  const red = [
    { total: 0, condicionales: 0, n304: 0 },
    { total: 0, condicionales: 0, n304: 0 },
    { total: 0, condicionales: 0, n304: 0 },
  ]
  let fase = 0
  page.on("request", (req) => {
    if (!new URL(req.url()).pathname.startsWith("/api/")) return
    red[fase].total++
    if (req.headers()["if-none-match"]) red[fase].condicionales++
  })
  page.on("response", (res) => {
    if (res.status() === 304 && new URL(res.url()).pathname.startsWith("/api/")) red[fase].n304++
  })

  fase = 1
  const puts0 = await puts()
  const primera = await prepararTodo(page)
  const puts1 = await puts()
  fase = 2
  const segunda = await prepararTodo(page)
  const puts2 = await puts()
  fase = 0

  const escrituras = [0, puts1 - puts0, puts2 - puts1]
  console.log("[e2e] primera corrida", JSON.stringify({ ...primera, red: red[1], idbPuts: escrituras[1] }))
  console.log("[e2e] segunda corrida", JSON.stringify({ ...segunda, red: red[2], idbPuts: escrituras[2] }))

  // La primera baja y escribe todo.
  expect(primera.fetched).toBeGreaterThan(50)
  expect(primera.rowsWritten).toBeGreaterThan(50)
  expect(escrituras[1]).toBeGreaterThan(50)

  // La segunda: pide con If-None-Match (planilla, asistencia…) y el servidor
  // responde 304; lo demás está fresco y ni se pide.
  expect(red[2].condicionales).toBeGreaterThan(0)
  expect(red[2].n304).toBeGreaterThan(0)
  expect(segunda.notModified).toBeGreaterThan(0)
  expect(segunda.fresh).toBeGreaterThan(primera.fetched / 2)
  // ~0 escrituras: nada cambió entre una y otra (margen para el contador de
  // notificaciones u otro dato que el mock genere con la hora).
  expect(segunda.rowsWritten).toBeLessThanOrEqual(3)
  expect(escrituras[2]).toBeLessThanOrEqual(3)
  // Casi nada se baja completo (los 304 no traen cuerpo) y tarda mucho menos.
  expect(red[2].total - red[2].n304).toBeLessThan(red[1].total / 10)
  expect(segunda.durationMs).toBeLessThan(primera.durationMs / 2)
})
