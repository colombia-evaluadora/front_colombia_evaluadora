import { expect, test, type Page } from "@playwright/test"

// Esquema aprobado de grupos (decisiones de Natalia) sobre MSW, con varias personas:
// - un acudiente entra a un grupo solo si acepta la invitación (campana, sección "Invitaciones"
//   del chat o el botón del push) y puede rechazarla; mientras tanto no ve el grupo;
// - quien crea elige descripción, imagen y quién escribe (Abierto, Solo lectura, Moderado), y el
//   compositor de los demás se habilita o no en vivo.
// No hay cuenta de acudiente en el mock (ni en testv2): la docente (Darlene, 2) se trata como
// acudiente con `ce-mock-acudientes` (ver `esAcudienteMock`).
test.setTimeout(240_000)
// El primer arranque del dev server a veces recarga la página justo al entrar (optimización de deps).
test.describe.configure({ retries: 2 })
const CHAT = "/app/comunicaciones/chat"
const CAPTURAS = process.env.CHAT_CAPTURAS

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
const captura = async (page: Page, nombre: string) => {
  if (CAPTURAS) await page.screenshot({ path: `${CAPTURAS}/${nombre}.png` })
}

test("invitaciones de acudientes, modos de escritura, descripción e imagen del grupo", async ({ page }) => {
  const GRUPO = `Padres 601 ${Date.now() % 10_000}`

  // 1. Andrés crea el grupo desde la UI: descripción, Solo lectura y la "acudiente" Darlene.
  await login(page, "admin@example.com", true)
  await page.evaluate(() => localStorage.setItem("ce-mock-acudientes", "2"))
  await page.getByRole("button", { name: "Crear grupo" }).click()
  const crear = page.getByRole("dialog")
  await crear.getByPlaceholder(/Proyecto feria/).fill(GRUPO)
  await crear.getByLabel(/Descripción/).fill("Avisos para las familias de Sexto 601")
  await crear.getByText("Solo lectura", { exact: true }).click()
  await captura(page, "01-crear-grupo-opciones")
  await crear.getByRole("button", { name: "Siguiente" }).click()
  await crear.getByRole("combobox", { name: "Buscar personas" }).fill("Darlene")
  await expect(page.getByText("Acudiente · por invitación").first()).toBeVisible()
  await page.getByRole("option", { name: /Darlene Robertson/ }).click()
  await crear.getByRole("combobox", { name: "Buscar personas" }).fill("Marta")
  await page.getByRole("option", { name: /Marta Lucía Ríos/ }).click()
  await crear.getByRole("button", { name: "Agregar" }).click()
  await expect(enLista(page, GRUPO)).toHaveCount(1, { timeout: 15_000 })
  await enLista(page, GRUPO).click()
  // Encabezado: descripción y modo; Darlene no cuenta (2 = Andrés y Marta).
  await expect(page.getByText(/Avisos para las familias de Sexto 601 · Solo lectura/)).toBeVisible()
  await expect(page.getByRole("button", { name: /Ver los 2 miembros/ })).toBeVisible()
  await page.getByRole("button", { name: /Ver los 2 miembros/ }).click()
  const miembros = page.getByRole("dialog")
  await expect(miembros.getByText("Invitación pendiente").first()).toBeVisible()
  await expect(miembros.getByLabel("Información del grupo")).toContainText("Quién escribe: Solo lectura")
  await captura(page, "02-miembros-invitacion-pendiente")
  await page.keyboard.press("Escape")
  const id = (await como<{ id: number; nombre: string }>(page, "admin@example.com", "GET", "conversaciones")).rows.find(
    (c) => c.nombre === GRUPO,
  )!.id
  await salirDeSesion(page)

  // 2. Darlene: no ve el grupo; ve la invitación en el chat y en la campana, y acepta desde la campana.
  await login(page, "docente@example.com")
  await expect(enLista(page, GRUPO)).toHaveCount(0)
  const seccion = page.getByRole("region", { name: "Invitaciones" })
  await expect(seccion.getByRole("listitem", { name: `Invitación a ${GRUPO}` })).toBeVisible()
  await captura(page, "03-seccion-invitaciones")
  await campana(page).click()
  await expect(page.getByText(`Andrés Gómez: Invitación al grupo ${GRUPO}`)).toBeVisible()
  await captura(page, "04-campana-invitacion")
  await page.getByRole("group", { name: new RegExp(`Responder: .*${GRUPO}`) }).getByRole("button", { name: "Aceptar" }).click()
  await expect(page.getByRole("heading", { level: 2, name: GRUPO })).toBeVisible({ timeout: 15_000 })
  await expect(seccion).toHaveCount(0)
  // Solo lectura: el compositor no está; en su lugar, la explicación.
  await expect(page.getByText("Este grupo es de solo lectura: solo quien lo gestiona puede escribir.")).toBeVisible()
  await captura(page, "05-solo-lectura")

  // 3. Andrés lo pasa a Moderado (Docentes y Acudientes: el front ve a Darlene como docente y el
  // mock como acudiente): el compositor se habilita en vivo.
  await como(page, "admin@example.com", "PATCH", `conversaciones/${id}`, { MODO: "MODERADO", ROLES_ESCRITURA: ["DOCENTE", "ACUDIENTE"] })
  await expect(page.getByText(/solo lectura: solo quien/)).toHaveCount(0, { timeout: 15_000 })
  await page.getByRole("combobox", { name: /^Mensaje para/ }).fill("Gracias por la invitación")
  await page.getByRole("combobox", { name: /^Mensaje para/ }).press("Enter")
  await expect(page.getByRole("log").getByText("Gracias por la invitación")).toBeVisible()
  await captura(page, "06-moderado-acudiente-escribe")

  // 4. Otra invitación llega en vivo y Darlene la rechaza desde la sección.
  const OTRO = `Otro ${GRUPO}`
  await como(page, "admin@example.com", "POST", "conversaciones", { NOMBRE: OTRO, TIPO: "GRUPO", MIEMBROS: [2, 3] })
  const tarjeta = page.getByRole("listitem", { name: `Invitación a ${OTRO}` })
  await expect(tarjeta).toBeVisible({ timeout: 15_000 })
  await tarjeta.getByRole("button", { name: "Rechazar" }).click()
  await expect(tarjeta).toHaveCount(0)
  await expect(enLista(page, OTRO)).toHaveCount(0)

  // 5. Botón "Aceptar" del push: el SW manda PUSH_CLICKED con `accion=aceptar` y la pestaña (que
  // tiene la sesión) navega y responde. Sin recargar: el mock vive en memoria de la página.
  const TERCERO = `Tercero ${GRUPO}`
  const tercero = await como<{ id: number }>(page, "admin@example.com", "POST", "conversaciones", {
    NOMBRE: TERCERO,
    TIPO: "GRUPO",
    MIEMBROS: [2, 3],
  })
  await page.evaluate((url) => {
    navigator.serviceWorker.dispatchEvent(new MessageEvent("message", { data: { type: "PUSH_CLICKED", url } }))
  }, `${CHAT}?invitacion=${tercero.rows[0].id}&accion=aceptar`)
  await expect(page.getByRole("heading", { level: 2, name: TERCERO })).toBeVisible({ timeout: 20_000 })
  await expect(page).not.toHaveURL(/accion=/)
  await salirDeSesion(page)

  // 6. Andrés ve el rechazo de B en el diálogo de miembros y edita el grupo (imagen y descripción).
  await login(page, "admin@example.com")
  await enLista(page, OTRO).click()
  await page.getByRole("button", { name: /Ver los .* miembros/ }).click()
  await expect(page.getByRole("dialog").getByText("Invitación rechazada")).toBeVisible()
  await captura(page, "07-invitacion-rechazada")
  await page.keyboard.press("Escape")
  await enLista(page, GRUPO).click()
  await expect(page.getByRole("heading", { level: 2, name: GRUPO })).toBeVisible()
  await lista(page).getByRole("button", { name: `Editar ${GRUPO}`, exact: true }).click()
  const editar = page.getByRole("dialog")
  await expect(editar.getByRole("heading", { name: "Editar grupo" })).toBeVisible()
  await editar.locator('input[type="file"]').setInputFiles({
    name: "escudo.png",
    mimeType: "image/png",
    // PNG de 1×1.
    buffer: Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=", "base64"),
  })
  await editar.getByLabel(/Descripción/).fill("Familias de Sexto 601")
  await editar.getByRole("button", { name: "Guardar cambios" }).click()
  await expect(page.getByText("Grupo actualizado.")).toBeVisible({ timeout: 15_000 })
  await expect(page.getByRole("img", { name: `Imagen de ${GRUPO}` }).first()).toBeVisible({ timeout: 15_000 })
  await expect(page.getByText(/Familias de Sexto 601 · Moderado: Docentes y Acudientes/)).toBeVisible()
  await captura(page, "08-grupo-con-imagen")
  await page.evaluate(() => localStorage.removeItem("ce-mock-acudientes"))
})
