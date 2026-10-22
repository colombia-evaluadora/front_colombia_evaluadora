import { expect, test, type Page } from "@playwright/test"

// Chat con MSW: mensaje programado (programar → Programados → el job lo envía una sola vez →
// Enviados) y borrador de una actividad (autoguardado → retomar → publicar lo elimina).
test.setTimeout(150_000)
const CHAT = "/app/comunicaciones/chat"

async function login(page: Page, email: string) {
  await page.goto(`/login?redirectTo=${encodeURIComponent(CHAT)}`)
  await page.getByLabel("Correo electrónico").fill(email)
  await page.getByLabel("Contraseña", { exact: true }).fill("password")
  const compartido = page.getByRole("checkbox", { name: "Este es un equipo compartido" })
  if ((await compartido.isChecked()) && (await compartido.isEnabled())) await compartido.click()
  await page.getByRole("button", { name: "Ingresar" }).click()
  await page.waitForURL((url) => url.pathname === CHAT)
  await page.getByRole("navigation", { name: "Conversaciones" }).waitFor()
}

const lista = (page: Page) => page.getByRole("navigation", { name: "Conversaciones" })
const canal = (page: Page, nombre: string) =>
  lista(page)
    .getByRole("button", { name: new RegExp(`^${nombre}`) })
    .first()

test("programado: se programa, aparece en Programados y el job lo envía una sola vez", async ({
  page,
}) => {
  const texto = `Recordatorio programado ${Date.now()}`
  await login(page, "user@example.com")
  await canal(page, "02-docentes-general").click()
  const editor = page.getByRole("combobox", { name: /^Mensaje para/ })
  await editor.fill(texto)
  await page.getByRole("button", { name: "Programar envío" }).click()

  const dialogo = page.getByRole("dialog", { name: "Programar envío" })
  await expect(dialogo.getByText("Hora de Colombia.")).toBeVisible()
  // La sugerencia es la próxima media hora (al menos 5 minutos adelante).
  await dialogo.getByRole("button", { name: "Programar" }).click()
  await expect(dialogo).toHaveCount(0)
  await expect(page.getByText(/Mensaje programado para el/)).toBeVisible()
  await expect(editor).toHaveValue("")

  await page.getByRole("button", { name: /Borradores y enviados/ }).click()
  await page.getByRole("tab", { name: /Programados/ }).click()
  const fila = page.getByRole("article").filter({ hasText: texto })
  await expect(fila).toBeVisible()
  await expect(fila.getByText(/Se envía el/)).toBeVisible()

  // Llega la hora: el "job" del mock lo envía; correrlo otra vez no lo duplica.
  const enviados = await page.evaluate(() =>
    (
      window as unknown as { __programadosMock: { adelantar: (ms: number) => number } }
    ).__programadosMock.adelantar(60 * 60 * 1000),
  )
  expect(enviados).toBeGreaterThanOrEqual(1)
  expect(
    await page.evaluate(() =>
      (
        window as unknown as { __programadosMock: { adelantar: (ms: number) => number } }
      ).__programadosMock.adelantar(60 * 60 * 1000),
    ),
  ).toBe(0)
  await expect(fila).toHaveCount(0)

  await page.getByRole("tab", { name: /Enviados/ }).click()
  await expect(page.getByText(texto)).toHaveCount(1)

  await canal(page, "02-docentes-general").click()
  await expect(page.getByRole("main").getByText(texto)).toHaveCount(1)
})

test("borrador de actividad: se autoguarda, se retoma y publicarlo lo elimina", async ({
  page,
}) => {
  const titulo = `Reunión borrador ${Date.now() % 100000}`
  await login(page, "admin@example.com")
  await lista(page).getByRole("button", { name: "Agregar foro" }).click()
  await page.getByRole("menuitem", { name: "Comunicado" }).click()
  const d = page.getByRole("dialog")
  await d.getByLabel("Título del comunicado").fill(titulo)
  await expect(d.getByText("Borrador guardado")).toBeVisible({ timeout: 10_000 })
  // Cerrar no pierde nada: queda en Borradores y enviados.
  await page.keyboard.press("Escape")
  await expect(d).toHaveCount(0)
  await expect(page.getByText(/quedó guardado en Borradores y enviados/)).toBeVisible()

  await page.getByRole("button", { name: /Borradores y enviados/ }).click()
  const actividades = page.getByRole("region", { name: "Actividades" })
  const tarjeta = actividades.getByRole("article").filter({ hasText: titulo })
  await expect(tarjeta).toBeVisible()
  await expect(tarjeta.getByText("Comunicado")).toBeVisible()
  await tarjeta.getByRole("button", { name: `Retomar ${titulo}` }).click()

  await expect(d.getByLabel("Título del comunicado")).toHaveValue(titulo)
  await d.getByRole("combobox", { name: "Audiencia" }).click()
  await page.getByRole("option", { name: /Padres/ }).click()
  await page.keyboard.press("Escape")
  await d.getByRole("button", { name: "Siguiente", exact: true }).click()
  await d
    .getByRole("textbox", { name: /Contenido del comunicado/ })
    .fill("Los esperamos el viernes.")
  await d.getByRole("button", { name: "Crear" }).click()
  await expect(page.getByRole("heading", { level: 2, name: titulo })).toBeVisible()

  // Publicado desde el borrador: ya no está en Borradores.
  await page.getByRole("button", { name: /Borradores y enviados/ }).click()
  await expect(page.getByRole("article").filter({ hasText: titulo })).toHaveCount(0)
})
