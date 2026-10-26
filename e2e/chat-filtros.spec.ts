import { expect, test, type Page } from "@playwright/test"

// Historial y filtros del chat (MSW): palabras clave en el servidor, panel de filtros (tipo,
// estado, rol, grupo) combinables, filtros en la URL y abrir un resultado en su conversación.
test.setTimeout(300_000)
test.use({ viewport: { width: 1280, height: 832 } })
const CHAT = "/app/comunicaciones/chat"

async function login(page: Page, destino = CHAT) {
  await page.goto(`/login?redirectTo=${encodeURIComponent(destino)}`)
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
  await page.getByRole("navigation", { name: "Conversaciones" }).waitFor({ timeout: 150_000 })
}

test("buscar en el historial, filtrar y abrir el resultado", async ({ page }) => {
  await login(page)
  const lista = page.getByRole("navigation", { name: "Conversaciones" })

  await page.getByPlaceholder("Buscar conversaciones, personas y mensajes").fill("FRACCIONES")
  const resultado = lista.getByRole("button", { name: /planeación de fracciones/ })
  await expect(resultado).toBeVisible()
  // Resaltado sin distinguir mayúsculas ni tildes.
  await expect(resultado.locator("mark").first()).toHaveText(/fracciones/i)
  await expect(page).toHaveURL(/q=FRACCIONES/)

  // Panel de filtros: tipo "Individual" deja fuera el foro donde está el mensaje.
  await page.getByRole("button", { name: "Filtros", exact: true }).click()
  await page.getByRole("checkbox", { name: "Individual" }).click()
  await expect(page.getByRole("button", { name: "Filtros (1 activos)" })).toBeVisible()
  await page.keyboard.press("Escape")
  await expect(page.getByRole("status").filter({ hasText: "Filtrando: Individual" })).toBeVisible()
  await expect(lista.getByText("Ningún mensaje coincide con los filtros.")).toBeVisible()

  // Institucional + Docentes: vuelve a aparecer (Darlene es docente del foro).
  await page.getByRole("button", { name: "Filtros (1 activos)" }).click()
  await page.getByRole("checkbox", { name: "Individual" }).click()
  await page.getByRole("checkbox", { name: "Institucional" }).click()
  await page.getByRole("checkbox", { name: "Docentes" }).click()
  await page.keyboard.press("Escape")
  await expect(page.getByRole("status").filter({ hasText: "Institucional · Docentes" })).toBeVisible()
  await expect(lista.getByRole("button", { name: /Listo, ya te la adjunté/ })).toBeVisible()

  // Los filtros sobreviven a recargar (viven en la URL).
  const url = page.url()
  expect(url).toMatch(/tipos=/)
  await page.reload()
  await lista.waitFor()
  await expect(page.getByRole("status").filter({ hasText: "Institucional · Docentes" })).toBeVisible()
  await expect(page.getByPlaceholder("Buscar conversaciones, personas y mensajes")).toHaveValue("FRACCIONES")

  // Abrir el resultado lleva a la conversación y resalta el mensaje.
  await lista.getByRole("button", { name: /planeación de fracciones/ }).click()
  await expect(page.getByRole("heading", { name: /02-docentes-general/ })).toBeVisible()
  await expect(page.locator("[data-mensaje-id][data-destacado]")).toHaveCount(1)

  // Quitar filtros deja solo las palabras.
  await page.getByRole("button", { name: "Quitar filtros" }).click()
  await expect(page).not.toHaveURL(/tipos=/)
})

test("guardar, aplicar, renombrar y eliminar filtros favoritos", async ({ page }) => {
  await login(page)
  const lista = page.getByRole("navigation", { name: "Conversaciones" })
  const favoritos = () => page.getByRole("dialog", { name: "Filtros favoritos" })

  // Sin filtros no se puede guardar.
  await page.getByRole("button", { name: "Filtros favoritos" }).click()
  await expect(favoritos().getByText("Aún no tienes favoritos.", { exact: false })).toBeVisible()
  await expect(favoritos().getByText("Escribe una búsqueda o elige filtros para guardarlos.")).toBeVisible()
  await page.keyboard.press("Escape")

  // Palabras + tipo Institucional, y se guardan con nombre.
  await page.getByPlaceholder("Buscar conversaciones, personas y mensajes").fill("fracciones")
  await page.getByRole("button", { name: "Filtros", exact: true }).click()
  await page.getByRole("checkbox", { name: "Institucional" }).click()
  await page.keyboard.press("Escape")
  await page.getByRole("button", { name: "Filtros favoritos" }).click()
  await favoritos().getByPlaceholder("Ej.: No leídos de 601").fill("Fracciones en foros")
  await favoritos().getByRole("button", { name: "Guardar" }).click()
  await expect(page.getByText("Se guardó el filtro favorito «Fracciones en foros».")).toBeVisible()
  await expect(favoritos().getByRole("button", { name: /^Fracciones en foros/ })).toHaveAttribute("aria-current", "true")

  // Mismo nombre: aviso legible del 409.
  await favoritos().getByPlaceholder("Ej.: No leídos de 601").fill("fracciones EN foros")
  await favoritos().getByRole("button", { name: "Guardar" }).click()
  await expect(page.getByText("Ya tienes un filtro favorito llamado «fracciones EN foros».")).toBeVisible()
  await page.keyboard.press("Escape")

  // Limpiar y aplicar el favorito de un clic.
  await page.getByRole("button", { name: "Quitar filtros" }).click()
  await page.getByRole("button", { name: "Limpiar búsqueda" }).click()
  await page.getByRole("button", { name: "Filtros favoritos" }).click()
  await favoritos().getByRole("button", { name: /^Fracciones en foros/ }).click()
  await expect(page.getByPlaceholder("Buscar conversaciones, personas y mensajes")).toHaveValue("fracciones")
  await expect(page.getByRole("status").filter({ hasText: "Filtrando: Institucional" })).toBeVisible()
  await expect(lista.getByRole("button", { name: /planeación de fracciones/ })).toBeVisible()

  // Renombrar y eliminar.
  await page.getByRole("button", { name: "Filtros favoritos" }).click()
  await favoritos().getByRole("button", { name: "Renombrar Fracciones en foros" }).click()
  await favoritos().getByRole("textbox", { name: "Nuevo nombre de Fracciones en foros" }).fill("Foros: fracciones")
  await favoritos().getByRole("button", { name: "Guardar nombre" }).click()
  await expect(page.getByText("Se renombró el filtro favorito a «Foros: fracciones».")).toBeVisible()
  await favoritos().getByRole("button", { name: "Eliminar Foros: fracciones" }).click()
  await favoritos().getByRole("button", { name: "Eliminar", exact: true }).click()
  await expect(page.getByText("Se eliminó el filtro favorito «Foros: fracciones».")).toBeVisible()
  await expect(favoritos().getByText("Aún no tienes favoritos.", { exact: false })).toBeVisible()
})
