import { expect, test, type Page } from "@playwright/test"

// Estado de disponibilidad del chat sobre MSW: selector del propio estado (En línea, Ausente,
// Ocupado, Invisible) y "Configurar disponibilidad" (respuesta automática y quién ve el estado).
// La lógica del servidor (Ausente automático, filtro por perfil, Ocupado sin push) se prueba en
// comms-service y contra testv2.
test.setTimeout(180_000)
test.describe.configure({ retries: 2 })
const CHAT = "/app/comunicaciones/chat"

async function login(page: Page, email: string) {
  await page.goto(`/login?redirectTo=${encodeURIComponent(CHAT)}`)
  await page.waitForFunction(() => !!navigator.serviceWorker?.controller, null, { timeout: 60_000 })
  await page.getByLabel("Correo electrónico").fill(email)
  await page.getByLabel("Contraseña", { exact: true }).fill("password")
  const compartido = page.getByRole("checkbox", { name: "Este es un equipo compartido" })
  if ((await compartido.count()) && (await compartido.isChecked()) && (await compartido.isEnabled())) {
    await compartido.click()
  }
  await page.getByRole("button", { name: "Ingresar" }).click()
  await page.waitForURL((u) => u.pathname.startsWith("/app"), { timeout: 30_000 })
  if (!page.url().includes(CHAT)) {
    const link = page.locator(`a[href="${CHAT}"]`).first()
    if (!(await link.isVisible().catch(() => false))) {
      await page.getByRole("button", { name: "Gestión comunicaciones" }).click()
    }
    await link.click()
  }
  await page.getByRole("navigation", { name: "Conversaciones" }).waitFor({ timeout: 30_000 })
}

test("cambia el propio estado y configura la disponibilidad", async ({ page }) => {
  await login(page, "docente@example.com")

  const selector = page.getByRole("button", { name: /Tu estado: En línea/ })
  await expect(selector).toBeVisible()

  await selector.click()
  await page.getByRole("menuitemradio", { name: /Ocupado/ }).click()
  await expect(page.getByText("Tu estado ahora es Ocupado.")).toBeVisible()
  await expect(page.getByRole("button", { name: /Tu estado: Ocupado/ })).toBeVisible()

  await page.getByRole("button", { name: /Tu estado: Ocupado/ }).click()
  await page.getByRole("menuitem", { name: "Configurar disponibilidad" }).click()
  const dialogo = page.getByRole("dialog", { name: "Configurar disponibilidad" })
  await dialogo.getByLabel("Respuesta automática (Ausente)").fill("Estoy en clase, respondo a las 2:00 p. m.")
  await dialogo.getByRole("checkbox", { name: "Estudiantes" }).click()
  await dialogo.getByRole("button", { name: "Guardar" }).click()
  await expect(page.getByText("Disponibilidad guardada.")).toBeVisible()
  await expect(dialogo).toBeHidden()

  // Lo guardado vuelve al reabrir.
  await page.getByRole("button", { name: /Tu estado: Ocupado/ }).click()
  await page.getByRole("menuitem", { name: "Configurar disponibilidad" }).click()
  await expect(dialogo.getByLabel("Respuesta automática (Ausente)")).toHaveValue(
    "Estoy en clase, respondo a las 2:00 p. m.",
  )
  await expect(dialogo.getByRole("checkbox", { name: "Estudiantes" })).not.toBeChecked()
  await expect(dialogo.getByRole("checkbox", { name: "Docentes" })).toBeChecked()
  await dialogo.getByRole("button", { name: "Cancelar" }).click()

  // Invisible: el selector lo muestra; para los demás se ve desconectado (servidor).
  await page.getByRole("button", { name: /Tu estado: Ocupado/ }).click()
  await page.getByRole("menuitemradio", { name: /Invisible/ }).click()
  await expect(page.getByRole("button", { name: /Tu estado: Invisible/ })).toBeVisible()
})
