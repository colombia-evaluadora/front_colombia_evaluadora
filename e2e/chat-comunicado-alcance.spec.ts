import { expect, test, type Page } from "@playwright/test"

// Comunicados con permiso dinámico (menú COMUNICADOS por rol) y destinatarios dentro del alcance
// (MSW, mismo contrato que comms-service): el docente sin el permiso no ve "Comunicado"; el
// coordinador solo ve los grupos de su jornada y acota por jornada.
test.setTimeout(180_000)
test.use({ viewport: { width: 1280, height: 900 } })
const CHAT = "/app/comunicaciones/chat"

async function login(page: Page, email: string) {
  await page.goto(`/login?redirectTo=${encodeURIComponent(CHAT)}`)
  await page.waitForFunction(() => !!navigator.serviceWorker?.controller, null, { timeout: 60_000 })
  for (let intento = 0; intento < 4; intento++) {
    if (!new URL(page.url()).pathname.startsWith("/login")) break
    await page.getByLabel("Correo electrónico").fill(email)
    await page.getByLabel("Contraseña", { exact: true }).fill("password")
    const compartido = page.getByRole("checkbox", { name: "Este es un equipo compartido" })
    if ((await compartido.count()) && (await compartido.isChecked()) && (await compartido.isEnabled())) {
      await compartido.click()
    }
    await page.getByRole("button", { name: "Ingresar" }).click()
    await page.waitForURL((u) => u.pathname.startsWith("/app"), { timeout: 30_000 })
    await page.waitForTimeout(1_500)
  }
  if (!page.url().includes(CHAT)) await page.goto(CHAT)
  await page.getByRole("navigation", { name: "Conversaciones" }).waitFor({ timeout: 30_000 })
}

const lista = (page: Page) => page.getByRole("navigation", { name: "Conversaciones" })

test("docente sin el permiso COMUNICADOS: no se le ofrece crear comunicados", async ({ page }) => {
  await login(page, "docente@example.com")
  await lista(page).getByRole("button", { name: "Agregar foro" }).click()
  await expect(page.getByRole("menuitem", { name: "Encuesta" })).toBeVisible()
  await expect(page.getByRole("menuitem", { name: "Comunicado" })).toHaveCount(0)
})

test("coordinador: solo su jornada y acotar por jornada", async ({ page }) => {
  await login(page, "coordinador@example.com")
  await lista(page).getByRole("button", { name: "Agregar foro" }).click()
  await page.getByRole("menuitem", { name: "Comunicado" }).click()
  const d = page.getByRole("dialog")
  await d.getByLabel("Título del comunicado").fill("Reunión de la jornada")

  // Sus grupos (jornada Mañana): 601 y 602, nunca el 701 de la Tarde.
  await d.getByRole("button", { name: /Enviar también a personas/ }).click()
  await d.getByRole("combobox", { name: "Grupos académicos" }).click()
  await expect(page.getByRole("option", { name: /Sexto 601/ })).toBeVisible()
  await expect(page.getByRole("option", { name: /Séptimo 701/ })).toHaveCount(0)
  await page.getByRole("option", { name: /Sexto 601/ }).click()
  await page.keyboard.press("Escape")

  // Acotar por jornada limpia lo elegido por grado o grupo y deja solo los de esa jornada.
  await d.getByRole("combobox", { name: "Jornada" }).click()
  await page.getByRole("option", { name: "Mañana" }).click()
  await expect(d.getByRole("combobox", { name: "Jornada" })).toContainText("Mañana")
  await d.getByRole("combobox", { name: "Audiencia" }).click()
  await page.getByRole("option", { name: /Estudiantes/ }).click()
  await page.keyboard.press("Escape")
  await d.getByRole("button", { name: "Siguiente", exact: true }).click()
  await d.getByRole("textbox", { name: /Contenido del comunicado/ }).fill("Nos vemos el lunes.")
  await d.getByRole("button", { name: "Crear" }).click()
  await expect(d).toHaveCount(0, { timeout: 15_000 })
  const articulo = page.getByRole("article", { name: "Reunión de la jornada" })
  await expect(articulo.getByText("Estudiantes, solo en jornada Mañana")).toBeVisible()
})
