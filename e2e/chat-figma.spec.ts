import { expect, test, type Page } from "@playwright/test"

// Brechas del chat frente al Figma (MSW): pila de avatares, encabezado de DM, barra de fijados,
// aviso de mensaje eliminado (con el original solo para quien modera), confirmación de lectura,
// "escribiendo", votación modificada, miembros con buscador, Archivados arriba, badge naranja,
// búsquedas recientes y barra de acciones en móvil (360 px). Con `CHAT_CAPTURAS=<dir>` guarda una
// captura por estado para compararla con el frame de Figma.
test.setTimeout(180_000)
const CHAT = "/app/comunicaciones/chat"
const CAPTURAS = process.env.CHAT_CAPTURAS

async function captura(page: Page, nombre: string) {
  if (CAPTURAS) await page.screenshot({ path: `${CAPTURAS}/${nombre}.png` })
}

async function login(page: Page, email: string) {
  await page.goto(`/login?redirectTo=${encodeURIComponent(CHAT)}`)
  await page.waitForFunction(() => !!navigator.serviceWorker?.controller, null, { timeout: 60_000 })
  await page.getByLabel("Correo electrónico").fill(email)
  await page.getByLabel("Contraseña", { exact: true }).fill("password")
  const compartido = page.getByRole("checkbox", { name: "Este es un equipo compartido" })
  if ((await compartido.count()) && (await compartido.isChecked()) && (await compartido.isEnabled())) {
    await compartido.click()
  }
  await page.getByRole("button", { name: "Ingresar" }).click()
  await page.waitForURL((url) => url.pathname === CHAT, { timeout: 30_000 })
  await page.getByRole("navigation", { name: "Conversaciones" }).waitFor()
}

const lista = (page: Page) => page.getByRole("navigation", { name: "Conversaciones" })
const conversacion = (page: Page, nombre: string) =>
  lista(page).getByRole("button", { name: new RegExp(`^${nombre}`) }).and(page.locator(":not([aria-haspopup])")).first()
const registro = (page: Page) => page.getByRole("log")

