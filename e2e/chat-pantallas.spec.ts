import { expect, test, type Locator, type Page } from "@playwright/test"

// Recorrido pantalla por pantalla de los frames de chat del Figma (MSW): cada estado que un
// usuario puede alcanzar, como creador y como participante. Con `CHAT_CAPTURAS=<dir>` guarda una
// captura por pantalla (`app-<frame>-<estado>.png`) para el checklist de figma-chat-gap.md.
// Incluye la card 6 · Encuestas completa: crear (pasos), para quién, aviso al destinatario,
// responder, resultados del participante y del creador, y "Editar Encuesta".
test.setTimeout(240_000)
test.use({ viewport: { width: 1280, height: 832 } })
const CHAT = "/app/comunicaciones/chat"
const CAPTURAS = process.env.CHAT_CAPTURAS

async function captura(page: Page, nombre: string) {
  if (CAPTURAS) await page.screenshot({ path: `${CAPTURAS}/${nombre}.png` })
}

async function login(page: Page, email: string, primera = true) {
  if (primera) {
    await page.goto(`/login?redirectTo=${encodeURIComponent(CHAT)}`)
    await page.waitForFunction(() => !!navigator.serviceWorker?.controller, null, { timeout: 60_000 })
  }
  // El primer ingreso tras arrancar MSW a veces rebota al login: se reintenta una vez.
  for (let intento = 0; intento < 2; intento++) {
    if (!new URL(page.url()).pathname.startsWith("/login")) break
    await ingresarUnaVez(page, email)
  }
  await page.getByRole("navigation", { name: "Conversaciones" }).waitFor({ timeout: 30_000 })
}

