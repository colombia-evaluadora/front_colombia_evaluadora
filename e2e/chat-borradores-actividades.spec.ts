import { expect, test, type Page } from "@playwright/test"

// Chat con MSW: borradores (guardar, retomar, enviar), bandeja Enviados por
// tipo, participación en encuesta y elección (votar y ver resultados al cierre).
test.setTimeout(120_000)
const CHAT = "/app/comunicaciones/chat"

async function login(page: Page, email: string) {
  await page.goto(`/login?redirectTo=${encodeURIComponent(CHAT)}`)
  await page.getByLabel("Correo electrónico").fill(email)
  await page.getByLabel("Contraseña", { exact: true }).fill("password")
  const compartido = page.getByRole("checkbox", { name: "Este es un equipo compartido" })
  if ((await compartido.isChecked()) && (await compartido.isEnabled())) await compartido.click()
  await page.getByRole("button", { name: "Ingresar" }).click()
  await page.waitForURL((url) => url.pathname.startsWith("/app/"))
  await page.waitForURL((url) => url.pathname === CHAT)
  await page.getByRole("navigation", { name: "Conversaciones" }).waitFor()
}

const canal = (page: Page, nombre: string) =>
  page.getByRole("navigation", { name: "Conversaciones" }).getByRole("button", { name: new RegExp(`^${nombre}`) }).first()

test("borrador: se guarda al salir, se retoma, se envía y aparece en Enviados", async ({ page }) => {
  await login(page, "user@example.com")
  await canal(page, "02-docentes-general").click()
  const editor = page.getByRole("combobox", { name: /^Mensaje para/ })
  await editor.fill("Recordatorio de la reunión del viernes")
  await canal(page, "03-planeacion-clases").click()

  await page.getByRole("button", { name: /Borradores y enviados/ }).click()
  const fila = page.getByRole("article").filter({ hasText: "Recordatorio de la reunión del viernes" })
  await expect(fila).toBeVisible()
  await expect(fila.getByText("Borrador")).toBeVisible()

  await fila.getByRole("button", { name: "Editar" }).click()
  await expect(page.getByRole("combobox", { name: /^Mensaje para/ })).toHaveValue("Recordatorio de la reunión del viernes")
  await page.getByRole("combobox", { name: /^Mensaje para/ }).press("Enter")
  await expect(page.getByText("Recordatorio de la reunión del viernes").first()).toBeVisible()

  await page.getByRole("button", { name: /Borradores y enviados/ }).click()
  await page.getByRole("tab", { name: /Enviados/ }).click()
  await page.getByRole("group", { name: "Filtrar enviados por tipo" }).getByRole("button", { name: "Canales", exact: true }).click()
  await expect(page.getByText("Recordatorio de la reunión del viernes")).toBeVisible()
  await page.getByRole("group", { name: "Filtrar enviados por tipo" }).getByRole("button", { name: "Directos", exact: true }).click()
  await expect(page.getByText("Recordatorio de la reunión del viernes")).toHaveCount(0)
})

test("encuesta: quien fue asignado la responde una vez", async ({ page }) => {
  await login(page, "user@example.com")
  await canal(page, "Encuesta Satisfacción").click()
  const form = page.getByRole("form", { name: /Preguntas de/ })
  await expect(form).toBeVisible()
  await form.getByRole("radio").first().click()
  await form.getByRole("button", { name: "Enviar" }).click()
  await page.getByRole("alertdialog").getByRole("button", { name: "Enviar" }).click()
  await expect(page.getByText("¡Gracias por responder!")).toBeVisible()
})

test("elección: el votante vota y, al cerrarse, todos ven los resultados", async ({ page }) => {
  await login(page, "estudiante@example.com")
  await canal(page, "Elección Personero 2026").click()
  await page.getByRole("button", { name: /^Votar por / }).first().click()
  await page.getByRole("button", { name: "Confirmar voto" }).click()
  await expect(page.getByText("¡Tu voto ha sido registrado con éxito!")).toBeVisible()

})

test("elección: al cerrarla, se ven los resultados finales", async ({ page }) => {
  await login(page, "admin@example.com")
  await canal(page, "Elección Personero 2026").click()
  await page.getByRole("button", { name: "Opciones de Elección Personero 2026" }).first().click()
  await page.getByRole("menuitem", { name: /Cerrar proceso electoral/ }).click()
  await page.getByRole("alertdialog").getByRole("button", { name: /Cerrar votación/ }).click()
  await expect(page.getByText(/Votación cerrada/).first()).toBeVisible()
  await expect(page.getByRole("meter").first()).toBeVisible()
})
