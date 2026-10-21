import { expect, test, type Page } from "@playwright/test"

// Grupos del chat con tres personas sobre MSW (`src/mocks/handlers/comunicaciones-grupos.ts`):
// admin (Andrés), docente (Darlene) y user (Marta) entran por turnos en la MISMA pestaña, sin
// recargar (la DB del mock vive en memoria): crear, añadir, escribir, recibir el aviso
// CHAT_MENSAJE, quitar y salir. Solo navegación SPA después del primer `goto`.

const CHAT = "/app/comunicaciones/chat"
const GRUPO = "Proyecto feria e2e"

/** Navegación SPA por el menú lateral (un `goto` recargaría y reiniciaría el mock). */
async function irAlChat(page: Page) {
  const link = page.locator(`a[href="${CHAT}"]`).first()
  if (!(await link.isVisible().catch(() => false))) {
    await page.getByRole("button", { name: "Gestión comunicaciones" }).click()
  }
  await link.click()
  await page.waitForURL((u) => u.pathname === CHAT)
}

async function ingresar(page: Page, email: string) {
  // El primer ingreso tras arrancar MSW a veces rebota al login: se reintenta una vez.
  for (let intento = 0; intento < 2; intento++) {
    await page.getByLabel("Correo electrónico").fill(email)
    await page.getByLabel("Contraseña", { exact: true }).fill("password")
    await page.getByRole("button", { name: "Ingresar" }).click()
    await page.waitForURL((u) => u.pathname.startsWith("/app"))
    await page.waitForTimeout(1_500)
    if (!new URL(page.url()).pathname.startsWith("/login")) break
  }
  if (!page.url().includes(CHAT)) await irAlChat(page)
  await expect(page.getByRole("heading", { name: "Chat" })).toBeVisible({ timeout: 30_000 })
}

async function salirDeSesion(page: Page) {
  await page.getByRole("button", { name: "Cuenta de usuario" }).click()
  await page.getByRole("menuitem", { name: "Cerrar sesión" }).click()
  await page.waitForURL((u) => u.pathname === "/login")
}

const grupoEnLista = (page: Page) => page.getByRole("navigation", { name: "Conversaciones" }).getByRole("button", { name: new RegExp(`^${GRUPO}`) }).and(page.locator(":not([aria-haspopup])"))


test("grupo con tres personas: crear, añadir, escribir, aviso, quitar y salir", async ({ page }) => {
  test.setTimeout(180_000)
  await page.goto(`/login?redirectTo=${encodeURIComponent(CHAT)}`)
  // MSW tiene que controlar la página antes del primer request.
  await page.waitForFunction(() => !!navigator.serviceWorker?.controller, null, { timeout: 60_000 })

  // 1. Andrés crea el grupo con Darlene y Marta y escribe.
  await ingresar(page, "admin@example.com")
  await page.getByRole("button", { name: "Crear grupo" }).click()
  await page.getByPlaceholder("Por ejemplo, Proyecto feria de ciencias").fill(GRUPO)
  await page.getByRole("button", { name: "Siguiente" }).click()
  const buscar = page.getByRole("combobox", { name: "Buscar personas" })
  for (const nombre of ["Darlene Robertson", "Marta Lucía Ríos"]) {
    await buscar.fill(nombre.split(" ")[0])
    await page.getByRole("option", { name: new RegExp(nombre) }).click()
  }
  await page.getByRole("button", { name: "Agregar" }).click()
  await expect(page.getByRole("heading", { level: 2, name: GRUPO })).toBeVisible()
  await page.getByRole("combobox", { name: /^Mensaje para/ }).fill("Hola equipo, ¿nos vemos mañana?")
  await page.keyboard.press("Enter")
  await expect(page.getByText("Hola equipo, ¿nos vemos mañana?")).toBeVisible()
  await salirDeSesion(page)

  // 2. Darlene ve el aviso agrupado y el grupo, y responde.
  await ingresar(page, "docente@example.com")
  await expect(page.getByRole("button", { name: /Notificaciones: .* sin leer/ })).toBeVisible({ timeout: 15_000 })
  await page.getByRole("button", { name: /Notificaciones: .* sin leer/ }).click()
  await expect(page.getByText(`Nuevos mensajes en ${GRUPO}`).first()).toBeVisible()
  await page.keyboard.press("Escape")
  await grupoEnLista(page).click()
  await expect(page.getByText("Hola equipo, ¿nos vemos mañana?")).toBeVisible()
  await page.getByRole("combobox", { name: /^Mensaje para/ }).fill("¡Listo!")
  await page.keyboard.press("Enter")
  await expect(page.getByText("¡Listo!")).toBeVisible()
  await salirDeSesion(page)

  // 3. Andrés quita a Marta (solo un administrador puede).
  await ingresar(page, "admin@example.com")
  await grupoEnLista(page).click()
  await page.getByRole("button", { name: /Ver los .* miembros/ }).click()
  await page.getByRole("button", { name: "Eliminar a Marta Lucía Ríos del grupo" }).click()
  await page.getByRole("button", { name: "Eliminar", exact: true }).click()
  await expect(page.getByRole("button", { name: "Eliminar a Marta Lucía Ríos del grupo" })).toHaveCount(0)
  await page.keyboard.press("Escape")
  await salirDeSesion(page)

  // 4. Marta ya no tiene el grupo.
  await ingresar(page, "user@example.com")
  await expect(page.getByRole("navigation", { name: "Conversaciones" })).toBeVisible()
  await expect(grupoEnLista(page)).toHaveCount(0)
  await salirDeSesion(page)

  // 5. Darlene sale con confirmación; un miembro no ve las acciones de administrador.
  await ingresar(page, "docente@example.com")
  await grupoEnLista(page).click()
  await page.getByRole("button", { name: /Ver los .* miembros/ }).click()
  await expect(page.getByRole("button", { name: /Eliminar a .* del grupo/ })).toHaveCount(0)
  await page.keyboard.press("Escape")
  await page.getByRole("banner").or(page.locator("main header")).getByRole("button", { name: /Más opciones|Opciones|Acciones/ }).last().click()
  await page.getByRole("menuitem", { name: "Salir del grupo" }).click()
  await page.getByRole("button", { name: "Salir del grupo" }).click()
  await expect(grupoEnLista(page)).toHaveCount(0)
})
