import { expect, test, type Page } from "@playwright/test"

// "Añadir personas a …" (QA acudiente): el buscador, los selectores de
// Grado/Grupo/Rol y las X de las filas se salían por la derecha del panel.
// Nada del diálogo puede pasar su borde derecho en 360, 768 y 1280 px.
test.setTimeout(180_000)
const CHAT = "/app/comunicaciones/chat"

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
  await page.waitForURL((u) => u.pathname.startsWith("/app"), { timeout: 30_000 })
}

async function crearGrupo(page: Page, nombre: string) {
  return page.evaluate(async (nombre) => {
    const b64 = btoa(JSON.stringify({ sub: "admin@example.com" })).replace(/=+$/, "")
    const r = await fetch("/api/eval-col/comunicaciones/conversaciones", {
      method: "POST",
      headers: { Authorization: `Bearer x.${b64}.`, "Content-Type": "application/json" },
      body: JSON.stringify({ NOMBRE: nombre, TIPO: "GRUPO", MIEMBROS: [2, 4] }),
    })
    return ((await r.json()) as { rows: { id: number }[] }).rows[0].id
  }, nombre)
}

/** Cuánto se sale el elemento más ancho del diálogo por su borde derecho (px). */
async function desborde(page: Page) {
  return page.evaluate(() => {
    const dialog = document.querySelector('[data-slot="dialog-content"]') as HTMLElement | null
    if (!dialog) return -1
    const borde = dialog.getBoundingClientRect().right
    let peor = 0
    for (const el of dialog.querySelectorAll<HTMLElement>("*")) {
      const r = el.getBoundingClientRect()
      if (r.width === 0 || r.height === 0) continue
      peor = Math.max(peor, r.right - borde)
    }
    return Math.max(peor, dialog.scrollWidth - dialog.clientWidth, document.documentElement.scrollWidth - innerWidth)
  })
}

test("el diálogo de miembros no se sale del panel en 360/768/1280", async ({ page }) => {
  await login(page, "admin@example.com")
  const nombre = `Grupo con un nombre bastante largo ${Date.now() % 10_000}`
  await crearGrupo(page, nombre)

  // El mock vive en memoria: nada de recargas (se perdería el grupo). Se abre una vez y se
  // cambia el ancho con el diálogo abierto.
  await page.getByRole("navigation", { name: "Conversaciones" }).getByRole("button", { name: new RegExp(`^${nombre}`) }).first().click()
  await page.getByRole("button", { name: /Ver los .* miembros/ }).click()
  const dialogo = page.getByRole("dialog")
  await expect(dialogo.getByRole("heading", { name: /Añadir personas a/ })).toBeVisible()
  // Elegir opciones en cada selector (las etiquetas largas eran las que empujaban).
  for (const nombreSelector of ["Grados", "Grupos académicos", "Roles"]) {
    const input = dialogo.getByRole("combobox", { name: nombreSelector })
    await input.click()
    const opciones = page.getByRole("option")
    await expect(opciones.first()).toBeVisible({ timeout: 10_000 })
    await opciones.first().click()
    if ((await opciones.count()) > 1) await opciones.nth(1).click()
    // Cerrar la lista: con el popup abierto el diálogo queda fuera del árbol accesible.
    await page.locator('[data-slot="dialog-content"] h2').click({ force: true })
    await expect(opciones).toHaveCount(0)
  }
  for (const width of [1280, 768, 360]) {
    await page.setViewportSize({ width, height: 900 })
    await page.waitForTimeout(300)
    if (process.env.E2E_SHOTS_DIR) await page.screenshot({ path: `${process.env.E2E_SHOTS_DIR}/miembros-${width}.png` })
    expect(await desborde(page), `desborde a ${width}px`).toBeLessThanOrEqual(1)
  }
})
