import { expect, test, type Locator, type Page } from "@playwright/test"

// QA "Formulario de planeador: redirigir al error". Contra el dev server con MSW
// (`playwright.config.ts`). La 612 del seed es editable, sumativa y con escala Numérica;
// se cambia de instrumento para ejercitar cada editor. Al guardar con el instrumento
// incompleto: aviso con "Ir al campo" + scroll/foco al PRIMER campo en rojo con su mensaje.
// `CAPTURAS_DIR` guarda capturas de cada caso.

test.describe.configure({ timeout: 240_000 })

const CAPTURAS = process.env.CAPTURAS_DIR

async function captura(page: Page, nombre: string) {
  if (CAPTURAS) await page.screenshot({ path: `${CAPTURAS}/${nombre}.png` })
}

async function abrir(page: Page, id = 612) {
  const to = `/app/planeador/actividades/${id}/editar`
  await page.goto(`/login?redirectTo=${encodeURIComponent(to)}`)
  await page.getByLabel("Correo electrónico").fill("docente@example.com")
  await page.getByLabel("Contraseña", { exact: true }).fill("password")
  await page.getByRole("button", { name: "Ingresar" }).click()
  await page.waitForURL((url) => url.pathname === to, { timeout: 60_000 })
  await expect(page.getByText("Definición Escala de Valoración")).toBeVisible({ timeout: 60_000 })
}

async function elegirInstrumento(page: Page, nombre: string) {
  await page.locator("#instrumento").click()
  await page.getByRole("option", { name: nombre }).click()
}

/** Guarda y captura la vista tal como queda (sirve también para el "antes" contra dev). */
async function guardar(page: Page, caso?: string) {
  await page.getByRole("button", { name: "Guardar", exact: true }).click()
  if (caso) {
    await page.waitForTimeout(1200)
    await captura(page, `${process.env.CAPTURA_PREFIJO ?? "despues"}-guardar-${caso}`)
  }
}

/** El foco quedó en `campo`, que está en pantalla y en rojo. */
async function esperarFoco(campo: Locator) {
  await expect(campo).toBeFocused()
  await expect(campo).toHaveAttribute("aria-invalid", "true")
  await expect(campo).toBeInViewport()
}

async function llenarSiVisible(locator: Locator, valor: string) {
  if (await locator.isVisible()) await locator.fill(valor)
}

test("rúbrica: lleva al descriptor vacío del nivel 2 del criterio 1", async ({ page }) => {
  await abrir(page)
  await elegirInstrumento(page, "Rúbrica")
  await page.getByRole("button", { name: "Agregar criterio" }).first().click()
  const criterio = page.locator("li").filter({ has: page.getByRole("heading", { name: "Criterio 1" }) })
  await criterio.getByPlaceholder("Agregar").fill("Bajo")
  await criterio.getByRole("button", { name: "Agregar nivel" }).click()
  await criterio.getByPlaceholder("Agregar").fill("Alto")
  await criterio.getByRole("button", { name: "Agregar nivel" }).click()
  await criterio.getByLabel("Nombre del criterio").fill("Comprensión")
  const descriptores = criterio.getByPlaceholder("Describe el desempeño esperado en este nivel")
  await descriptores.nth(0).fill("Reconoce algunas fracciones")
  const puntajes = criterio.getByLabel("Puntaje", { exact: true })
  await llenarSiVisible(puntajes.nth(0), "1")
  await llenarSiVisible(puntajes.nth(1), "5")
  // Se aleja la vista para comprobar que el guardado la trae de vuelta.
  await page.mouse.wheel(0, -20_000)
  await guardar(page, "rubrica-descriptor")
  await expect(page.getByRole("status").filter({ hasText: "Complete los campos" })).toContainText("Rúbrica")
  await esperarFoco(descriptores.nth(1))
  await expect(criterio.getByText("Este campo es obligatorio.")).toBeVisible()
  await captura(page, "despues-rubrica-descriptor-nivel-2")
})

// En la escala cualitativa el puntaje de cada nivel siempre es obligatorio (la rúbrica de la
// 612 cuelga de una unidad con Promedio simple, donde el backend no exige puntajes distintos).
test("escala cualitativa: puntajes repetidos marcan el puntaje concreto", async ({ page }) => {
  await abrir(page)
  await page.getByText("Cualitativa", { exact: true }).click()
  const criterios = page.getByTestId("escala-criterio")
  for (const i of [0, 1]) {
    await criterios.nth(i).getByLabel("Nombre del criterio *").fill(i === 0 ? "Exactitud" : "Procedimiento")
    const niveles = criterios.nth(i).getByTestId("escala-nivel")
    const n = await niveles.count()
    for (let j = 0; j < n; j++) await niveles.nth(j).getByLabel("Descriptor *").fill("Desempeño " + (j + 1))
  }
  const niveles = criterios.nth(1).getByTestId("escala-nivel")
  const valor = await niveles.nth(0).getByLabel("Puntaje *").inputValue()
  await niveles.nth(1).getByLabel("Puntaje *").fill(valor)
  await guardar(page, "escala-puntaje-repetido")
  await esperarFoco(niveles.nth(0).getByLabel("Puntaje *"))
  await expect(criterios.nth(1).getByText("Otro nivel de este criterio ya tiene este puntaje.")).toHaveCount(2)
  await captura(page, "despues-escala-puntaje-repetido")
})

