import { expect, test, type Page } from "@playwright/test"

// Votación rápida y elección sin resultados en vivo (MSW): mientras están abiertas nadie ve
// conteos, porcentajes ni quién va ganando (ni quien las creó); al cerrar, el resultado final.
test.setTimeout(180_000)
test.use({ viewport: { width: 1280, height: 832 } })
const CHAT = "/app/comunicaciones/chat"

async function login(page: Page, email: string) {
  await page.goto(`/login?redirectTo=${encodeURIComponent(CHAT)}`)
  await page.waitForFunction(() => !!navigator.serviceWorker?.controller, null, { timeout: 60_000 })
  // El primer ingreso tras arrancar MSW a veces rebota al login: se reintenta una vez.
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
const abrir = (page: Page, nombre: string) =>
  lista(page).getByRole("button", { name: new RegExp(`^${nombre}`) }).and(page.locator(":not([aria-haspopup])")).first().click()

test("votación rápida: sin conteos mientras está abierta; el creador la cierra y se publica el resultado", async ({ page }) => {
  await login(page, "admin@example.com")
  await abrir(page, "02-docentes-general")
  await page.getByRole("button", { name: "Opciones de 02-docentes-general" }).last().click()
  await page.getByRole("menuitem", { name: "Votación rápida" }).click()
  const d = page.getByRole("dialog")
  await d.getByLabel("Pregunta").fill("¿Salida pedagógica el viernes?")
  await d.getByRole("button", { name: "Crear" }).click()

  const card = page.getByRole("log").getByRole("article", { name: /Votación rápida: ¿Salida pedagógica el viernes\?/ }).last()
  await expect(card).toBeVisible()
  await card.getByText("Sí", { exact: true }).click()
  await card.getByRole("button", { name: "Votar" }).click()
  await expect(card.getByText("Tu voto quedó registrado. Verás los resultados cuando se cierre.")).toBeVisible()
  // Quien la creó solo ve la participación: ni porcentajes ni barras ni conteo por opción.
  await expect(card.getByText(/1 persona ha votado/)).toBeVisible()
  await expect(card).not.toContainText("%")
  await expect(card).not.toContainText("Resultados finales")

  await card.getByRole("button", { name: "Cerrar votación" }).click()
  await page.getByRole("alertdialog").getByRole("button", { name: "Cerrar votación" }).click()
  await expect(card.getByText("Votación cerrada")).toBeVisible()
  await expect(card.getByText("Resultados finales:")).toBeVisible()
  await expect(card).toContainText("100% (1)")
  await expect(card).toContainText("Total participantes: 1")
})

test("elección: el asistente ya no ofrece resultados en tiempo real y el creador no ve conteos con la votación abierta", async ({ page }) => {
  await login(page, "admin@example.com")
  await lista(page).getByRole("button", { name: "Agregar foro" }).click()
  await page.getByRole("menuitem", { name: "Elección" }).click()
  const d = page.getByRole("dialog")
  await expect(d.getByRole("checkbox", { name: "Comentarios" })).toBeVisible()
  await expect(d.getByText("Ver resultados en tiempo real")).toHaveCount(0)
  await page.keyboard.press("Escape")

  await abrir(page, "Elección Personero 2026")
  const resultados = page.getByRole("region", { name: "Resultados de Elección Personero 2026" })
  await expect(resultados).toContainText("Los resultados se publican cuando cierre la votación")
  // Participación sí (gestiona); conteos por candidato, porcentajes y ganador no.
  await expect(resultados).toContainText("Ya votaron:")
  await expect(resultados.getByRole("meter")).toHaveCount(0)
  await expect(resultados).not.toContainText("Ganador")
})
