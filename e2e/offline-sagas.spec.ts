import { expect, test, type Page } from "@playwright/test"

// Fase 3 offline (`openspec/changes/add-offline-planeador-sagas`, tarea
// 5.2). Contra el dev server con MSW (`playwright.config.ts`). "Se cae la
// red al guardar" = `sessionStorage["msw:fault"] = "planeador-writes"`: las
// escrituras de actividades/unidades fallan como `Network Error` y la saga
// queda en la outbox; lo demás (lecturas, heartbeat) sigue bien.

const SHOTS = process.env.E2E_SCREENSHOTS_DIR

async function shot(page: Page, name: string) {
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/${name}.png`, fullPage: true })
}

async function setApiFault(page: Page, fault: string | null) {
  await page.evaluate((f) => {
    if (f) sessionStorage.setItem("msw:fault", f)
    else sessionStorage.removeItem("msw:fault")
  }, fault)
}

async function login(page: Page, to: string) {
  await page.goto(`/login?redirectTo=${encodeURIComponent(to)}`)
  await page.getByLabel("Correo electrónico").fill("docente@example.com")
  await page.getByLabel("Contraseña", { exact: true }).fill("password")
  await page.getByRole("checkbox", { name: "Este es un equipo compartido" }).click()
  await page.getByRole("button", { name: "Ingresar" }).click()
  await page.waitForURL((url) => url.pathname.startsWith("/app/"))
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
})

test("editar una unidad sin red: queda como saga, sobrevive a la recarga y se sincroniza", async ({ page }) => {
  test.setTimeout(150_000)
  await login(page, "/app/planeador/unidades")
  await page.goto("/app/planeador/unidades")

  const editar = page.getByRole("button", { name: /^Editar / }).first()
  await expect(editar).toBeEnabled({ timeout: 30_000 })
  await editar.click({ force: true })
  await page.waitForURL(/\/unidades\/editar\//)

  const nombre = page.getByRole("textbox", { name: "Ej: Diseño de prototipo" })
  await expect(nombre).toBeVisible({ timeout: 30_000 })
  await nombre.fill("Unidad editada sin conexión")

  await setApiFault(page, "planeador-writes")
  await page.getByRole("button", { name: "Guardar", exact: true }).click()
  await expect(page.getByText(/Guardado en este equipo/).first()).toBeVisible({ timeout: 15_000 })
  await expect(page.locator("[data-slot=saga-badge]").first()).toBeVisible({ timeout: 10_000 })
  await shot(page, "f3-a-unidad-encolada")

  // Reinicio: la saga sigue en IndexedDB.
  await page.reload()
  await page.goto("/app/pendientes")
  const saga = page.locator("[data-slot=saga]").first()
  await expect(saga).toBeVisible({ timeout: 20_000 })
  await expect(saga.locator("[data-slot=saga-step]")).toContainText("Datos de la unidad")
  await shot(page, "f3-b-pendientes")

  await setApiFault(page, null)
  await page.getByRole("button", { name: "Sincronizar ahora" }).click()
  await expect(page.locator("[data-slot=saga]")).toHaveCount(0, { timeout: 30_000 })
  await shot(page, "f3-c-sincronizado")
})