test("lista de cotejo: lleva al puntaje del ítem cuando todo suma 0", async ({ page }) => {
  await abrir(page)
  await elegirInstrumento(page, "Lista de cotejo")
  await page.getByRole("button", { name: "Agregar ítem" }).first().click()
  await page.getByLabel("Descripción del elemento").fill("Simplifica la fracción")
  const puntaje = page.getByLabel("Puntaje del elemento")
  await puntaje.fill("0")
  await page.mouse.wheel(0, -20_000)
  await guardar(page, "cotejo-cero")
  await expect(page.getByRole("status").filter({ hasText: "Complete los campos" })).toContainText("Lista de cotejo")
  await esperarFoco(puntaje)
  await expect(page.getByText("Todos los ítems tienen puntaje 0")).toBeVisible()
  await captura(page, "despues-cotejo-puntaje-cero")
})

test("lista de cotejo: lleva a la descripción vacía del ítem", async ({ page }) => {
  await abrir(page)
  await elegirInstrumento(page, "Lista de cotejo")
  await page.getByRole("button", { name: "Agregar ítem" }).first().click()
  await llenarSiVisible(page.getByLabel("Puntaje del elemento"), "5")
  await guardar(page, "cotejo-descripcion")
  await esperarFoco(page.getByLabel("Descripción del elemento"))
})

test("escala numérica: lleva al valor máximo de más de tres cifras y al nombre repetido", async ({ page }) => {
  await abrir(page)
  const criterios = page.getByTestId("escala-criterio")
  const maximo = criterios.nth(1).getByLabel("Valor máximo *")
  await maximo.fill("1000")
  await page.mouse.wheel(0, -20_000)
  await guardar(page, "escala-tres-cifras")
  await expect(page.getByRole("status").filter({ hasText: "Complete los campos" })).toContainText("Escala de valoración")
  await esperarFoco(maximo)
  await expect(criterios.nth(1).getByText("Debe ser un número de hasta tres cifras.")).toBeVisible()
  await captura(page, "despues-escala-numerica-tres-cifras")

  await maximo.fill("10")
  const nombre1 = await criterios.nth(0).getByLabel("Nombre del criterio *").inputValue()
  const nombre2 = criterios.nth(1).getByLabel("Nombre del criterio *")
  await nombre2.fill(nombre1.toUpperCase())
  await guardar(page, "escala-nombre-repetido")
  await esperarFoco(criterios.nth(0).getByLabel("Nombre del criterio *"))
  await expect(page.getByText("Otro criterio de la escala ya tiene este nombre.")).toHaveCount(2)
})

test("escala cualitativa: lleva al descriptor vacío del criterio", async ({ page }) => {
  await abrir(page)
  await page.getByText("Cualitativa", { exact: true }).click()
  const criterio = page.getByTestId("escala-criterio").nth(0)
  await expect(criterio.getByTestId("escala-nivel").first()).toBeVisible()
  await guardar(page, "escala-cualitativa")
  await esperarFoco(criterio.getByTestId("escala-nivel").nth(0).getByLabel("Descriptor *"))
  await captura(page, "despues-escala-cualitativa-descriptor")
})

test("Otro: lleva al tipo de evidencia esperada y el botón 'Ir al campo' vuelve a llevar", async ({ page }) => {
  await abrir(page)
  await elegirInstrumento(page, "Otro (personalizado)")
  await guardar(page, "otro-tipo-evidencia")
  const tipo = page.locator("#instrumentoPersonalizado-tipo-evidencia")
  await esperarFoco(tipo)
  await expect(page.getByRole("status").filter({ hasText: "Complete los campos" })).toContainText("Instrumento personalizado")
  await captura(page, "despues-otro-tipo-evidencia")
  // El docente se fue a otro lado: el botón del aviso lo devuelve al campo.
  await page.locator("#nombre").focus()
  await page.mouse.wheel(0, -20_000)
  await page.getByRole("button", { name: "Ir al campo" }).click()
  await esperarFoco(tipo)
})

test("observaciones del docente: contador y caracteres no permitidos", async ({ page }) => {
  await abrir(page)
  // Seguimiento (y sus observaciones) solo aparece con alguna adaptación.
  await page.getByRole("button", { name: "Agregar adaptación" }).click()
  const observaciones = page.getByLabel("Observaciones del docente")
  await observaciones.fill("Revisar <tarea> #2")
  await expect(page.getByText("18/500", { exact: true })).toBeVisible()
  await expect(observaciones).toHaveAttribute("maxlength", "500")
  await observaciones.blur()
  await expect(page.getByText(/Quita: "<" ">" "#"/)).toBeVisible()
  await observaciones.scrollIntoViewIfNeeded()
  await captura(page, "despues-observaciones-contador-caracteres")
})
