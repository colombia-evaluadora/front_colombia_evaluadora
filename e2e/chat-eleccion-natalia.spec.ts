import { expect, test, type Locator, type Page } from "@playwright/test"

// Correcciones de Elecciones pedidas por la PO (Natalia), con MSW:
// 1) En "Crear una Elección" (paso de candidatos) el título, "Agregar candidato" y el pie quedan
//    fijos; solo scrollea la lista de candidatos (con "Voto en blanco"). Se mira a 650 px de alto.
// 2) Elección con "Permitir comentarios": al cerrarla, el compositor se reemplaza por un aviso.
// Con `ELN_CAPTURAS=<dir>` guarda capturas (`ELN_PREFIJO` antepone "antes-"/"despues-").
test.setTimeout(180_000)
test.use({ viewport: { width: 1280, height: 650 } })
const CHAT = "/app/comunicaciones/chat"
const CAPTURAS = process.env.ELN_CAPTURAS
const PREFIJO = process.env.ELN_PREFIJO ?? ""

async function captura(page: Page, nombre: string) {
  if (CAPTURAS) await page.screenshot({ path: `${CAPTURAS}/${PREFIJO}${nombre}.png` })
}

async function login(page: Page, email: string) {
  await page.goto(`/login?redirectTo=${encodeURIComponent(CHAT)}`)
  await page.waitForFunction(() => !!navigator.serviceWorker?.controller, null, { timeout: 60_000 })
  for (let intento = 0; intento < 5; intento++) {
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
  await page.getByRole("navigation", { name: "Conversaciones" }).waitFor({ timeout: 90_000 })
}

const lista = (page: Page) => page.getByRole("navigation", { name: "Conversaciones" })

async function fechaHoy(dialogo: Locator, page: Page) {
  await dialogo.getByRole("button", { name: /^Agregar$/ }).first().click()
  const dia = await page.evaluate(() => new Date().toLocaleDateString())
  await page.locator(`[data-slot=calendar] button[data-day="${dia}"]`).first().click()
  await page.keyboard.press("Escape")
}

async function elegirGrado(dialogo: Locator, page: Page) {
  await dialogo.getByRole("button", { name: /Selecciona grado o funcionario/ }).click()
  await page.getByRole("list", { name: "Grados" }).getByRole("button").first().click()
  await dialogo.getByText("Seleccionar todos").click()
}

/** Abre el asistente y llega al paso de candidatos. */
async function hastaCandidatos(page: Page, nombre: string, comentarios = false) {
  await lista(page).getByRole("button", { name: "Agregar foro" }).click()
  await page.getByRole("menuitem", { name: "Elección" }).click()
  const d = page.getByRole("dialog")
  await d.getByLabel("Nombre").fill(nombre)
  await fechaHoy(d, page)
  await d.getByRole("combobox", { name: /Jornada/ }).click()
  await page.getByRole("option").first().click()
  if (comentarios) await d.getByRole("checkbox", { name: "Comentarios" }).click()
  await d.getByRole("button", { name: "Siguiente", exact: true }).click()
  await elegirGrado(d, page)
  await d.getByRole("button", { name: "Siguiente", exact: true }).click()
  return d
}

async function agregarCandidatos(d: Locator, n: number) {
  for (let i = 1; i <= n; i++) {
    await d.getByLabel("Nombre").fill(`Candidato ${i}`)
    await d.getByLabel("Número").fill(String(i))
    await d.getByRole("button", { name: "Agregar", exact: true }).click()
    await expect(d.getByRole("list", { name: "Candidatos agregados" }).getByRole("listitem")).toHaveCount(i + 1)
  }
}

/** El elemento está completo dentro del área visible del diálogo. */
async function dentroDe(contenedor: Locator, el: Locator) {
  const c = await contenedor.boundingBox()
  const b = await el.boundingBox()
  expect(c && b).toBeTruthy()
  expect(b!.y).toBeGreaterThanOrEqual(c!.y - 1)
  expect(b!.y + b!.height).toBeLessThanOrEqual(c!.y + c!.height + 1)
}

// El primer ingreso tras arrancar Vite + MSW rebota al login de forma intermitente: se calienta aparte.
test("precalentar MSW", async ({ page }) => {
  test.setTimeout(240_000)
  const espera = new Promise((r) => setTimeout(r, 150_000))
  await Promise.race([login(page, "admin@example.com").catch(() => undefined), espera])
})

test("crear elección: título, 'Agregar candidato' y pie fijos; solo scrollea la lista", async ({ page }) => {
  await login(page, "admin@example.com")
  const d = await hastaCandidatos(page, "Personero alto bajo")
  await agregarCandidatos(d, 6)
  const listaCandidatos = d.getByRole("list", { name: "Candidatos agregados" })
  await captura(page, "candidatos-650px")

  // La lista desborda y scrollea ella; el diálogo no.
  const medidas = await listaCandidatos.evaluate((ul) => ({ alto: ul.scrollHeight, visible: ul.clientHeight }))
  expect(medidas.alto).toBeGreaterThan(medidas.visible)
  await listaCandidatos.evaluate((ul) => ul.scrollTo({ top: ul.scrollHeight }))
  await expect(listaCandidatos.getByText("Voto en blanco")).toBeInViewport()
  await captura(page, "candidatos-650px-scroll-abajo")

  // Fijos aunque la lista esté al final.
  await dentroDe(d, d.getByRole("heading", { name: "Crear una Elección" }))
  await dentroDe(d, d.getByRole("heading", { name: "Agregar candidato" }))
  await dentroDe(d, d.getByRole("button", { name: "Agregar", exact: true }))
  await dentroDe(d, d.getByRole("button", { name: "Crear" }))
  expect(await d.evaluate((el) => el.scrollTop)).toBe(0)
})

test("elección con comentarios: al cerrarla nadie puede escribir", async ({ page }) => {
  await login(page, "admin@example.com")
  const d = await hastaCandidatos(page, "Personero con comentarios", true)
  await agregarCandidatos(d, 2)
  await d.getByRole("button", { name: "Crear" }).click()
  await expect(page.getByRole("heading", { level: 2, name: "Personero con comentarios" })).toBeVisible()
  await expect(page.getByRole("combobox", { name: /^Mensaje para/ })).toBeVisible()
  await captura(page, "eleccion-abierta-con-comentarios")

  await page.getByRole("button", { name: "Opciones de Personero con comentarios" }).last().click()
  await page.getByRole("menuitem", { name: /Cerrar proceso electoral/ }).click()
  await page.getByRole("alertdialog").getByRole("button", { name: /Cerrar votación/ }).click()
  await expect(page.getByText(/Votación cerrada/).first()).toBeVisible()
  await expect(page.getByText("La elección cerró: ya no se pueden enviar mensajes.")).toBeVisible()
  await expect(page.getByRole("combobox", { name: /^Mensaje para/ })).toHaveCount(0)
  await captura(page, "eleccion-cerrada-sin-composer")
})
