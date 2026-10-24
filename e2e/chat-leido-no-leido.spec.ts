import { expect, test, type Page } from "@playwright/test"

// Leído / no leído de una conversación sobre MSW (reporte de la PO en testv2):
// - abrir la conversación deja leído también su aviso de mensajes en la campana;
// - "Marcar como no leído" desde el encabezado (conversación abierta) y desde la fila la deja con
//   contador en la lista; abrirla de nuevo lo limpia.
// Misma pestaña y navegación SPA (la DB del mock vive en memoria; un `goto` la reiniciaría).

const CHAT = "/app/comunicaciones/chat"
const GRUPO = "Leido e2e"
// Con `CHAT_CAPTURAS=<dir>` guarda capturas de cada paso.
const captura = async (page: Page, nombre: string) => {
  if (process.env.CHAT_CAPTURAS) await page.screenshot({ path: `${process.env.CHAT_CAPTURAS}/${nombre}.png` })
}

async function ingresar(page: Page, email: string) {
  // El primer ingreso tras arrancar MSW a veces rebota al login: se reintenta.
  for (let intento = 0; intento < 3; intento++) {
    if (!new URL(page.url()).pathname.startsWith("/login")) {
      if (await lista(page).isVisible().catch(() => false)) break
      await page.waitForTimeout(3_000)
      if (!new URL(page.url()).pathname.startsWith("/login")) break
    }
    await page.getByLabel("Correo electrónico").fill(email)
    await page.getByLabel("Contraseña", { exact: true }).fill("password")
    const compartido = page.getByRole("checkbox", { name: "Este es un equipo compartido" })
    if ((await compartido.count()) && (await compartido.isChecked()) && (await compartido.isEnabled())) {
      await compartido.click()
    }
    await page.getByRole("button", { name: "Ingresar" }).click()
    await page.waitForURL((u) => u.pathname.startsWith("/app"), { timeout: 30_000 }).catch(() => undefined)
    await page.waitForTimeout(3_000)
  }
  if (!page.url().includes(CHAT)) {
    const link = page.locator(`a[href="${CHAT}"]`).first()
    if (!(await link.isVisible().catch(() => false))) await page.getByRole("button", { name: "Gestión comunicaciones" }).click()
    await link.click()
  }
  await expect(page.getByRole("heading", { name: "Chat" })).toBeVisible({ timeout: 30_000 })
}

async function salirDeSesion(page: Page) {
  await page.getByRole("button", { name: "Cuenta de usuario" }).click()
  await page.getByRole("menuitem", { name: "Cerrar sesión" }).click()
  await page.waitForURL((u) => u.pathname === "/login")
}

const lista = (page: Page) => page.getByRole("navigation", { name: "Conversaciones" })
const fila = (page: Page) => lista(page).locator("li").filter({ hasText: GRUPO }).first()
const campana = (page: Page) => page.getByRole("button", { name: /^Notificaciones/ })

/** El aviso "Nuevos mensajes en <grupo>" de la campana sigue sin leer. */
async function avisoSinLeer(page: Page) {
  await campana(page).click()
  const item = page.getByRole("button").filter({ hasText: `Nuevos mensajes en ${GRUPO}` }).first()
  await expect(item).toBeVisible()
  const pendiente = await item.filter({ hasText: "Sin leer" }).count()
  await page.keyboard.press("Escape")
  return pendiente > 0
}

test("abrir deja leído el aviso; marcar como no leído desde el encabezado y la fila", async ({ page }) => {
  test.setTimeout(180_000)
  await page.goto(`/login?redirectTo=${encodeURIComponent(CHAT)}`)
  await page.waitForFunction(() => !!navigator.serviceWorker?.controller, null, { timeout: 60_000 })

  await ingresar(page, "admin@example.com")
  await page.getByRole("button", { name: "Crear grupo" }).click()
  await page.getByPlaceholder("Por ejemplo, Proyecto feria de ciencias").fill(GRUPO)
  await page.getByRole("button", { name: "Siguiente" }).click()
  await page.getByRole("combobox", { name: "Buscar personas" }).fill("Darlene")
  await page.getByRole("option", { name: /Darlene Robertson/ }).click()
  await page.getByRole("button", { name: "Agregar" }).click()
  await expect(page.getByRole("heading", { level: 2, name: GRUPO })).toBeVisible()
  await page.getByRole("combobox", { name: /^Mensaje para/ }).fill("Mensaje para leer")
  await page.keyboard.press("Enter")
  await expect(page.getByText("Mensaje para leer", { exact: true })).toBeVisible()
  await salirDeSesion(page)

  await ingresar(page, "docente@example.com")
  await expect(campana(page)).toHaveAccessibleName(/sin leer/, { timeout: 15_000 })
  expect(await avisoSinLeer(page)).toBe(true)

  // Abrir la conversación desde la lista (no desde la campana) también lee su aviso.
  await fila(page).getByRole("button", { name: new RegExp(`^${GRUPO}`) }).first().click()
  await expect(page.getByText("Mensaje para leer", { exact: true })).toBeVisible()
  await expect.poll(() => avisoSinLeer(page), { timeout: 10_000 }).toBe(false)
  await campana(page).click()
  await captura(page, "despues-1-campana-aviso-leido")
  await page.keyboard.press("Escape")

  // Encabezado: vuelve a la lista con la conversación marcada.
  await page.getByRole("main").getByRole("button", { name: `Opciones de ${GRUPO}` }).last().click()
  await page.getByRole("menuitem", { name: "Marcar como no leído" }).click()
  await expect(page).toHaveURL((u) => !u.searchParams.has("canal"))
  await expect(page.getByText(`${GRUPO} quedó como no leído.`)).toBeVisible()
  await expect(fila(page)).toContainText("1")
  await captura(page, "despues-2-no-leido-encabezado")

  // Abrirla la limpia.
  await fila(page).getByRole("button", { name: new RegExp(`^${GRUPO}`) }).first().click()
  await expect(page.getByText("Mensaje para leer", { exact: true })).toBeVisible()

  // Fila (sin abrir): menú de la fila.
  await page.goBack().catch(() => undefined)
  await expect(page).toHaveURL((u) => !u.searchParams.has("canal"))
  await expect(fila(page)).not.toContainText(/\b1\b/)
  await fila(page).hover()
  await fila(page).getByRole("button", { name: `Opciones de ${GRUPO}` }).click()
  await page.getByRole("menuitem", { name: "Marcar como no leído" }).click()
  await expect(fila(page)).toContainText("1")
  await fila(page).hover()
  await fila(page).getByRole("button", { name: `Opciones de ${GRUPO}` }).click()
  await expect(page.getByRole("menuitem", { name: "Marcar como leído" })).toBeVisible()
  await page.getByRole("menuitem", { name: "Marcar como leído" }).click()
  await expect(fila(page)).not.toContainText(/\b1\b/)
})
