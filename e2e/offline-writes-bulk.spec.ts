import { expect, test, type Page } from "@playwright/test"

// Fase 2 offline, tarea 5.3: 40 celdas sin red → cerrar y reabrir → con red =
// 40 envíos, uno por celda; y dos pestañas sincronizando a la vez sin
// duplicados (líder único por Web Locks). Las ops se encolan con el motor real
// de la app (`runOrQueue("planilla.calificar")`, mismo handler que la
// Planilla) importado del dev server; MSW en modo `count` responde 200 y
// cuenta por pk (`src/mocks/browser.ts`).

const ENGINE = "/src/lib/offline/outbox/engine.ts"

async function setApiFault(page: Page, fault: "network" | "count" | null) {
  await page.evaluate((f) => {
    if (f) sessionStorage.setItem("msw:fault", f)
    else sessionStorage.removeItem("msw:fault")
  }, fault)
}

async function outboxStatuses(page: Page): Promise<string[]> {
  return page.evaluate(
    () =>
      new Promise<string[]>((resolve) => {
        const req = indexedDB.open("ce-offline")
        req.onerror = () => resolve([])
        req.onsuccess = () => {
          const db = req.result
          if (!db.objectStoreNames.contains("outbox")) {
            db.close()
            return resolve([])
          }
          const all = db.transaction("outbox").objectStore("outbox").getAll()
          all.onsuccess = () => {
            db.close()
            resolve((all.result as { status: string }[]).map((r) => r.status))
          }
          all.onerror = () => resolve([])
        }
      }),
  )
}

async function counts(page: Page): Promise<Record<string, number>> {
  return page.evaluate(() => JSON.parse(sessionStorage.getItem("msw:calificar-count") ?? "{}"))
}

async function login(page: Page) {
  await page.goto("/login?redirectTo=%2Fapp%2Fplaneador%2Fplanilla")
  await page.getByLabel("Correo electrónico").fill("docente@example.com")
  await page.getByLabel("Contraseña", { exact: true }).fill("password")
  await page.getByRole("checkbox", { name: "Este es un equipo compartido" }).click()
  await page.getByRole("button", { name: "Ingresar" }).click()
  await page.waitForURL((url) => url.pathname.startsWith("/app/"))
}

/** Encola `n` calificaciones (pk 1000..) sin red, con el motor de la app. */
async function encolar(page: Page, n: number) {
  await page.evaluate(
    async ({ engine, n }) => {
      const m = await import(/* @vite-ignore */ engine)
      for (let i = 0; i < n; i++) {
        await m.enqueue("planilla.calificar", {
          pkTactividadEstudiante: 1000 + i,
          actividadId: 1,
          CALIFICACION: JSON.stringify({ porcentaje: 80 }),
          FECHA: "2026-10-01",
          baseVersion: null,
          input: { tipo: "OTRO_PORCENTAJE", porcentaje: 80, pkTactividadEstudiante: 1000 + i, fecha: "2026-10-01" },
        })
      }
    },
    { engine: ENGINE, n },
  )
}

test.beforeEach(async ({ page }) => {
  await page.goto("/login")
  await page.evaluate(
    () =>
      new Promise<void>((resolve) => {
        sessionStorage.clear()
        const req = indexedDB.deleteDatabase("ce-offline")
        req.onsuccess = req.onerror = req.onblocked = () => resolve()
      }),
  )
  await page.evaluate(() => localStorage.clear())
})

test("40 celdas sin red → recargar → con red: 40 envíos, uno por celda", async ({ page }) => {
  test.setTimeout(180_000)
  await login(page)
  await page.waitForTimeout(2_000)
  await setApiFault(page, "network")
  await expect(page.locator("[data-slot=offline-banner]")).toContainText(/sin conexión/i, { timeout: 40_000 })

  await encolar(page, 40)
  await expect.poll(() => outboxStatuses(page)).toHaveLength(40)

  // Cerrar y reabrir sin red: las 40 siguen en el equipo.
  await page.reload()
  await page.waitForTimeout(3_000)
  expect((await outboxStatuses(page)).every((s) => s === "pending" || s === "retry")).toBe(true)

  await setApiFault(page, "count")
  await expect
    .poll(async () => (await outboxStatuses(page)).filter((s) => s === "done").length, { timeout: 90_000 })
    .toBe(40)
  const c = await counts(page)
  expect(Object.keys(c)).toHaveLength(40)
  expect(Object.values(c).every((v) => v === 1)).toBe(true)
})

test("dos pestañas sincronizando a la vez no duplican envíos", async ({ page, context }) => {
  test.setTimeout(180_000)
  await login(page)
  await page.waitForTimeout(2_000)
  await setApiFault(page, "network")
  await expect(page.locator("[data-slot=offline-banner]")).toContainText(/sin conexión/i, { timeout: 40_000 })
  await encolar(page, 20)
  await expect.poll(() => outboxStatuses(page)).toHaveLength(20)

  const other = await context.newPage()
  await other.goto("/app/planeador/planilla")
  await other.waitForURL((url) => url.pathname.startsWith("/app/"))
  await setApiFault(other, "count")
  await setApiFault(page, "count")

  // Las dos piden sincronizar al mismo tiempo.
  await Promise.all(
    [page, other].map((p) =>
      p.evaluate(async (engine) => {
        const m = await import(/* @vite-ignore */ engine)
        await m.syncNow()
      }, ENGINE),
    ),
  )
  await expect
    .poll(async () => (await outboxStatuses(page)).filter((s) => s === "done").length, { timeout: 90_000 })
    .toBe(20)

  const total: Record<string, number> = {}
  for (const p of [page, other]) {
    for (const [pk, n] of Object.entries(await counts(p))) total[pk] = (total[pk] ?? 0) + n
  }
  expect(Object.keys(total)).toHaveLength(20)
  expect(Object.values(total).every((v) => v === 1)).toBe(true)
})