test.describe("escritorio", () => {
  test.use({ viewport: { width: 1280, height: 832 } })

  test("coordinador: foro con fijados, eliminado visible, edición, lectura y avatares", async ({ page }) => {
    await login(page, "admin@example.com")
    await conversacion(page, "02-docentes-general").click()
    const titulo = page.getByRole("heading", { level: 2, name: "02-docentes-general" })
    await expect(titulo).toBeVisible()
    await captura(page, "app-f1-foro-encabezado")
    // El título completo cabe (antes se truncaba con el buscador ancho).
    expect(await titulo.evaluate((h) => (h.querySelector(".truncate") as HTMLElement).scrollWidth <= (h.querySelector(".truncate") as HTMLElement).clientWidth)).toBe(true)
    // Pila de avatares: iniciales opacas, sin transparentarse.
    const avatares = page.locator("main header [data-slot=avatar-group] [data-slot=avatar]")
    await expect(avatares).toHaveCount(3)
    await expect(page.getByRole("region", { name: "Mensajes fijados" })).toContainText("Claro que sí")
    const eliminado = registro(page).getByRole("article", { name: "Mensaje eliminado" })
    await expect(eliminado).toContainText("Este mensaje fue eliminado.")
    await expect(eliminado).toContainText("Visible para el coordinador.")
    // El directivo (coordinador) ve el original.
    await expect(eliminado).toContainText("Les comparto mi número personal")
    await expect(registro(page).getByText(/^Editado \d/)).toBeVisible()
    await expect(registro(page).getByText("Leído").first()).toBeAttached()
    await expect(registro(page).getByText("Enviado").first()).toBeAttached()
    await eliminado.scrollIntoViewIfNeeded()
    await captura(page, "app-f1-foro-fijado-eliminado-lectura")

    // Ir al mensaje fijado desde la barra.
    await page.getByRole("region", { name: "Mensajes fijados" }).getByRole("button").first().click()

    // Eliminar un mensaje propio: Sí / No y queda el aviso.
    const propio = registro(page).getByRole("article").filter({ hasText: "¡La recibí!" })
    await propio.hover()
    await propio.getByRole("button", { name: "Eliminar mensaje" }).click()
    const dialogo = page.getByRole("alertdialog")
    await expect(dialogo.getByRole("heading", { name: "¿Deseas eliminar este mensaje?" })).toBeVisible()
    await expect(dialogo).toContainText("el coordinador podrá consultarlo")
    await captura(page, "app-f6-modal-eliminar")
    await dialogo.getByRole("button", { name: "Sí" }).click()
    await expect(registro(page).getByRole("article", { name: "Mensaje eliminado" })).toHaveCount(2)

    // Miembros: título "Añadir personas a", buscar y acciones por fila.
    await page.getByRole("button", { name: /Ver los .* miembros/ }).click()
    const modal = page.getByRole("dialog")
    await expect(modal.getByRole("heading", { name: "Añadir personas a 02-docentes-general" })).toBeVisible()
    await modal.getByLabel("Buscar en el foro").fill("Darlene")
    await expect(modal.getByRole("button", { name: "Bloquear a Darlene Robertson" })).toBeVisible()
    await expect(modal.getByRole("button", { name: "Eliminar a Darlene Robertson del canal" })).toBeVisible()
    await expect(modal.getByRole("button", { name: /Bloquear a Marta/ })).toHaveCount(0)
    await captura(page, "app-f4-modal-miembros")
    await page.keyboard.press("Escape")
  })

  test("DM: badge naranja, encabezado con perfil, lectura y escribiendo", async ({ page }) => {
    await login(page, "admin@example.com")
    const dm = conversacion(page, "Darlene Robertson")
    await expect(dm.locator("span.bg-orange")).toHaveText(/1$/)
    await captura(page, "app-f2-dm-badge-naranja")
    await dm.click()
    const encabezado = page.getByRole("main")
    await expect(encabezado.getByRole("heading", { level: 2, name: "Darlene Robertson" })).toBeVisible()
    await expect(encabezado.getByText("Docente", { exact: true })).toBeVisible()
    await expect(encabezado.getByRole("button", { name: /Ver los .* miembros/ })).toHaveCount(0)
    await page.getByRole("combobox", { name: /^Mensaje para/ }).fill("Claro, ya la reviso.")
    await page.keyboard.press("Enter")
    const enviado = registro(page).getByRole("article").filter({ hasText: "Claro, ya la reviso." })
    await expect(enviado.getByText("Enviado")).toBeAttached()
    // La otra persona lee (✓✓) y escribe.
    await expect(enviado.getByText("Leído")).toBeAttached({ timeout: 10_000 })
    await expect(page.getByText("Darlene está escribiendo…")).toBeVisible({ timeout: 10_000 })
    await captura(page, "app-f1-escribiendo-leido")
  })

  test("votación modificada, Archivados arriba y búsquedas recientes", async ({ page }) => {
    await login(page, "admin@example.com")
    await conversacion(page, "01-matematicas-secundaria").click()
    const card = registro(page).getByRole("article", { name: /Votación rápida: ¿Hacemos la reunión/ })
    await expect(card.getByRole("status")).toContainText("La votación fue modificada y se reiniciaron los votos")
    await expect(card.getByText(/Editado hace/)).toBeVisible()
    await captura(page, "app-f9-votacion-modificada")
    await card.getByRole("radio").first().click()
    await card.getByRole("button", { name: "Votar" }).click()
    await expect(card.getByRole("status")).toHaveCount(0)

    // Archivados: primera sección de la lista, con contador y desarchivar.
    const archivados = lista(page).getByRole("button", { name: /^Archivados/ })
    await expect(archivados).toContainText("1")
    await archivados.click()
    await captura(page, "app-f5-archivados")
    await lista(page).getByRole("button", { name: "Desarchivar 04-proyecto-lectura-2025" }).click()
    await expect(lista(page).getByRole("button", { name: /^Archivados/ })).toHaveCount(0)

    // Búsquedas recientes.
    const buscar = page.getByPlaceholder("Buscar conversaciones y personas")
    await buscar.fill("planeacion")
    await conversacion(page, "03-planeacion-clases").click()
    await buscar.fill("")
    await buscar.click()
    await expect(page.getByRole("list", { name: "Búsquedas recientes" })).toContainText("planeacion")
    await captura(page, "app-f2-busquedas-recientes")
    await page.getByRole("list", { name: "Búsquedas recientes" }).getByRole("button", { name: "planeacion" }).click()
    await expect(buscar).toHaveValue("planeacion")
  })

  test("docente: el mensaje eliminado solo muestra el aviso", async ({ page }) => {
    await login(page, "docente@example.com")
    await conversacion(page, "02-docentes-general").click()
    const eliminado = registro(page).getByRole("article", { name: "Mensaje eliminado" })
    await expect(eliminado).toContainText("Este mensaje fue eliminado.")
    await expect(eliminado).not.toContainText("Les comparto mi número personal")
    await eliminado.scrollIntoViewIfNeeded()
    await captura(page, "app-f6-eliminado-participante")
  })
})

test.describe("móvil 360 px", () => {
  test.use({ viewport: { width: 360, height: 760 }, hasTouch: true, isMobile: true })

  test("la barra de acciones no tapa el texto; se abre con ⋮", async ({ page }) => {
    await login(page, "admin@example.com")
    await conversacion(page, "02-docentes-general").click()
    const propio = registro(page).getByRole("article").filter({ hasText: "En Word está perfecto" })
    await propio.scrollIntoViewIfNeeded()
    // La barra (padre del botón) es la que se oculta.
    const editar = propio.getByRole("button", { name: "Editar mensaje" }).locator("..")
    await expect(editar).toHaveCSS("opacity", "0")
    await captura(page, "app-m1-movil-canal")
    await propio.getByRole("button", { name: "Acciones del mensaje" }).tap()
    await expect(editar).toHaveCSS("opacity", "1")
    await captura(page, "app-m2-movil-acciones")
    // Tocar fuera la cierra.
    await page.getByRole("heading", { level: 2, name: "02-docentes-general" }).tap()
    await expect(editar).toHaveCSS("opacity", "0")
  })
})