async function ingresarUnaVez(page: Page, email: string) {
  await page.getByLabel("Correo electrónico").fill(email)
  await page.getByLabel("Contraseña", { exact: true }).fill("password")
  const compartido = page.getByRole("checkbox", { name: "Este es un equipo compartido" })
  if ((await compartido.count()) && (await compartido.isChecked()) && (await compartido.isEnabled())) {
    await compartido.click()
  }
  await page.getByRole("button", { name: "Ingresar" }).click()
  await page.waitForURL((u) => u.pathname.startsWith("/app"), { timeout: 30_000 })
  await page.waitForTimeout(1_500)
  if (new URL(page.url()).pathname.startsWith("/login")) return
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

const lista = (page: Page) => page.getByRole("navigation", { name: "Conversaciones" })
const abrir = (page: Page, nombre: string) =>
  lista(page).getByRole("button", { name: new RegExp(`^${nombre}`) }).and(page.locator(":not([aria-haspopup])")).first().click()

/** Rango de un día (hoy) en el campo "Fecha" (DateRangeField): un clic fija inicio y fin. */
async function fechaHoy(dialogo: Locator, page: Page) {
  await dialogo.getByRole("button", { name: /^Agregar$/ }).first().click()
  const dia = await page.evaluate(() => new Date().toLocaleDateString())
  await page.locator(`[data-slot=calendar] button[data-day="${dia}"]`).first().click()
  await page.keyboard.press("Escape")
}

/** "Para quién": el primer grado y todos sus estudiantes. */
async function elegirGrado(dialogo: Locator, page: Page) {
  await dialogo.getByRole("button", { name: /Selecciona grado o funcionario/ }).click()
  await page.getByRole("list", { name: "Grados" }).getByRole("button").first().click()
  await dialogo.getByText("Seleccionar todos").click()
}

test("chat: composer, adjuntar, crear foro con bienvenida, menús, archivos, documento y borradores", async ({ page }) => {
  await login(page, "admin@example.com")
  await captura(page, "app-3726-34058-inicio")

  await abrir(page, "02-docentes-general")
  await page.getByRole("button", { name: "Mostrar formato de texto" }).click()
  await captura(page, "app-3729-38181-composer-formato")
  await page.getByRole("button", { name: "Adjuntar archivo" }).click()
  await captura(page, "app-4503-66530-menu-adjuntar")
  await page.keyboard.press("Escape")

  // Hover de mensajes propio y ajeno; editar.
  const propio = page.getByRole("log").getByRole("article").filter({ hasText: "En Word está perfecto" })
  await propio.hover()
  await captura(page, "app-4487-68616-hover-propio")
  const ajeno = page.getByRole("log").getByRole("article").filter({ hasText: "Listo, ya te la adjunté" }).first()
  await ajeno.hover()
  await captura(page, "app-4481-66183-hover-ajeno")
  await propio.hover()
  await propio.getByRole("button", { name: "Editar mensaje" }).click()
  await expect(page.getByRole("dialog").getByRole("heading", { name: "Edita el mensaje" })).toBeVisible()
  await captura(page, "app-4485-66928-modal-editar")
  await page.keyboard.press("Escape")

  // Menú de la conversación y silenciar.
  await page.getByRole("button", { name: "Opciones de 02-docentes-general" }).last().click()
  await captura(page, "app-4730-72409-menu-conversacion")
  await page.getByRole("menuitem", { name: "Silenciar notificaciones" }).hover()
  await captura(page, "app-4661-70095-submenu-silenciar")
  await page.keyboard.press("Escape")
  await page.keyboard.press("Escape")

  // Votación rápida (crear).
  await page.getByRole("button", { name: "Opciones de 02-docentes-general" }).last().click()
  await page.getByRole("menuitem", { name: "Votación rápida" }).click()
  const vr = page.getByRole("dialog")
  await vr.getByLabel("Pregunta").fill("¿Suspender clases mañana?")
  await vr.getByText("Sí / No").click()
  await captura(page, "app-3873-64387-modal-votacion-rapida")
  await vr.getByRole("button", { name: "Crear" }).click()
  await expect(page.getByRole("log").getByRole("article", { name: /Votación rápida: ¿Suspender clases mañana\?/ }).last()).toBeVisible()
  await captura(page, "app-3873-56751-votacion-activa")

  // Crear un foro: menú de tipos, modal, bienvenida y "X se ha unido".
  await lista(page).getByRole("button", { name: "Agregar foro" }).click()
  await captura(page, "app-3813-41270-menu-tipos")
  await page.getByRole("menuitem", { name: "Foro" }).click()
  const foro = page.getByRole("dialog")
  await foro.getByPlaceholder("Por ejemplo, planificacion-presupuesto").fill("04-velit-augue")
  await captura(page, "app-3751-44233-modal-crear-foro")
  await foro.getByRole("button", { name: "Siguiente", exact: true }).click()
  const buscar = foro.getByRole("combobox").first()
  await buscar.fill("Darl")
  await page.getByRole("option", { name: /Darlene Robertson/ }).click()
  await foro.getByRole("button", { name: /Agregar|Crear/ }).last().click()
  await expect(page.getByRole("heading", { level: 2, name: "04-velit-augue" })).toBeVisible()
  await expect(page.getByRole("region", { name: "Bienvenida" })).toContainText("Te damos la bienvenida a #04-velit-augue")
  await expect(page.getByRole("log").getByText(/se ha unido a 04-velit-augue/)).toBeVisible()
  await captura(page, "app-3751-43647-3764-40899-bienvenida-union")

  // Archivos, editor y visor de documento.
  await lista(page).getByRole("button", { name: /^Archivos/ }).click()
  await expect(page.getByRole("heading", { level: 2, name: "Archivos" })).toBeVisible()
  await captura(page, "app-3734-39877-archivos")
  await page.getByRole("button", { name: "Ver planeación_fracciones.docx" }).click()
  await page.waitForTimeout(800)
  await captura(page, "app-3744-41465-visor-documento")
  await page.keyboard.press("Escape")
  await page.getByRole("button", { name: "Editar planeación_fracciones.docx" }).click()
  await expect(page.getByRole("toolbar", { name: "Formato del texto" })).toBeVisible()
  await captura(page, "app-3743-40482-editor-documento")
  await page.keyboard.press("Escape")

  // Borradores y enviados con acciones al pasar el mouse.
  await lista(page).getByRole("button", { name: /^Borradores y enviados/ }).click()
  const tarjeta = page.getByRole("article").filter({ hasText: "rúbrica" }).first()
  await tarjeta.hover()
  await expect(tarjeta.getByRole("button", { name: "Enviar ahora" })).toBeVisible()
  await captura(page, "app-3733-38331-3734-39047-borradores-hover")
})

test("card 6 · encuestas: crear con pasos y destinatarios, aviso, responder y resultados; editar", async ({ page }) => {
  const NOMBRE = "Encuesta clima escolar"
  await login(page, "admin@example.com")

  // 1. Crear (paso 1: datos; paso 2: preguntas y para quién).
  await lista(page).getByRole("button", { name: "Agregar foro" }).click()
  await page.getByRole("menuitem", { name: "Encuesta" }).click()
  const d = page.getByRole("dialog")
  await expect(d.getByRole("heading", { name: "Crear una Encuesta" })).toBeVisible()
  await captura(page, "app-3849-72675-encuesta-paso1-vacio")
  await d.getByLabel("Nombre").fill(NOMBRE)
  await fechaHoy(d, page)
  await captura(page, "app-3849-72755-encuesta-paso1-lleno")
  await d.getByRole("button", { name: "Siguiente", exact: true }).click()
  await expect(d.getByRole("heading", { name: "Agregar preguntas" })).toBeVisible()
  await captura(page, "app-3842-42784-encuesta-paso2")
  const p1 = d.getByRole("group", { name: "Pregunta 1" }).or(d.locator("[aria-label='Pregunta 1']")).first()
  await p1.getByPlaceholder("Escribe la pregunta").fill("¿Qué aspectos deberían mejorar?")
  await p1.getByRole("textbox", { name: "Opción 1 de la pregunta 1" }).fill("Infraestructura")
  await p1.getByRole("textbox", { name: "Opción 2 de la pregunta 1" }).fill("Comunicación")
  await d.getByRole("button", { name: "Agregar pregunta" }).click()
  await captura(page, "app-3846-62897-encuesta-tipos-pregunta")
  await page.getByRole("menuitem", { name: /SI\/NO|Sí \/ No|Si \/ No/i }).click()
  const p2 = d.locator("[aria-label='Pregunta 2']").first()
  await p2.getByPlaceholder("Escribe la pregunta").fill("¿Participarías en más actividades?")
  await captura(page, "app-3846-60724-encuesta-preguntas-llenas")
  // Para quién (destinatarios por grado).
  await elegirGrado(d, page)
  await captura(page, "app-encuesta-para-quien")
  await d.getByRole("button", { name: "Crear" }).click()
  await expect(page.getByRole("heading", { level: 2, name: NOMBRE })).toBeVisible()
  await captura(page, "app-4102-64928-encuesta-creador-activa")

  // 2. Editar (sin respuestas aún): "Editar Encuesta" con los datos cargados.
  await page.getByRole("button", { name: `Opciones de ${NOMBRE}` }).last().click()
  await page.getByRole("menuitem", { name: "Editar encuesta" }).click()
  const e = page.getByRole("dialog")
  await expect(e.getByRole("heading", { name: "Editar Encuesta" })).toBeVisible()
  await expect(e.getByLabel("Nombre")).toHaveValue(NOMBRE)
  await captura(page, "app-4060-63324-editar-encuesta-paso1")
  await e.getByRole("button", { name: "Siguiente", exact: true }).click()
  await captura(page, "app-4060-63421-editar-encuesta-paso2")
  await e.getByRole("button", { name: "Guardar" }).click()
  await expect(e).toHaveCount(0)
  await salirDeSesion(page)

  // 3. El destinatario recibe el aviso, responde y ve los resultados (públicos).
  await login(page, "user@example.com", false)
  await page.getByRole("button", { name: /^Notificaciones/ }).click()
  await expect(page.getByText(`Encuesta abierta: ${NOMBRE}`).first()).toBeVisible()
  await captura(page, "app-encuesta-aviso-destinatario")
  await page.keyboard.press("Escape")
  await abrir(page, NOMBRE)
  const form = page.getByRole("form", { name: `Preguntas de ${NOMBRE}` })
  await expect(form).toBeVisible()
  await captura(page, "app-3846-66590-encuesta-participante")
  await form.getByRole("checkbox").first().click()
  await form.getByRole("radio").first().click()
  await form.getByRole("button", { name: "Enviar" }).click()
  await page.getByRole("alertdialog").getByRole("button", { name: "Enviar" }).click()
  await expect(page.getByText("¡Gracias por responder!")).toBeVisible()
  await expect(page.getByRole("region", { name: `Resultados de ${NOMBRE}` })).toBeVisible()
  await captura(page, "app-encuesta-resultados-participante")
  await salirDeSesion(page)

  // 4. El creador ve los resultados con la respuesta.
  await login(page, "admin@example.com", false)
  await abrir(page, NOMBRE)
  await expect(page.getByRole("region", { name: `Resultados de ${NOMBRE}` })).toContainText("Participación")
  await captura(page, "app-4137-67293-encuesta-resultados-creador")

  // Con respuestas ya no se edita (comms-service responde 409).
  await page.getByRole("button", { name: `Opciones de ${NOMBRE}` }).last().click()
  await page.getByRole("menuitem", { name: "Editar encuesta" }).click()
  await page.getByRole("dialog").getByRole("button", { name: "Siguiente", exact: true }).click()
  await page.getByRole("dialog").getByRole("button", { name: "Guardar" }).click()
  await expect(page.getByRole("dialog").getByRole("alert")).toContainText("ya tiene respuestas")
})

test("elección: asistente, editar, votante (tarjeta, voto registrado) y resultados con ganador", async ({ page }) => {
  await login(page, "admin@example.com")
  await lista(page).getByRole("button", { name: "Agregar foro" }).click()
  await page.getByRole("menuitem", { name: "Elección" }).click()
  const d = page.getByRole("dialog")
  await d.getByLabel("Nombre").fill("Contralor 2026")
  await fechaHoy(d, page)
  await d.getByRole("combobox", { name: /Jornada/ }).click()
  // Solo las jornadas del establecimiento (`/comunicaciones/elecciones/jornadas`), no el catálogo global.
  await captura(page, "eleccion-jornadas-establecimiento")
  await expect(page.getByRole("option")).toHaveText(["Mañana", "Tarde"])
  await page.getByRole("option").first().click()
  await captura(page, "app-3846-71356-eleccion-paso1")
  await d.getByRole("button", { name: "Siguiente", exact: true }).click()
  await captura(page, "app-3822-41317-eleccion-paso2-vacio")
  await elegirGrado(d, page)
  await captura(page, "app-7162-77583-eleccion-votantes")
  await d.getByRole("button", { name: "Siguiente", exact: true }).click()
  for (const [nombre, numero] of [
    ["Laura Martínez Gómez", "20"],
    ["Sebastián Rodríguez Pérez", "98"],
  ]) {
    await d.getByLabel("Nombre").fill(nombre)
    await d.getByLabel("Número").fill(numero)
    await d.getByRole("button", { name: "Agregar" }).click()
  }
  await captura(page, "app-3848-72429-eleccion-candidatos")
  await d.getByRole("button", { name: "Crear" }).click()
  await expect(page.getByRole("heading", { level: 2, name: "Contralor 2026" })).toBeVisible()
  await captura(page, "app-3837-43815-eleccion-creador")

  // Editar antes del primer voto.
  await page.getByRole("button", { name: "Opciones de Contralor 2026" }).last().click()
  await page.getByRole("menuitem", { name: "Editar elección" }).click()
  const e = page.getByRole("dialog")
  await expect(e.getByRole("heading", { name: "Editar Elección" })).toBeVisible()
  await captura(page, "app-4058-62794-editar-eleccion")
  await e.getByRole("button", { name: "Siguiente", exact: true }).click()
  await captura(page, "app-4058-62902-editar-eleccion-candidatos")
  await e.getByRole("button", { name: "Guardar" }).click()
  await expect(e).toHaveCount(0)
  await salirDeSesion(page)

  // Votante (estudiante): tarjeta, confirmar y voto registrado.
  await login(page, "estudiante@example.com", false)
  await abrir(page, "Elección Personero 2026")
  await expect(page.getByRole("heading", { name: "Tarjeta electoral" })).toBeVisible()
  await captura(page, "app-4189-67308-eleccion-tarjeta-votante")
  await page.getByRole("button", { name: /^Votar por / }).first().click()
  await page.getByRole("alertdialog").getByRole("button", { name: "Confirmar voto" }).click()
  await expect(page.getByText("¡Tu voto ha sido registrado con éxito!")).toBeVisible()
  await captura(page, "app-7127-76707-eleccion-voto-registrado")
  await salirDeSesion(page)

  // El creador cierra el proceso: resultados con ganador; el votante también los ve.
  await login(page, "admin@example.com", false)
  await abrir(page, "Elección Personero 2026")
  await page.getByRole("button", { name: "Opciones de Elección Personero 2026" }).last().click()
  await page.getByRole("menuitem", { name: "Cerrar proceso electoral" }).click()
  await page.getByRole("alertdialog").getByRole("button").last().click()
  await expect(page.getByText(/Ganador/).first()).toBeVisible()
  await captura(page, "app-4195-69012-eleccion-ganador-creador")
  await salirDeSesion(page)
  await login(page, "estudiante@example.com", false)
  await abrir(page, "Elección Personero 2026")
  await expect(page.getByText(/Ganador/).first()).toBeVisible()
  await captura(page, "app-4770-82399-eleccion-ganador-votante")
})

test("evaluación y comunicado: crear, editar, estudiante y docente", async ({ page }) => {
  await login(page, "admin@example.com")
  // Evaluación: docente ve entregas; editar.
  await abrir(page, "Examen Matemáticas")
  await captura(page, "app-4126-67833-examen-entregas")
  await lista(page).getByRole("button", { name: "Agregar foro" }).click()
  await page.getByRole("menuitem", { name: "Evaluación en línea" }).click()
  const d = page.getByRole("dialog")
  await captura(page, "app-3864-58814-evaluacion-paso1")
  await page.keyboard.press("Escape")

  // Comunicado: crear y editar.
  await lista(page).getByRole("button", { name: "Agregar foro" }).click()
  await page.getByRole("menuitem", { name: "Comunicado" }).click()
  await d.getByLabel("Título del comunicado").fill("Reunión de padres")
  await d.getByRole("combobox", { name: "Audiencia" }).click()
  await page.getByRole("option", { name: /Padres/ }).click()
  await page.keyboard.press("Escape")
  await captura(page, "app-3886-60086-comunicado-paso1")
  await d.getByRole("button", { name: "Siguiente", exact: true }).click()
  await d.getByRole("textbox", { name: /Contenido del comunicado/ }).fill("Los esperamos el viernes a las 7:00 a. m.")
  await captura(page, "app-comunicado-paso2-editor")
  await d.getByRole("button", { name: "Crear" }).click()
  await expect(page.getByRole("heading", { level: 2, name: "Reunión de padres" })).toBeVisible()
  await captura(page, "app-3883-57269-comunicado")
  await page.getByRole("button", { name: "Opciones de Reunión de padres" }).last().click()
  await page.getByRole("menuitem", { name: "Editar comunicado" }).click()
  await expect(page.getByRole("dialog").getByRole("heading", { name: "Editar Comunicado" })).toBeVisible()
  await captura(page, "app-4062-67938-editar-comunicado")
  await page.getByRole("dialog").getByRole("button", { name: "Siguiente", exact: true }).click()
  await captura(page, "app-4062-68070-editar-comunicado-contenido")
  await page.getByRole("dialog").getByRole("button", { name: "Guardar" }).click()
  await expect(page.getByRole("dialog")).toHaveCount(0)
  await salirDeSesion(page)

  // Estudiante: examen.
  await login(page, "estudiante@example.com", false)
  await abrir(page, "Examen Matemáticas")
  const examen = page.getByRole("form", { name: "Preguntas de Examen Matemáticas" })
  await expect(examen).toBeVisible()
  await captura(page, "app-3866-65999-examen-estudiante")
  // Responde y envía: ve su entrega (nota o pendiente de calificar).
  await examen.getByRole("radio").first().click()
  await examen.getByRole("button", { name: "Enviar" }).click()
  await page.getByRole("alertdialog").getByRole("button", { name: "Enviar" }).click()
  await expect(page.getByRole("region", { name: "Tu entrega" })).toBeVisible()
  await captura(page, "app-examen-entrega-estudiante")
})
