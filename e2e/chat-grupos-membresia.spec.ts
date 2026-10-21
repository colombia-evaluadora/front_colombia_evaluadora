import { expect, test, type Page } from "@playwright/test"

// Membresía de grupos con varias personas sobre MSW (auditoría de HU 1, 10, 11 y 12):
// - el invitado ve el grupo aparecer EN VIVO y el aviso "Te agregaron a…" en la campana;
// - los mensajes de sistema y la lista de miembros se actualizan en vivo para los demás;
// - a quien quitan, el grupo le desaparece en vivo con un aviso y le queda "Te quitaron de…";
// - el administrador quita a varios a la vez (textos "del grupo", no "del canal");
// - quien sale avisa a quienes administran (CHAT_GRUPO_SALIDA).
// La "otra persona" actúa desde la misma página con su propio token (el mock identifica por
// Bearer): así el evento llega por el socket simulado sin recargar.
test.setTimeout(240_000)
const CHAT = "/app/comunicaciones/chat"

async function login(page: Page, email: string, primera = false) {
  if (primera) {
    await page.goto(`/login?redirectTo=${encodeURIComponent(CHAT)}`)
    await page.waitForFunction(() => !!navigator.serviceWorker?.controller, null, { timeout: 60_000 })
  }
  await page.getByLabel("Correo electrónico").fill(email)
  await page.getByLabel("Contraseña", { exact: true }).fill("password")
  const compartido = page.getByRole("checkbox", { name: "Este es un equipo compartido" })
  if ((await compartido.count()) && (await compartido.isChecked()) && (await compartido.isEnabled())) {
    await compartido.click()
  }
  await page.getByRole("button", { name: "Ingresar" }).click()
  await page.waitForURL((u) => u.pathname.startsWith("/app"), { timeout: 30_000 })
  if (!page.url().includes(CHAT)) {
    const link = page.locator(`a[href="${CHAT}"]`).first()
    if (!(await link.isVisible().catch(() => false))) {
      await page.getByRole("button", { name: "Gestión comunicaciones" }).click()
    }
    await link.click()
  }
  await page.getByRole("navigation", { name: "Conversaciones" }).waitFor({ timeout: 30_000 })
}

async function salirDeSesion(page: Page) {
  await page.getByRole("button", { name: "Cuenta de usuario" }).click()
  await page.getByRole("menuitem", { name: "Cerrar sesión" }).click()
  await page.waitForURL((u) => u.pathname === "/login")
}

/** Llamada al mock como otra persona (token con su `sub`). */
async function como<T = unknown>(page: Page, email: string, metodo: string, ruta: string, cuerpo?: unknown) {
  return page.evaluate(
    async ({ email, metodo, ruta, cuerpo }) => {
      const b64 = btoa(JSON.stringify({ sub: email })).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")
      const r = await fetch(`/api/eval-col/comunicaciones/${ruta}`, {
        method: metodo,
        headers: { Authorization: `Bearer x.${b64}.`, "Content-Type": "application/json" },
        body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo),
      })
      return (await r.json()) as { rows: T[] }
    },
    { email, metodo, ruta, cuerpo },
  )
}

const lista = (page: Page) => page.getByRole("navigation", { name: "Conversaciones" })
const enLista = (page: Page, nombre: string) =>
  lista(page).getByRole("button", { name: new RegExp(`^${nombre}`) }).and(page.locator(":not([aria-haspopup])"))
const campana = (page: Page) => page.getByRole("button", { name: /^Notificaciones/ })

