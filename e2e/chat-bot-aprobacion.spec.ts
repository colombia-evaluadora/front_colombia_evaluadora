import { expect, test, type Page } from "@playwright/test"

// Flujo de aprobación de notas desde Colevabot contra el Figma (Planeador Dashboard, página
// "CE ETC Establecimiento Educativo"): tarjeta 400:47428 / 400:50020, confirmaciones 400:43856 /
// 400:44915 y tarjetas resueltas 400:47651 / 400:47937. Con `CHAT_CAPTURAS=<dir>` guarda capturas.
test.setTimeout(150_000)
test.use({ viewport: { width: 1280, height: 832 } })
const CHAT = "/app/comunicaciones/chat"
const CAPTURAS = process.env.CHAT_CAPTURAS

async function captura(page: Page, nombre: string) {
  if (CAPTURAS) await page.screenshot({ path: `${CAPTURAS}/${nombre}.png` })
}

async function abrirColevabot(page: Page) {
  // El primer arranque del dev server (SW + MSW en frío) a veces devuelve al login: un reintento.
  for (let vuelta = 0; vuelta < 2; vuelta++) {
    await iniciarSesion(page)
    if (!new URL(page.url()).pathname.startsWith("/login")) break
  }
  const lista = page.getByRole("navigation", { name: "Conversaciones" })
  await lista.waitFor({ timeout: 30_000 })
  await lista.getByRole("button", { name: /^Colevabot/ }).and(page.locator(":not([aria-haspopup])")).first().click()
  const tarjeta = page.getByRole("article", { name: "Solicitud de aprobación de cambios en calificaciones" }).last()
  await expect(tarjeta).toBeVisible()
  return tarjeta
}

async function iniciarSesion(page: Page) {
  await page.goto(`/login?redirectTo=${encodeURIComponent(CHAT)}`)
  await page.waitForFunction(() => !!navigator.serviceWorker?.controller, null, { timeout: 60_000 })
  for (let intento = 0; intento < 3; intento++) {
    if (!new URL(page.url()).pathname.startsWith("/login")) break
    await page.getByLabel("Correo electrónico").fill("admin@example.com")
    await page.getByLabel("Contraseña", { exact: true }).fill("password")
    const compartido = page.getByRole("checkbox", { name: "Este es un equipo compartido" })
    if ((await compartido.count()) && (await compartido.isChecked()) && (await compartido.isEnabled())) {
      await compartido.click()
    }
    await page.getByRole("button", { name: "Ingresar" }).click()
    await page.waitForURL((u) => u.pathname.startsWith("/app"), { timeout: 60_000 })
    await page.waitForTimeout(1_500)
  }
  if (!page.url().includes(CHAT)) await page.goto(CHAT)
  await page.waitForTimeout(2_000)
}

test("tarjeta del aprobador: campos, fecha/hora, Ir a planilla y aprobar con confirmación", async ({ page }) => {
  const tarjeta = await abrirColevabot(page)
  for (const texto of [
    "NUEVA SOLICITUD DE APROBACIÓN",
    "Docente:",
    "Curso:",
    "Periodo:",
    "Cambios realizados:",
    "Motivo:",
    "Corrección de errores al registrar notas",
  ]) {
    await expect(tarjeta).toContainText(texto)
  }
  await expect(tarjeta.locator("time").nth(1)).toHaveText(/\d{2}\/\d{2}\/\d{4}/)
  await expect(tarjeta.getByRole("button", { name: "Ir a planilla" })).toBeVisible()
  await tarjeta.scrollIntoViewIfNeeded()
  await captura(page, "app-400-47428-tarjeta-aprobador")

  await tarjeta.getByRole("button", { name: "Aprobar y actualizar consolidado" }).click()
  const dialogo = page.getByRole("alertdialog")
  await expect(dialogo.getByRole("heading", { name: "¿Aprobar los cambios propuestos?" })).toBeVisible()
  await expect(dialogo).toContainText("Se aplicarán 2 modificaciones en 2 estudiantes.")
  await expect(dialogo).toContainText("Esta acción actualizará las notas oficiales.")
  await page.waitForTimeout(400)
  await captura(page, "app-400-43856-confirmar-aprobar")
  await dialogo.getByRole("button", { name: "Sí" }).click()
  await expect(dialogo).toHaveCount(0)
  await expect(tarjeta).toContainText("Ya no hay cambios pendientes por aprobar.")
})

test("rechazar: confirmación con motivo obligatorio", async ({ page }) => {
  const tarjeta = await abrirColevabot(page)
  await tarjeta.getByRole("button", { name: "Rechazar" }).click()
  const dialogo = page.getByRole("alertdialog")
  await expect(dialogo.getByRole("heading", { name: "¿Rechazar los cambios propuestos?" })).toBeVisible()
  const si = dialogo.getByRole("button", { name: "Sí" })
  await expect(si).toBeDisabled()
  await dialogo.getByLabel("Motivo").fill("Las notas ya estaban bien")
  await page.waitForTimeout(400)
  await captura(page, "app-400-44915-confirmar-rechazar")
  await si.click()
  await expect(dialogo).toHaveCount(0)
  await expect(tarjeta).toContainText("Ya no hay cambios pendientes por aprobar.")
})

test("tarjetas del docente: aprobada en verde y rechazada en rojo", async ({ page }) => {
  await abrirColevabot(page)
  const aprobada = page.getByRole("article").filter({ hasText: "SOLICITUD #124 APROBADA" })
  const rechazada = page.getByRole("article").filter({ hasText: "SOLICITUD #123 RECHAZADA" })
  await expect(aprobada).toContainText("han sido aplicados exitosamente")
  await expect(rechazada).toContainText("Motivo del rechazo:")
  await aprobada.scrollIntoViewIfNeeded()
  await captura(page, "app-400-47651-47937-tarjetas-docente")
})
