import { expect, test, type Page } from "@playwright/test"

// HU "Enviar / Recibir mensajes institucionales" (MSW): destinatarios combinables (rol + personas),
// adjuntos con las reglas del chat (.exe bloqueado), marca de importante, respuestas permitidas por
// el emisor y registro de recepción por destinatario.
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

test("comunicado: destinatarios, adjuntos, importante, respuestas y recepción", async ({ page }) => {
  await login(page, "admin@example.com")
  await lista(page).getByRole("button", { name: "Agregar foro" }).click()
  await page.getByRole("menuitem", { name: "Comunicado" }).click()
  const d = page.getByRole("dialog")

  await d.getByLabel("Título del comunicado").fill("Simulacro de evacuación")
  // Sin ningún destinatario no avanza.
  await d.getByRole("button", { name: "Siguiente", exact: true }).click()
  await expect(d.getByText("Elige al menos un destinatario.")).toBeVisible()

  // Rol + una persona puntual (combinables).
  await d.getByRole("combobox", { name: "Audiencia" }).click()
  await page.getByRole("option", { name: /Docentes/ }).click()
  await page.keyboard.press("Escape")
  await d.getByRole("button", { name: /Enviar también a personas/ }).click()
  await d.getByRole("combobox", { name: "Buscar personas" }).click()
  await page.getByRole("option").first().click()
  await page.keyboard.press("Escape")
  await d.getByRole("checkbox", { name: "Marcar como importante" }).click()
  await d.getByRole("checkbox", { name: "Permitir respuestas" }).click()
  await d.getByRole("button", { name: "Siguiente", exact: true }).click()

  await d.getByRole("textbox", { name: /Contenido del comunicado/ }).fill("Mañana a las 9:00 a. m. hay simulacro.")
  const archivos = d.locator('input[type="file"]')
  // Un ejecutable no pasa (mismas reglas que los adjuntos del chat).
  await archivos.setInputFiles({ name: "instalar.exe", mimeType: "application/octet-stream", buffer: Buffer.from("MZ") })
  await expect(d.getByRole("alert").filter({ hasText: "instalar.exe" })).toBeVisible()
  await archivos.setInputFiles({ name: "circular.pdf", mimeType: "application/pdf", buffer: Buffer.from("%PDF-1.4\n") })
  await expect(d.getByText("circular.pdf")).toBeVisible()
  await d.getByRole("button", { name: "Crear" }).click()
  await expect(d).toHaveCount(0, { timeout: 15_000 })

  // Panel: importante, destinatarios, adjunto y conversación de respuestas.
  const articulo = page.getByRole("article", { name: "Simulacro de evacuación" })
  await expect(articulo).toBeVisible()
  await expect(articulo.getByText("Importante")).toBeVisible()
  await expect(articulo.getByText(/Dirigido a: Docentes, /)).toBeVisible()
  await expect(articulo.getByText("circular.pdf")).toBeVisible()
  await expect(articulo.getByText("Puedes responder a este comunicado en la conversación.")).toBeVisible()
  await expect(page.getByRole("combobox", { name: "Mensaje para #Simulacro de evacuación" })).toBeVisible()
  // En la lista, la marca de importante.
  await expect(
    lista(page).getByRole("button", { name: /Simulacro de evacuación/ }).getByRole("img", { name: "Importante" }),
  ).toBeVisible()

  // Registro de recepción (emisor).
  await articulo.getByRole("button", { name: /0 de / }).click()
  const registro = page.getByRole("dialog", { name: "Registro de recepción" })
  await expect(registro.getByRole("list", { name: "Destinatarios" }).getByRole("listitem").first()).toBeVisible()
  await expect(registro.getByText("No leído").first()).toBeVisible()
  if (process.env.CHAT_CAPTURAS) await page.screenshot({ path: `${process.env.CHAT_CAPTURAS}/comunicado-recepcion.png` })
  await page.keyboard.press("Escape")

  // Editar ya publicado: se apagan las respuestas y se quita el adjunto.
  await page.getByRole("button", { name: "Opciones de Simulacro de evacuación" }).last().click()
  await page.getByRole("menuitem", { name: "Editar comunicado" }).click()
  const e = page.getByRole("dialog")
  await expect(e.getByText(/Docentes, /)).toBeVisible()
  await e.getByRole("checkbox", { name: "Permitir respuestas" }).click()
  await e.getByRole("button", { name: "Siguiente", exact: true }).click()
  await e.getByRole("button", { name: "Quitar circular.pdf" }).click()
  await e.getByRole("button", { name: "Guardar" }).click()
  await expect(e).toHaveCount(0, { timeout: 15_000 })
  const editado = page.getByRole("article", { name: "Simulacro de evacuación" })
  await expect(editado.getByText("Los comentarios están deshabilitados.")).toBeVisible()
  await expect(editado.getByText("circular.pdf")).toHaveCount(0)
})
