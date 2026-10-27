import { expect, test, type Page } from "@playwright/test"

// Validaciones en front del formulario de unidad (alta y edición): vacíos en
// rojo con su mensaje, caracteres no permitidos, límites con contador y foco
// al primer error. Corre con MSW (`playwright.config.ts`). Con
// `UNIDAD_SHOTS_DIR` deja capturas.

const SHOTS = process.env.UNIDAD_SHOTS_DIR

test.describe.configure({ timeout: 240_000 })

async function login(page: Page, to: string) {
  await page.goto(`/login?redirectTo=${encodeURIComponent(to)}`)
  await page.getByLabel("Correo electrónico").fill("docente@example.com")
  await page.getByLabel("Contraseña", { exact: true }).fill("password")
  await page.getByRole("button", { name: "Ingresar" }).click()
  await page.waitForURL((url) => url.pathname.startsWith("/app/"))
}

async function shot(page: Page, name: string) {
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/${name}.png`, fullPage: true })
}

async function elegirPrimera(page: Page, triggerId: string) {
  await page.locator(`#${triggerId}`).click()
  const opcion = page
    .getByRole("option")
    .filter({ hasNotText: /^Seleccione$|No tienes/ })
    .first()
  await opcion.click()
}

test.beforeEach(async ({ page }) => {
  await page.goto("/login")
  await page.evaluate(
    () =>
      new Promise<void>((resolve) => {
        sessionStorage.clear()
        localStorage.clear()
        const req = indexedDB.deleteDatabase("ce-offline")
        req.onsuccess = req.onerror = req.onblocked = () => resolve()
      }),
  )
})

test("crear: vacíos, caracteres no permitidos y límites", async ({ page }) => {
  await login(page, "/app/planeador/unidades/agregar")
  await expect(page.locator("#unidad-grado")).toBeVisible({ timeout: 60_000 })
  await elegirPrimera(page, "unidad-grado")
  await elegirPrimera(page, "unidad-asignatura")

  const nombre = page.locator("#unidad-nombre")
  await expect(nombre).toBeEnabled()

  // Un objetivo agregado y luego vaciado.
  const nuevoObjetivo = page.getByPlaceholder("Escribe un nuevo objetivo")
  await nuevoObjetivo.fill("Leer textos")
  await nuevoObjetivo.press("Enter")
  await page.locator("#unidad-objetivo-0").fill("")

  // Una sección con descripción vaciada.
  await page.getByLabel("Descripción de la nueva sección").fill("Exploración")
  await page.getByLabel("Descripción de la nueva sección").press("Enter")
  await page.locator("#unidad-seccion-0-descripcion").fill("")

  // Guardar con vacíos: no envía, marca en rojo y enfoca el primero.
  await page.getByRole("button", { name: "Guardar" }).click()
  await expect(page.getByText("El nombre es obligatorio")).toBeVisible()
  await expect(nombre).toHaveAttribute("aria-invalid", "true")
  await expect(nombre).toBeFocused()
  await expect(page.getByText(/El objetivo 1 está vacío/)).toBeVisible()
  await expect(page.getByText(/La descripción de la sección 1 está vacía/)).toBeVisible()
  await expect(page).toHaveURL(/\/unidades\/agregar/)
  await shot(page, "despues-crear-vacios")

  // Caracteres no permitidos.
  await nombre.fill("Unidad #1")
  await expect(page.getByText(/El nombre solo admite letras.*Quita: "#"/)).toBeVisible()
  await page.locator("#unidad-descripcion").fill("Hola, mundo.")
  await expect(page.getByText(/La descripción solo admite.*Quita: "," "\."/)).toBeVisible()
  await page.locator("#unidad-objetivo-0").fill("Objetivo: leer")
  await expect(page.getByText(/El objetivo 1 solo admite.*Quita: ":"/)).toBeVisible()
  await page.locator("#unidad-seccion-0-titulo").fill("Fase (1)")
  await expect(page.getByText(/El título de la sección 1 solo admite/)).toBeVisible()
  await shot(page, "despues-crear-caracteres")

  // Límites: el input corta en el máximo y el contador lo muestra.
  await nombre.fill("a".repeat(160))
  await expect(nombre).toHaveValue("a".repeat(150))
  await expect(page.getByText("150/150")).toBeVisible()
  await page.locator("#unidad-objetivo-0").fill("b".repeat(260))
  await expect(page.locator("#unidad-objetivo-0")).toHaveValue("b".repeat(250))
  await expect(page.getByText("250/250")).toBeVisible()
  await shot(page, "despues-crear-limites")

  // Corregido: guarda y vuelve al listado.
  await nombre.fill("Ecosistemas del Caribe")
  await page.locator("#unidad-descripcion").fill("Proyecto de aula del niño y el pingüino")
  await page.locator("#unidad-objetivo-0").fill("Reconocer seres vivos")
  await page.locator("#unidad-seccion-0-titulo").fill("Fase uno")
  await page.locator("#unidad-seccion-0-descripcion").fill("Exploración del entorno")
  await page.getByRole("button", { name: "Guardar" }).click()
  await page.waitForURL((url) => url.pathname === "/app/planeador/unidades", { timeout: 30_000 })
})

test("editar: datos con caracteres no permitidos y vacíos", async ({ page }) => {
  await login(page, "/app/planeador/unidades/editar/1")
  const nombre = page.locator("#unidad-nombre")
  await expect(nombre).not.toHaveValue("", { timeout: 60_000 })

  await nombre.fill("")
  // Tocado (blur): el error aparece sin esperar al envío.
  await nombre.blur()
  await expect(page.getByText("El nombre es obligatorio")).toBeVisible()
  await page.getByRole("button", { name: "Guardar" }).click()
  await expect(nombre).toBeFocused()
  // La descripción del mock trae puntos: se marca como no permitida.
  await expect(page.getByText(/La descripción solo admite/)).toBeVisible()
  await expect(page.getByText(/El objetivo 1 solo admite/)).toBeVisible()
  await expect(page).toHaveURL(/\/unidades\/editar\/1/)
  await shot(page, "despues-editar-errores")

  await nombre.fill("x".repeat(170))
  await expect(nombre).toHaveValue("x".repeat(150))
  await expect(page.getByText("150/150")).toBeVisible()
})
