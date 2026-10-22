import { expect, test, type Page } from "@playwright/test"

// Decisiones de Natalia sobre los grupos del chat, sobre MSW (`comunicaciones-grupos.ts` +
// `db/comunicaciones-seleccion.ts`), en la MISMA pestaña y sin recargar:
// - en el selector de personas se agrega también por grupo académico y rol, con confirmación
//   del conteo ("Se agregarán 13 personas") y sin acudientes (nota visible);
// - solo quien crea el grupo lo gestiona: no existe "Hacer administrador", y un miembro no ve
//   el buscador ni las acciones de quitar.
const CHAT = "/app/comunicaciones/chat"
const GRUPO = `Sexto y profes ${Date.now() % 10_000}`

async function irAlChat(page: Page) {
  const link = page.locator(`a[href="${CHAT}"]`).first()
  if (!(await link.isVisible().catch(() => false))) {
    await page.getByRole("button", { name: "Gestión comunicaciones" }).click()
  }
  await link.click()
  await page.waitForURL((u) => u.pathname === CHAT)
}

async function ingresar(page: Page, email: string) {
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

const grupoEnLista = (page: Page) =>
  page
    .getByRole("navigation", { name: "Conversaciones" })
    .getByRole("button", { name: new RegExp(`^${GRUPO}`) })
    .and(page.locator(":not([aria-haspopup])"))

async function elegir(page: Page, campo: string, texto: string, opcion: RegExp) {
  const combo = page.getByRole("combobox", { name: campo, exact: true })
  await combo.click()
  await combo.fill(texto)
  await page.getByRole("option", { name: opcion }).click()
  // Cerrar la lista sin Escape (cerraría también el diálogo).
  await page.getByRole("dialog").getByRole("heading").first().click()
}

test("alta masiva por grupo y rol con confirmación; solo el creador gestiona", async ({ page }) => {
  test.setTimeout(180_000)
  await page.goto(`/login?redirectTo=${encodeURIComponent(CHAT)}`)
  await page.waitForFunction(() => !!navigator.serviceWorker?.controller, null, { timeout: 60_000 })

  // 1. Andrés crea el grupo con Sexto 601 y todos los docentes.
  await ingresar(page, "admin@example.com")
  await page.getByRole("button", { name: "Crear grupo" }).click()
  await page.getByPlaceholder("Por ejemplo, Proyecto feria de ciencias").fill(GRUPO)
  await page.getByRole("button", { name: "Siguiente" }).click()
  await expect(page.getByText("Los acudientes no se agregan por ahora")).toBeVisible()
  await elegir(page, "Grupos académicos", "601", /Sexto 601/)
  await elegir(page, "Roles", "Doc", /Docente/)
  await page.getByRole("button", { name: "Agregar", exact: true }).click()

  // 2. Confirmación con el conteo que resolvió el servidor (sin duplicados ni acudientes).
  const confirmar = page.getByRole("alertdialog")
  await expect(confirmar.getByRole("heading", { name: "Se agregarán 13 personas." })).toBeVisible()
  await expect(confirmar.getByText(/Grupo Sexto 601 · Sede principal, rol Docente/)).toBeVisible()
  await confirmar.getByRole("button", { name: "Agregar" }).click()
  await expect(page.getByRole("heading", { level: 2, name: GRUPO })).toBeVisible()
  await expect(page.getByText(`agregó a 13 personas a ${GRUPO}`)).toBeVisible()

  // 3. El creador gestiona pero no nombra administradores: no existe "Hacer administrador".
  await page.getByRole("button", { name: /Ver los .* miembros/ }).click()
  // La lista se pagina (6 por página): basta con que haya acciones de quitar.
  await expect(page.getByRole("button", { name: /Eliminar a .* del grupo/ }).first()).toBeVisible()
  await expect(page.getByRole("button", { name: /Hacer administrador/ })).toHaveCount(0)
  await expect(page.getByRole("combobox", { name: "Grados", exact: true })).toBeVisible()
  await page.keyboard.press("Escape")
  await salirDeSesion(page)

  // 4. Darlene (miembro) no gestiona: ni buscador, ni selector grupal, ni quitar, ni promover.
  await ingresar(page, "docente@example.com")
  await grupoEnLista(page).click()
  await page.getByRole("button", { name: /Ver los .* miembros/ }).click()
  await expect(page.getByRole("dialog").getByText("Andrés").first()).toBeVisible()
  await expect(page.getByRole("button", { name: /Eliminar a .* del grupo/ })).toHaveCount(0)
  await expect(page.getByRole("button", { name: /Hacer administrador/ })).toHaveCount(0)
  await expect(page.getByRole("combobox", { name: "Buscar personas para añadir" })).toHaveCount(0)
  await expect(page.getByRole("combobox", { name: "Grados", exact: true })).toHaveCount(0)
})
