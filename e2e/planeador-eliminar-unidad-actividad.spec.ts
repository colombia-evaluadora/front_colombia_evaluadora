import { expect, test, type Page } from "@playwright/test"

// Reglas 38/39: eliminar una unidad con el dueño solo y eliminar una
// actividad con resultados. Contra el dev server con MSW (`playwright.config.ts`).
// Seed: la unidad 1 tiene a 601 (12 evaluados); la 4 no tiene actividades ni colegas y
// 612 ("Quiz de fracciones") no tiene resultados.

const MENSAJE_ACTIVIDAD =
  "No se puede eliminar una actividad con resultados registrados por normativa de conservación de datos"
const CAPTURAS = process.env.E2E_CAPTURAS

test.describe.configure({ timeout: 240_000 })

async function login(page: Page, to: string) {
  await page.goto(`/login?redirectTo=${encodeURIComponent(to)}`)
  await page.getByLabel("Correo electrónico").fill("docente@example.com")
  await page.getByLabel("Contraseña", { exact: true }).fill("password")
  await page.getByRole("button", { name: "Ingresar" }).click()
  await page.waitForURL((url) => url.pathname.startsWith("/app/"))
}

async function captura(page: Page, nombre: string) {
  if (CAPTURAS) await page.screenshot({ path: `${CAPTURAS}/${nombre}.png` })
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

test("una unidad con actividades calificadas no se elimina: se nombran y no se ofrece cederla", async ({ page }) => {
  await login(page, "/app/planeador/unidades?unidad=1")
  await page.goto("/app/planeador/unidades?unidad=1")

  await page
    .getByRole("button", { name: "Eliminar Análisis de un texto argumentativo" })
    .first()
    .dispatchEvent("click", undefined, { timeout: 60_000 })
  const dialogo = page.getByRole("alertdialog")
  await expect(dialogo.getByText(/No se puede eliminar/)).toBeVisible({ timeout: 30_000 })
  await expect(dialogo.getByText(/tienen resultados registrados/)).toContainText("Proyecto final: Diseño de prototipo 1")
  await expect(dialogo.getByText("Ceder a")).toHaveCount(0)
  await expect(dialogo.getByRole("button", { name: /^Eliminar/ })).toHaveCount(0)
  await captura(page, "01-unidad-bloqueada-por-resultados")
})

test("sin notas pregunta si eliminar solo la unidad o también sus actividades, y la opción B las borra", async ({
  page,
}) => {
  await login(page, "/app/planeador/unidades?unidad=4")
  await page.goto("/app/planeador/unidades?unidad=4")
  // La base de MSW vive en memoria: el vínculo se hace después de la última recarga.
  await expect(page.getByRole("button", { name: "Eliminar Clasificación de los seres vivos" }).first()).toBeAttached({ timeout: 60_000 })
  const vinculo = await page.evaluate(async () => {
    const res = await fetch("/api/eval-col/planeador/unidades/4/actividades/612", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ PONDERACION: 0 }),
    })
    return res.status
  })
  expect(vinculo).toBe(200)

  await page
    .getByRole("button", { name: "Eliminar Clasificación de los seres vivos" })
    .first()
    // La card del rail tapa su botón con el overlay "Ver detalle": se dispara el click directo.
    .dispatchEvent("click", undefined, { timeout: 60_000 })
  const dialogo = page.getByRole("alertdialog")
  await expect(dialogo.getByText(/¿Desea eliminar únicamente/)).toBeVisible({ timeout: 30_000 })
  await expect(dialogo.getByText(/quedarán sin\s+asignar/)).toBeVisible()
  await expect(dialogo.getByText(/sin notas\?/)).toBeVisible()
  await expect(dialogo.getByRole("button", { name: /^Eliminar solo/ })).toBeVisible()
  await captura(page, "02-unidad-pregunta-dos-acciones")

  await dialogo.getByRole("button", { name: /^Eliminar con sus/ }).click()
  await expect(dialogo).toHaveCount(0, { timeout: 30_000 })
  const estado = await page.evaluate(async () => (await fetch("/api/eval-col/planeador/actividades/612")).status)
  expect(estado).toBe(404)
  await captura(page, "03-unidad-eliminada-con-actividades")
})

test("la actividad con resultados trae Eliminar deshabilitado con el motivo de conservación de datos", async ({
  page,
}) => {
  await login(page, "/app/planeador/actividades")
  await page.evaluate(async () => {
    const router = (window as unknown as {
      __ceRouter: { navigate(o: { to: string; search: Record<string, string> }): Promise<void> }
    }).__ceRouter
    await router.navigate({ to: "/app/planeador/actividades", search: { actividad: "601" } })
  })

  const eliminar = page.getByRole("button", { name: `Eliminar Proyecto final: Diseño de prototipo 1: ${MENSAJE_ACTIVIDAD}` })
  await expect(eliminar.first()).toBeDisabled({ timeout: 60_000 })
  await eliminar.first().hover({ force: true })
  await captura(page, "04-actividad-eliminar-deshabilitado")
})
