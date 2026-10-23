import { expect, test, type Page } from "@playwright/test"

// Bugs del chat reportados en QA (MSW): "Activar notificaciones" según el silencio real, el
// archivo subido aparece en "Archivos" sin recargar y el label "Nombre" de "Crear un foro" no se
// recorta ni se monta sobre el input. Con `CHAT_CAPTURAS=<dir>` guarda capturas.
test.setTimeout(150_000)
test.use({ viewport: { width: 1280, height: 832 } })
const CHAT = "/app/comunicaciones/chat"
const CAPTURAS = process.env.CHAT_CAPTURAS

async function captura(page: Page, nombre: string) {
  if (CAPTURAS) await page.screenshot({ path: `${CAPTURAS}/${nombre}.png` })
}

async function login(page: Page) {
  await page.goto(`/login?redirectTo=${encodeURIComponent(CHAT)}`)
  await page.waitForFunction(() => !!navigator.serviceWorker?.controller, null, { timeout: 60_000 })
  for (let intento = 0; intento < 2; intento++) {
    if (!new URL(page.url()).pathname.startsWith("/login")) break
    await page.getByLabel("Correo electrónico").fill("admin@example.com")
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
const fila = (page: Page, nombre: string) =>
  lista(page).getByRole("button", { name: new RegExp(`^${nombre}`) }).and(page.locator(":not([aria-haspopup])")).first()

test("silenciar: el menú refleja el estado y ofrece Activar notificaciones", async ({ page }) => {
  const NOMBRE = "02-docentes-general"
  await login(page)
  await fila(page, NOMBRE).click()
  const opciones = page.getByRole("button", { name: `Opciones de ${NOMBRE}` }).last()

  await opciones.click()
  await expect(page.getByRole("menuitem", { name: /Activar notificaciones/ })).toHaveCount(0)
  await page.getByRole("menuitem", { name: "Silenciar notificaciones" }).click()
  await page.getByRole("menuitem", { name: "8 horas" }).click()
  await expect(page.getByText("Notificaciones silenciadas por 8 horas.")).toBeVisible()

  await opciones.click()
  const activar = page.getByRole("menuitem", { name: /Activar notificaciones/ })
  await expect(activar).toBeVisible()
  await expect(activar).not.toHaveAttribute("aria-disabled", "true")
  await expect(page.getByRole("menuitem", { name: "Cambiar silencio" })).toBeVisible()
  await captura(page, "app-menu-silenciado")

  // Activar notificaciones: se quita el silencio y el menú vuelve a "Silenciar notificaciones".
  await activar.click()
  await expect(page.getByText(`Notificaciones activadas en ${NOMBRE}.`)).toBeVisible()
  await expect(fila(page, NOMBRE).getByLabel("Silenciado")).toHaveCount(0)
  await opciones.click()
  await expect(page.getByRole("menuitem", { name: /Activar notificaciones/ })).toHaveCount(0)
  await expect(page.getByRole("menuitem", { name: "Silenciar notificaciones" })).toBeVisible()
  await captura(page, "app-menu-activado")
})

test("archivos: lo que se sube aparece en Archivos sin recargar", async ({ page }) => {
  await login(page)
  // Se carga "Archivos" primero para que su lista quede en caché.
  await lista(page).getByRole("button", { name: /^Archivos/ }).click()
  await expect(page.getByRole("heading", { level: 2, name: "Archivos" })).toBeVisible()
  await expect(page.getByText("informe-e2e.pdf")).toHaveCount(0)

  await fila(page, "02-docentes-general").click()
  await page.locator('input[type="file"]').first().setInputFiles({
    name: "informe-e2e.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.from("%PDF-1.4 e2e"),
  })
  await page.getByRole("combobox", { name: /^Mensaje para/ }).press("Enter")
  await expect(page.getByRole("log").getByText("informe-e2e.pdf")).toBeVisible()

  await lista(page).getByRole("button", { name: /^Archivos/ }).click()
  await expect(page.getByText("informe-e2e.pdf").first()).toBeVisible()
  await captura(page, "app-archivos-tras-subir")
})

test('crear un foro: el label "Nombre" queda completo sobre el borde', async ({ page }) => {
  await login(page)
  await lista(page).getByRole("button", { name: "Agregar foro" }).click()
  await page.getByRole("menuitem", { name: "Foro" }).click()
  const d = page.getByRole("dialog")
  await expect(d.getByRole("heading", { name: "Crear un foro" })).toBeVisible()
  const nombre = d.getByLabel("Nombre")
  await nombre.fill("04-velit-augue")
  await expect(nombre).toHaveValue("04-velit-augue")

  const label = await d.getByText("Nombre", { exact: true }).boundingBox()
  const input = await nombre.boundingBox()
  const form = await d.locator("form#crear-chat").boundingBox()
  // Completo dentro del área visible del form (no recortado por su overflow)…
  expect(label!.y).toBeGreaterThanOrEqual(form!.y)
  // …y montado sobre el borde superior, por encima de la línea del texto del input.
  expect(label!.y).toBeLessThan(input!.y)
  expect(label!.y + label!.height).toBeLessThanOrEqual(input!.y + input!.height / 2)
  await captura(page, "app-crear-foro-label")
})
