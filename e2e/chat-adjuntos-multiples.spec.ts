import { expect, test, type Page } from "@playwright/test"

// Chat con MSW: varios adjuntos por mensaje (elegir, quitar antes de enviar, enviar y quitar
// uno ya enviado) y el bloqueo de "Eliminar archivo" cuando otra persona ya lo descargó.
test.setTimeout(300_000)
const CHAT = "/app/comunicaciones/chat"

// El primer ingreso tras arrancar MSW a veces rebota al login: se espera al service worker y
// se reintenta una vez (como `chat-pantallas.spec.ts`). La primera carga del chat compila en Vite: espera larga.
async function login(page: Page, email: string) {
  await page.goto(`/login?redirectTo=${encodeURIComponent(CHAT)}`)
  await page.waitForFunction(() => !!navigator.serviceWorker?.controller, null, { timeout: 60_000 })
  for (let intento = 0; intento < 2; intento++) {
    if (!new URL(page.url()).pathname.startsWith("/login")) break
    await page.getByLabel("Correo electrónico").fill(email)
    await page.getByLabel("Contraseña", { exact: true }).fill("password")
    const compartido = page.getByRole("checkbox", { name: "Este es un equipo compartido" })
    if (
      (await compartido.count()) &&
      (await compartido.isChecked()) &&
      (await compartido.isEnabled())
    ) {
      await compartido.click()
    }
    await page.getByRole("button", { name: "Ingresar" }).click()
    await page.waitForURL((u) => u.pathname.startsWith("/app"), { timeout: 30_000 })
    await page.waitForTimeout(1_500)
  }
  if (!page.url().includes(CHAT)) await page.goto(CHAT)
  await page.getByRole("navigation", { name: "Conversaciones" }).waitFor({ timeout: 150_000 })
}

const archivo = (name: string, mimeType: string, kb = 4) => ({
  name,
  mimeType,
  buffer: Buffer.alloc(kb * 1024, 1),
})

test("varios adjuntos: se eligen, se quitan antes de enviar y se envían juntos", async ({
  page,
}) => {
  await login(page, "user@example.com")
  await page
    .getByRole("navigation", { name: "Conversaciones" })
    .getByRole("button", { name: /^02-docentes-general/ })
    .first()
    .click()

  // Mensaje propio de la semilla con dos archivos: el primero ya lo descargó otra persona.
  const descargado = page.getByRole("button", { name: "Eliminar planeación_fracciones_v2.docx" })
  await expect(descargado).toBeDisabled()
  await expect(
    page.getByText("Otra persona ya lo descargó: no se puede eliminar.").first(),
  ).toBeVisible()
  await expect(page.getByRole("button", { name: "Eliminar rubrica_fracciones.pdf" })).toBeEnabled()

  // Composer: varios a la vez, un ejecutable se rechaza con su nombre.
  const selector = page.locator('input[type="file"]').first()
  await selector.setInputFiles([
    archivo("guia.pdf", "application/pdf"),
    archivo("tareas.zip", "application/zip"),
    archivo("instalar.exe", "application/octet-stream"),
  ])
  const pendientes = page.getByRole("list", { name: /^Archivos para enviar/ })
  await expect(pendientes.getByRole("listitem")).toHaveCount(2)
  await expect(page.getByRole("alert").filter({ hasText: "instalar.exe" })).toContainText(
    "tipo de archivo",
  )
  await selector.setInputFiles([archivo("foto.png", "image/png")])
  await expect(pendientes.getByRole("listitem")).toHaveCount(3)
  await pendientes.getByRole("button", { name: "Quitar tareas.zip" }).click()
  await expect(pendientes.getByRole("listitem")).toHaveCount(2)

  const texto = `Material de la semana ${Date.now() % 100000}`
  await page.getByRole("combobox", { name: /^Mensaje para/ }).fill(texto)
  await page.getByRole("button", { name: "Enviar mensaje" }).click()
  await expect(pendientes).toHaveCount(0)

  const enviado = page.getByRole("article").filter({ hasText: texto })
  const lista = enviado.getByRole("list", { name: "2 archivos adjuntos" })
  await expect(lista).toBeVisible()
  await expect(lista.getByText("guia.pdf")).toBeVisible()
  await expect(lista.getByText("foto.png")).toBeVisible()

  // Quitar uno ya enviado: queda el aviso y el otro sigue. Antes se saca el foco del editor:
  // al perderlo se oculta la barra de formato y la lista se corre entre pointerdown y pointerup.
  await page.getByRole("combobox", { name: /^Mensaje para/ }).blur()
  await page.waitForTimeout(300)
  await lista.getByRole("button", { name: "Eliminar guia.pdf" }).click()
  await expect(lista.getByText("Archivo eliminado")).toBeVisible()
  await expect(lista.getByText("foto.png")).toBeVisible()
})