test("membresía de grupos en vivo: agregar, quitar (varios), salir y avisos en la campana", async ({ page }) => {
  const GRUPO = `Feria en vivo ${Date.now() % 10_000}`

  // 1. Darlene tiene el chat abierto; Andrés crea el grupo con ella y con Marta.
  await login(page, "docente@example.com", true)
  await expect(enLista(page, GRUPO)).toHaveCount(0)
  const creado = await como<{ id: number }>(page, "admin@example.com", "POST", "conversaciones", {
    NOMBRE: GRUPO,
    TIPO: "GRUPO",
    MIEMBROS: [2, 3],
  })
  const id = creado.rows[0].id

  // Aparece en vivo (sin recargar) y llega el aviso a la campana.
  await expect(enLista(page, GRUPO)).toHaveCount(1, { timeout: 15_000 })
  await campana(page).click()
  await expect(page.getByText(`Te agregaron a ${GRUPO}`).first()).toBeVisible()
  await page.keyboard.press("Escape")

  // 2. Con el grupo abierto: Andrés agrega a Fernney → mensaje de sistema y miembros en vivo.
  await enLista(page, GRUPO).click()
  await expect(page.getByRole("heading", { level: 2, name: GRUPO })).toBeVisible()
  await como(page, "admin@example.com", "POST", `conversaciones/${id}/miembros`, { MIEMBROS: [4] })
  await expect(page.getByRole("log").getByText(/Fernney Antonio Jaramillo Gomez/)).toBeVisible({ timeout: 15_000 })
  await expect(page.getByRole("button", { name: /Ver los 4 miembros/ })).toBeVisible({ timeout: 15_000 })

  // 3. Andrés quita a Darlene: el grupo se le cierra en vivo con un aviso.
  await como(page, "admin@example.com", "PATCH", `conversaciones/${id}/miembros/2/eliminar`, {})
  await expect(page.getByText(`Te quitaron de ${GRUPO}.`)).toBeVisible({ timeout: 15_000 })
  await expect(enLista(page, GRUPO)).toHaveCount(0)
  await campana(page).click()
  await expect(page.getByText(`Te quitaron de ${GRUPO}`).first()).toBeVisible()
  await page.keyboard.press("Escape")
  await salirDeSesion(page)

  // 4. Andrés quita a varios a la vez desde el diálogo (textos de grupo, no de canal).
  await login(page, "admin@example.com")
  await enLista(page, GRUPO).click()
  await page.getByRole("button", { name: /Ver los .* miembros/ }).click()
  const dialogo = page.getByRole("dialog")
  await dialogo.getByRole("checkbox", { name: "Seleccionar a Marta Lucía Ríos" }).click()
  await dialogo.getByRole("checkbox", { name: "Seleccionar a Fernney Antonio Jaramillo Gomez" }).click()
  await dialogo.getByRole("button", { name: "Quitar seleccionados" }).click()
  const confirmar = page.getByRole("alertdialog")
  await expect(confirmar.getByRole("heading", { name: "¿Eliminar a 2 personas del grupo?" })).toBeVisible()
  await confirmar.getByRole("button", { name: "Eliminar", exact: true }).click()
  await expect(dialogo.getByRole("checkbox", { name: /Seleccionar a Marta/ })).toHaveCount(0)
  await expect(dialogo.getByText("Aún no hay nadie en el grupo.")).toHaveCount(0)
  await page.keyboard.press("Escape")

  // 5. Darlene (en otro grupo) sale: Andrés recibe CHAT_GRUPO_SALIDA.
  const otro = await como<{ id: number }>(page, "admin@example.com", "POST", "conversaciones", {
    NOMBRE: `${GRUPO} 2`,
    TIPO: "GRUPO",
    MIEMBROS: [2],
  })
  await como(page, "docente@example.com", "PATCH", `conversaciones/${otro.rows[0].id}/salir`, {})
  await campana(page).click()
  await expect(page.getByText(`Darlene Robertson salió de ${GRUPO} 2`).first()).toBeVisible({ timeout: 15_000 })
  await page.keyboard.press("Escape")
  await salirDeSesion(page)

  // 6. Marta tiene el aviso de que la quitaron y ya no ve el grupo.
  await login(page, "user@example.com")
  await expect(enLista(page, GRUPO)).toHaveCount(0)
  await campana(page).click()
  await expect(page.getByText(`Te quitaron de ${GRUPO}`).first()).toBeVisible()
})
