import { expect, test } from "@playwright/test"

// Regla de preescolar (referente FORMATIVO): al editar una actividad no aparece el bloque de
// Evaluación (instrumento, "¿Es sumativa?", peso, puntaje); en su lugar va el Bloque 5
// alternativo "Seguimiento formativo · Registro narrativo" y las Adaptaciones (PIAR) siguen
// visibles. Contra el dev server con MSW (`playwright.config.ts`): la unidad 3 del seed es
// formativa y la actividad 607 cuelga de ella; la 602 es de una unidad evaluativa.

test.describe.configure({ timeout: 240_000 })

async function login(page: import("@playwright/test").Page, to: string) {
  await page.goto(`/login?redirectTo=${encodeURIComponent(to)}`)
  await page.getByLabel("Correo electrónico").fill("docente@example.com")
  await page.getByLabel("Contraseña", { exact: true }).fill("password")
  await page.getByRole("button", { name: "Ingresar" }).click()
  await page.waitForURL((url) => url.pathname.startsWith("/app/"))
}

test("actividad formativa: Bloque 5 alternativo, sin evaluación y con adaptaciones", async ({ page }) => {
  await login(page, "/app/planeador/actividades/607/editar")
  await page.waitForURL((url) => url.pathname === "/app/planeador/actividades/607/editar", { timeout: 60_000 })

  await expect(page.getByTestId("seguimiento-formativo")).toBeVisible({ timeout: 60_000 })
  await expect(page.getByText("Observación pedagógica")).toBeVisible()
  await expect(page.getByText("Momento del registro")).toBeVisible()
  await expect(page.getByText("Evidencia asociada")).toBeVisible()
  await expect(page.getByRole("heading", { name: "Evaluación", exact: true })).toHaveCount(0)
  await expect(page.getByText("Instrumento de evaluación")).toHaveCount(0)
  await expect(page.getByRole("heading", { name: /Adaptaciones/ })).toBeVisible()
})

test("actividad evaluativa: muestra Evaluación y no el bloque formativo", async ({ page }) => {
  await login(page, "/app/planeador/actividades/602/editar")
  await page.waitForURL((url) => url.pathname === "/app/planeador/actividades/602/editar", { timeout: 60_000 })

  await expect(page.getByRole("heading", { name: "Evaluación", exact: true })).toBeVisible({ timeout: 60_000 })
  await expect(page.getByTestId("seguimiento-formativo")).toHaveCount(0)
})
