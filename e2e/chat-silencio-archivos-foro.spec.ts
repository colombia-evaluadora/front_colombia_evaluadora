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
  await page.getByRole("menuitem", { name: "Hasta el final del día" }).click()
  await expect(page.getByText("Notificaciones silenciadas hasta el final del día.")).toBeVisible()

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
  const dialogo = await d.boundingBox()
  // Completo dentro del área visible del diálogo (el único contenedor con scroll)…
  expect(label!.y).toBeGreaterThanOrEqual(dialogo!.y)
  // …y montado sobre el borde superior, por encima de la línea del texto del input.
  expect(label!.y).toBeLessThan(input!.y)
  expect(label!.y + label!.height).toBeLessThanOrEqual(input!.y + input!.height / 2)
  await captura(page, "app-crear-foro-label")
})

// QA testv2: con el input ENFOCADO (autoFocus) el label salía cortado por arriba. El form tenía su
// propio `overflow-y-auto` y el label quedaba a 2 px de ese borde de recorte: el form no debe
// scrollear y el label debe verse entero, en ventana normal y baja, para foro y grupo.
for (const alto of [832, 560]) {
  test(`crear foro/grupo: "Nombre" entero con el input enfocado (alto ${alto})`, async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: alto })
    await login(page)
    for (const abrir of [
      async () => {
        await lista(page).getByRole("button", { name: "Agregar foro" }).click()
        await page.getByRole("menuitem", { name: "Foro" }).click()
      },
      () => lista(page).getByRole("button", { name: "Crear grupo" }).click(),
    ]) {
      await abrir()
      const d = page.getByRole("dialog")
      await expect(d.getByLabel("Nombre")).toBeFocused()
      const recorte = await page.evaluate(() => {
        const form = document.getElementById("crear-chat")!
        const label = document.querySelector('label[for="crear-chat-nombre"]')!.getBoundingClientRect()
        const scroller = form.closest<HTMLElement>("[role=dialog]")!.getBoundingClientRect()
        return { formScrollea: getComputedStyle(form).overflowY !== "visible", margen: label.top - scroller.top }
      })
      expect(recorte.formScrollea).toBe(false)
      expect(recorte.margen).toBeGreaterThan(8)
      await page.keyboard.press("Escape")
      await expect(d).toBeHidden()
    }
  })
}

// QA 57: los listados de personas del chat muestran solo nombre y rol (nunca correo ni documento).
test("listados de personas del chat: solo nombre y rol, sin correo", async ({ page }) => {
  await login(page)
  // Buscador de la barra lateral (sección Personas).
  await page.getByRole("searchbox").first().fill("Darlene")
  const personas = lista(page)
  await expect(personas.getByText("Darlene Robertson").first()).toBeVisible()
  await expect(page.getByText(/@iesimonbolivar\.edu\.co/)).toHaveCount(0)
  await page.getByRole("searchbox").first().fill("")
  // Selector de personas al crear un foro (paso 2).
  await lista(page).getByRole("button", { name: "Agregar foro" }).click()
  await page.getByRole("menuitem", { name: "Foro" }).click()
  const d = page.getByRole("dialog")
  await d.getByLabel("Nombre").fill("qa-57-roles")
  await d.getByRole("button", { name: "Siguiente" }).click()
  await d.getByRole("combobox", { name: "Buscar personas" }).fill("Pedro")
  const opcion = page.getByRole("option", { name: /Pedro Castaño Ruiz/ })
  await expect(opcion).toBeVisible()
  await expect(opcion).toContainText("Docente")
  await expect(opcion).not.toContainText("@")
  await captura(page, "app-qa57-selector-personas")
})

test("panel de preferencias: silenciar 1 hora y activar una conversación", async ({ page }) => {
  await login(page)
  await page.goto("/app/notificaciones/preferencias")
  const panel = page.getByRole("region", { name: "Conversaciones del chat" })
  await expect(panel).toBeVisible({ timeout: 30_000 })
  const fila = panel.getByRole("listitem").filter({ hasText: "Notificaciones activas" }).first()
  const nombre = (await fila.locator("p.font-medium").textContent())?.trim() ?? ""
  await fila.getByRole("button", { name: `Silenciar ${nombre}` }).click()
  await page.getByRole("menuitem", { name: "1 hora" }).click()
  await expect(page.getByText(`Notificaciones silenciadas por 1 hora en ${nombre}.`)).toBeVisible()
  const silenciada = panel.getByRole("listitem").filter({ hasText: nombre }).first()
  await expect(silenciada.getByText(/^Silenciada hasta/)).toBeVisible()
  await captura(page, "panel-silencio")
  await silenciada.getByRole("button", { name: "Activar" }).click()
  await expect(page.getByText(`Notificaciones activadas en ${nombre}.`)).toBeVisible()
  await expect(silenciada.getByText("Notificaciones activas")).toBeVisible()
})

test("panel de preferencias: tipo de alerta por conversación y ajustes de sonido", async ({ page }) => {
  await login(page)
  await page.goto("/app/notificaciones/preferencias")
  await expect(page.getByText("Medios de aviso por tipo de notificación")).toBeVisible({ timeout: 30_000 })
  const panel = page.getByRole("region", { name: "Conversaciones del chat" })
  const fila = panel.getByRole("listitem").filter({ hasText: "Campana y sonido" }).first()
  const nombre = (await fila.locator("p.font-medium").textContent())?.trim() ?? ""
  await fila.getByRole("button", { name: `Tipo de alerta de ${nombre}` }).click()
  await page.getByRole("menuitemcheckbox", { name: "Correo" }).click()
  await expect(page.getByText(`Alertas de ${nombre}: campana, sonido y correo.`)).toBeVisible()
  await page.keyboard.press("Escape")
  await expect(panel.getByRole("listitem").filter({ hasText: nombre }).first()).toContainText("Campana, sonido y correo")

  const ajustes = page.getByRole("region", { name: "Sonido y confirmación de lectura" })
  const sonido = ajustes.getByRole("switch", { name: "Sonido de los avisos" })
  await expect(sonido).toBeChecked()
  await sonido.click()
  await expect(page.getByText("Ajustes del chat actualizados.")).toBeVisible()
  await expect(sonido).not.toBeChecked()
})

test("confirmación de lectura: el mensaje propio la pide y queda Enviado", async ({ page }) => {
  const NOMBRE = "02-docentes-general"
  await login(page)
  await fila(page, NOMBRE).click()
  const pedir = page.getByRole("button", { name: "Solicitar confirmación de lectura" })
  await expect(pedir).toHaveAttribute("aria-pressed", "false")
  await pedir.click()
  await expect(pedir).toHaveAttribute("aria-pressed", "true")
  const texto = `confirmar-${Date.now()}`
  const editor = page.getByRole("combobox", { name: /^Mensaje para/ })
  await editor.fill(texto)
  await editor.press("Enter")
  const burbuja = page.getByRole("log").locator("article").filter({ hasText: texto })
  await expect(burbuja.locator('[data-lectura="ENVIADO"]')).toContainText("Enviado")
  // Vuelve al ajuste por defecto para el siguiente mensaje.
  await expect(pedir).toHaveAttribute("aria-pressed", "false")
})
