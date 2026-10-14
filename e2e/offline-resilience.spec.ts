import { expect, test, type Page } from "@playwright/test"

// Fase 0 offline (`openspec/changes/add-offline-resilience`). MSW responde
// desde el propio navegador, así que ni `page.route` ni `context.setOffline`
// cortan la API mockeada: la falla de la API se simula con
// `sessionStorage["msw:fault"]` (ver `src/mocks/browser.ts`) y el evento
// `offline` del navegador con `context.setOffline`.
//
// Una recarga con el navegador realmente offline no puede ni bajar el
// `index.html` hasta que exista el app shell del Service Worker (Fase 1): por
// eso "recargar sin red" se prueba con la API caída y la página servida.

const ACTIVIDADES = "/app/planeador/actividades"
const SHOTS = process.env.E2E_SCREENSHOTS_DIR
const OFFLINE_COPY =
  "Estás sin conexión. Puedes seguir consultando y registrando asistencia y calificaciones; se enviarán cuando vuelva la conexión."
const SERVER_DOWN_COPY = "No pudimos comunicarnos con el servidor"

async function login(page: Page) {
  await page.goto(`/login?redirectTo=${encodeURIComponent(ACTIVIDADES)}`)
  await page.getByLabel("Correo electrónico").fill("docente@example.com")
  await page.getByLabel("Contraseña", { exact: true }).fill("password")
  await page.getByRole("button", { name: "Ingresar" }).click()
  await page.waitForURL((url) => url.pathname.startsWith("/app/planeador"))
  // En dev Vite sirve los módulos bajo demanda: hay que esperar a que la
  // pantalla termine de montar antes de cortar la red.
  await page.waitForLoadState("networkidle")
  await expect(page.getByRole("status").first()).toBeAttached({ timeout: 30_000 })
}

async function setApiFault(page: Page, fault: "network" | "server" | null) {
  await page.evaluate((f) => {
    if (f) sessionStorage.setItem("msw:fault", f)
    else sessionStorage.removeItem("msw:fault")
  }, fault)
}

const banner = (page: Page) => page.getByRole("status").filter({ hasText: /\S/ })
const toasts = (page: Page) => page.locator("[data-sonner-toast]")

async function shot(page: Page, name: string) {
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/${name}.png` })
}

test("recarga con la API caída en actividades no manda a /login y Reintentar recupera", async ({ page }) => {
  await login(page)
  await setApiFault(page, "network")
  await page.reload()
  // hasSession reintenta 1 s + 2 s + 4 s antes de rendirse.
  await expect(page.getByRole("heading", { name: SERVER_DOWN_COPY })).toBeVisible({ timeout: 15_000 })
  await expect(page.getByRole("button", { name: "Reintentar" })).toBeVisible()
  expect(new URL(page.url()).pathname).toBe(ACTIVIDADES)
  await expect(toasts(page)).toHaveCount(0)
  await shot(page, "a-recarga-sin-red-error")

  await setApiFault(page, null)
  await page.getByRole("button", { name: "Reintentar" }).click()
  await expect(page.getByRole("heading", { name: SERVER_DOWN_COPY })).toBeHidden({ timeout: 15_000 })
  expect(new URL(page.url()).pathname).toBe(ACTIVIDADES)
  await page.waitForLoadState("networkidle")
  await shot(page, "a-recuperado")
})

test("banner offline aparece tras ~1,5 s y se oculta al volver", async ({ page, context }) => {
  await login(page)
  await context.setOffline(true)
  // Antes de 1,5 s no hay banner (histéresis).
  await page.waitForTimeout(700)
  await expect(banner(page)).toHaveCount(0)
  await expect(banner(page)).toHaveText(OFFLINE_COPY, { timeout: 3_000 })
  await shot(page, "b-banner-offline")

  await context.setOffline(false)
  // offline → online exige 2 heartbeats OK separados 3 s.
  await expect(banner(page)).toHaveCount(0, { timeout: 15_000 })
  await shot(page, "b-banner-recuperado")
})

test("varias requests fallidas sin red no producen toasts", async ({ page }) => {
  await login(page)
  await setApiFault(page, "network")
  // Navegaciones del SPA que disparan queries contra la API.
  for (const name of ["Unidades", "Actividades", "Unidades"]) {
    const link = page.getByRole("link", { name, exact: true }).first()
    if (await link.isVisible()) await link.click()
    await page.waitForTimeout(1_500)
  }
  await page.evaluate(() => dispatchEvent(new Event("online")))
  await page.waitForTimeout(4_000)
  await expect(toasts(page)).toHaveCount(0)
  await expect(banner(page)).toBeVisible()
  await shot(page, "c-sin-toasts")
  await setApiFault(page, null)
})

test("un 503 de la API muestra el banner de servidor caído", async ({ page }) => {
  await login(page)
  await setApiFault(page, "server")
  // Adelanta el heartbeat (el evento `online` dispara uno inmediato).
  await page.evaluate(() => dispatchEvent(new Event("online")))
  await expect(banner(page)).toHaveText(SERVER_DOWN_COPY, { timeout: 10_000 })
  await expect(toasts(page)).toHaveCount(0)
  await shot(page, "d-banner-servidor-caido")
  await setApiFault(page, null)
})
