import { expect, test, type Page } from "@playwright/test"

// Incidente ERR_FAILED en testv2 (docs/offline/KILL-SWITCH.md, "Navegaciones
// que nunca fallan"): si `/index.html` falta del precache, la navegación no
// puede rechazar. Antes, `createHandlerBoundToURL` tiraba y Chrome mostraba
// "No se puede acceder a este sitio web".

async function waitForControlledPage(page: Page) {
  await page.goto("/login")
  await page.evaluate(async () => {
    const registration = await navigator.serviceWorker.ready
    const sw = registration.active
    if (sw && sw.state !== "activated") {
      await new Promise<void>((resolve) =>
        sw.addEventListener("statechange", () => sw.state === "activated" && resolve()),
      )
    }
  })
  await page.reload()
  await expect
    .poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller)))
    .toBe(true)
}

/** Borra `/index.html` de todas las caches (simula un precache roto). */
async function deletePrecachedIndex(page: Page) {
  const deleted = await page.evaluate(async () => {
    let count = 0
    for (const key of await caches.keys()) {
      const cache = await caches.open(key)
      for (const req of await cache.keys()) {
        const { pathname } = new URL(req.url)
        if (pathname === "/index.html" || pathname === "/") {
          await cache.delete(req)
          count++
        }
      }
    }
    return count
  })
  expect(deleted).toBeGreaterThan(0)
}

test("(a) sin index.html en el precache, online la app carga desde la red", async ({ page }) => {
  await waitForControlledPage(page)
  await deletePrecachedIndex(page)
  await page.goto("/login")
  await expect(page).toHaveTitle("Colombia Evaluadora")
  await expect(page.getByLabel("Correo electrónico")).toBeVisible({ timeout: 30_000 })
})

test("(b) sin index.html en el precache y sin red, aparece la página inline", async ({
  page,
  context,
}) => {
  await waitForControlledPage(page)
  await deletePrecachedIndex(page)
  await context.setOffline(true)
  try {
    const response = await page.goto("/login")
    expect(response?.status()).toBe(503)
    await expect(page.getByText("No se pudo cargar Colombia Evaluadora")).toBeVisible()
    await expect(page.getByText("Revisa tu conexión y vuelve a intentar.")).toBeVisible()
    await expect(page.getByRole("button", { name: "Reintentar" })).toBeVisible()
  } finally {
    await context.setOffline(false)
  }
})

test("(c) navegación sin red con precache sano sirve el shell", async ({ page, context }) => {
  await waitForControlledPage(page)
  await context.setOffline(true)
  try {
    const started = Date.now()
    await page.goto("/app/cobertura/matricula")
    // Sin red `fetch` falla al instante: no debe esperar el timeout de red.
    expect(Date.now() - started).toBeLessThan(3_000)
    await expect(page).toHaveTitle("Colombia Evaluadora")
    await expect(page.locator("#root")).not.toBeEmpty({ timeout: 30_000 })
    await expect(page.getByText("No se pudo cargar Colombia Evaluadora")).toHaveCount(0)
  } finally {
    await context.setOffline(false)
  }
})
