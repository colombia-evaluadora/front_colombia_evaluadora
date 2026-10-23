import { expect, test, type Page } from "@playwright/test"

// Chat con MSW: vista previa del último mensaje en la lista, Colevabot (tarjeta y DM sin
// compositor), atajos "/" del compositor, pestaña "Mensajes" de la campana y autoguardado del
// borrador al editar una actividad publicada. Con `CHAT_CAPTURAS=<dir>` guarda capturas.
test.setTimeout(150_000)
test.use({ viewport: { width: 1280, height: 832 } })
const CHAT = "/app/comunicaciones/chat"
const CAPTURAS = process.env.CHAT_CAPTURAS

async function captura(page: Page, nombre: string) {
  if (CAPTURAS) await page.screenshot({ path: `${CAPTURAS}/${nombre}.png` })
}

async function login(page: Page, email: string) {
  await page.goto(`/login?redirectTo=${encodeURIComponent(CHAT)}`)
  await page.waitForFunction(() => !!navigator.serviceWorker?.controller, null, { timeout: 60_000 })
  for (let intento = 0; intento < 2; intento++) {
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
const fila = (page: Page, nombre: string) =>
  lista(page).getByRole("button", { name: new RegExp(`^${nombre}`) }).and(page.locator(":not([aria-haspopup])")).first()
const editor = (page: Page) => page.getByRole("combobox", { name: /^Mensaje para/ })

test("lista: cada conversación muestra la vista previa y la hora del último mensaje", async ({ page }) => {
  await login(page, "admin@example.com")
  const darlene = fila(page, "Darlene Robertson")
  await expect(darlene).toContainText("Hola Andrés, ¿tienes un momento para revisar la planilla de 7°B?")
  await expect(darlene.locator("time")).toHaveText(/\d{1,2}:\d{2}/)
  await expect(fila(page, "02-docentes-general")).toContainText("Tú:")
  await expect(fila(page, "Colevabot")).toContainText("Solicitud de aprobación: corrección de resultado")
  await captura(page, "app-4516-68095-lista-vista-previa")

  // En vivo: lo que envío pasa a ser la vista previa.
  await fila(page, "03-planeacion-clases").click()
  await editor(page).fill("Nueva **planeación** lista")
  await editor(page).press("Enter")
  await expect(fila(page, "03-planeacion-clases")).toContainText("Tú: Nueva planeación lista")
})

test("Colevabot: tarjeta de aprobación estructurada y DM sin compositor", async ({ page }) => {
  await login(page, "admin@example.com")
  await fila(page, "Colevabot").click()
  const tarjeta = page.getByRole("article", { name: "Solicitud de aprobación: corrección de resultado" })
  await expect(tarjeta).toBeVisible()
  await expect(tarjeta).toContainText("NUEVA SOLICITUD DE APROBACIÓN")
  await expect(tarjeta).toContainText("Docente:")
  await expect(tarjeta).toContainText("Jesús Torres")
  await expect(tarjeta).toContainText("Colevabot (BOT)")
  await expect(page.getByRole("article", { name: "Hola, soy Colevabot" })).toBeVisible()
  await expect(editor(page)).toHaveCount(0)
  await captura(page, "app-4428-64360-colevabot-tarjeta")
  await tarjeta.getByRole("button", { name: "Revisar en el planeador" }).click()
  await page.waitForURL((u) => u.pathname === "/app/planeador/actividades")
})

test('atajos "/": se escriben o se eligen con el botón (sin llamadas ni grabaciones)', async ({ page }) => {
  await login(page, "admin@example.com")
  await fila(page, "02-docentes-general").click()
  await expect(page.getByRole("button", { name: "Grabar video" })).toHaveCount(0)

  await editor(page).fill("/")
  const menu = page.getByRole("listbox", { name: "Atajos" })
  await expect(menu.getByRole("option")).toHaveText([
    /Crear encuesta/,
    /Votación rápida/,
    /Elección/,
    /Comunicado/,
    /Adjuntar archivo/,
    /Programar envío/,
  ])
  await captura(page, "app-composer-atajos")
  await editor(page).fill("/enc")
  await expect(menu.getByRole("option")).toHaveCount(1)
  await editor(page).press("Enter")
  await expect(page.getByRole("dialog").getByRole("heading", { name: "Crear una Encuesta" })).toBeVisible()
  await page.keyboard.press("Escape")
  await expect(page.getByRole("dialog")).toHaveCount(0)
  // Con el diálogo abierto el editor queda inerte (fuera del árbol accesible): se mira al cerrar.
  await expect(editor(page)).toHaveValue("")

  // Con el botón y el ratón.
  await page.getByRole("button", { name: "Atajos" }).click()
  await menu.getByRole("option", { name: /Votación rápida/ }).click()
  await expect(page.getByRole("dialog").getByRole("heading", { name: "Crear una Votación rápida" })).toBeVisible()
  await page.keyboard.press("Escape")

  // "/programar" sin texto: el mensaje se escribe en el diálogo.
  await editor(page).fill("/prog")
  await editor(page).press("Enter")
  const programar = page.getByRole("dialog")
  await expect(programar.getByRole("heading", { name: "Programar un mensaje" })).toBeVisible()
  await expect(programar.getByRole("textbox").first()).toBeVisible()
  await page.keyboard.press("Escape")

  // Escape cierra el menú y quita el comando.
  await editor(page).fill("/")
  await editor(page).press("Escape")
  await expect(menu).toHaveCount(0)
  await expect(editor(page)).toHaveValue("")
})

test("campana: pestaña Mensajes con no leídos que abre el chat", async ({ page }) => {
  await login(page, "admin@example.com")
  await page.goto("/app/notificaciones")
  await page.getByRole("button", { name: /^Notificaciones/ }).click()
  const mensajes = page.getByRole("tab", { name: /Mensajes/ })
  await expect(mensajes).toBeVisible()
  await mensajes.click()
  const conversaciones = page.getByRole("list", { name: "Conversaciones recientes" })
  const darlene = conversaciones.getByRole("button", { name: /Darlene Robertson/ })
  await expect(darlene).toContainText("Sin leer")
  await captura(page, "app-campana-mensajes")
  await darlene.click()
  await page.waitForURL((u) => u.pathname === CHAT && u.searchParams.get("canal") === "9")
})

test("editar una actividad publicada autoguarda el borrador, se retoma y se descarta", async ({ page }) => {
  const NOMBRE = "Elección Personero 2026"
  const CAMBIADO = "Elección Personero 2026 (ajustada)"
  await login(page, "admin@example.com")
  const abrirEdicion = async () => {
    // Las acciones de la fila solo reciben el puntero con la fila en hover.
    await fila(page, NOMBRE).hover()
    await page.getByRole("button", { name: `Opciones de ${NOMBRE}` }).first().click()
    await page.getByRole("menuitem", { name: "Editar elección" }).click()
    await expect(page.getByRole("dialog").getByRole("heading", { name: "Editar Elección" })).toBeVisible()
    return page.getByRole("dialog")
  }

  let d = await abrirEdicion()
  await d.getByLabel("Nombre").fill(CAMBIADO)
  await expect(d.getByText("Borrador guardado")).toBeVisible({ timeout: 10_000 })
  await expect(d.getByRole("button", { name: "Descartar cambios" })).toBeVisible()
  await captura(page, "app-editar-actividad-autoguardado")
  await page.keyboard.press("Escape")
  await expect(page.getByText("Tus cambios sin guardar quedaron en Borradores y enviados.")).toBeVisible()

  // Volver a editar retoma los cambios sobre lo publicado.
  d = await abrirEdicion()
  await expect(d.getByLabel("Nombre")).toHaveValue(CAMBIADO)
  await page.keyboard.press("Escape")

  // También desde "Borradores y enviados".
  await lista(page).getByRole("button", { name: /^Borradores y enviados/ }).click()
  const tarjeta = page.getByRole("article").filter({ hasText: CAMBIADO })
  await expect(tarjeta).toContainText("Cambios sin guardar")
  await tarjeta.hover()
  await tarjeta.getByRole("button", { name: `Retomar ${CAMBIADO}` }).click()
  d = page.getByRole("dialog")
  await expect(d.getByRole("heading", { name: "Editar Elección" })).toBeVisible()
  await expect(d.getByLabel("Nombre")).toHaveValue(CAMBIADO)

  // Descartar vuelve a lo publicado.
  await d.getByRole("button", { name: "Descartar cambios" }).click()
  await page.getByRole("alertdialog").getByRole("button", { name: "Si, salir" }).click()
  await expect(page.getByText("Borrador descartado.")).toBeVisible()
  await fila(page, NOMBRE).click()
  d = await abrirEdicion()
  await expect(d.getByLabel("Nombre")).toHaveValue(NOMBRE)
})
