import { expect, test, type Page } from "@playwright/test"

// Período sin escala de valoración (o escala sin niveles activos), contra el dev server con
// MSW (`playwright.config.ts`). El interruptor `mock:sin-escala` hace que la configuración
// traiga `variantes[].precarga: null` y `GET escala-precarga` la respuesta real sin escala
// (`fkTescala` null, `niveles: []`, `valorMaximo` 100 rellenado por el backend);
// `mock:escala-sin-niveles` vacía `GET unidades/:id/valoraciones`. El form no debe inventar
// valores: muestra el aviso y no deja guardar el instrumento. `CAPTURAS_DIR` guarda capturas.

test.describe.configure({ timeout: 240_000 })

const CAPTURAS = process.env.CAPTURAS_DIR
const AVISO = "Configure primero la escala de valoración del período."

async function captura(page: Page, nombre: string) {
  if (CAPTURAS) await page.screenshot({ path: `${CAPTURAS}/${nombre}.png`, fullPage: true })
}

async function login(page: Page, to: string) {
  await page.addInitScript(() => {
    localStorage.setItem("mock:sin-escala", "1")
    localStorage.setItem("mock:escala-sin-niveles", "1")
  })
  await page.goto(`/login?redirectTo=${encodeURIComponent(to)}`)
  await page.getByLabel("Correo electrónico").fill("docente@example.com")
  await page.getByLabel("Contraseña", { exact: true }).fill("password")
  await page.getByRole("button", { name: "Ingresar" }).click()
  await page.waitForURL((url) => url.pathname.startsWith("/app/"), { timeout: 60_000 })
  await page.goto(to)
}

test("actividad: sin escala avisa, no precarga valores y no deja guardar", async ({ page }) => {
  await login(page, "/app/planeador/actividades/612/editar")
  const seccion = page.getByText("Definición Escala de Valoración")
  await expect(seccion).toBeVisible({ timeout: 60_000 })
  const aviso = page.getByTestId("sin-escala-aviso")
  await expect(aviso).toContainText(AVISO)
  await expect(page.getByRole("button", { name: "Agregar más" })).toBeDisabled()
  await expect(page.getByRole("button", { name: "Restaurar valores de la institución" })).toBeDisabled()
  // Cambiar a Cualitativa no inventa niveles (antes: Bajo/Básico/Alto/Superior).
  await page.getByText("Cualitativa", { exact: true }).click()
  await expect(page.getByTestId("escala-nivel").getByLabel("Etiqueta").first()).toHaveValue("")
  await aviso.scrollIntoViewIfNeeded()
  await captura(page, "despues-actividad-escala")

  await page.getByRole("button", { name: "Guardar", exact: true }).click()
  await expect(page.getByText(AVISO).first()).toBeVisible()
  await expect(page).toHaveURL(/\/actividades\/612\/editar/)
})

test("unidad: sin niveles en la escala avisa y no deja agregar criterios", async ({ page }) => {
  await login(page, "/app/planeador/unidades?unidad=1")
  await page.getByLabel("Detalle de la unidad temática").getByRole("tab", { name: /Rúbricas/ }).click({ timeout: 60_000 })
  await expect(page.getByTestId("sin-escala-aviso")).toBeVisible({ timeout: 60_000 })
  await expect(page.getByRole("button", { name: "Agregar criterio" })).toBeDisabled()
  await captura(page, "despues-unidad-criterios")
})
