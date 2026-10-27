import { expect, test, type Page } from "@playwright/test"

// Bug: el "Rótulo de Ejecución" del referente curricular se mostraba en
// minúscula ("Nombre de la tareas") aunque el usuario lo escribió "Tareas".
// Debe mostrarse EXACTAMENTE como se escribió y con artículos concordados en
// número ("Nombre de las Tareas"). El rótulo se fuerza en el mock con
// `localStorage["ce-mock-rotulo-ejecucion"]` (ver `mocks/handlers/planeador.ts`).

const ROTULO = "Tareas"
const SHOTS = process.env.ROTULO_SHOTS_DIR

test.describe.configure({ timeout: 240_000 })

async function login(page: Page, to: string) {
  await page.goto(`/login?redirectTo=${encodeURIComponent(to)}`)
  await page.getByLabel("Correo electrónico").fill("docente@example.com")
  await page.getByLabel("Contraseña", { exact: true }).fill("password")
  await page.getByRole("button", { name: "Ingresar" }).click()
  await page.waitForURL((url) => url.pathname.startsWith("/app/"))
}

test.beforeEach(async ({ page }) => {
  await page.goto("/login")
  await page.evaluate(
    (rotulo) =>
      new Promise<void>((resolve) => {
        sessionStorage.clear()
        localStorage.clear()
        localStorage.setItem("ce-mock-rotulo-ejecucion", rotulo)
        const req = indexedDB.deleteDatabase("ce-offline")
        req.onsuccess = req.onerror = req.onblocked = () => resolve()
      }),
    ROTULO,
  )
})

test("el rótulo de ejecución se muestra tal cual lo escribió el usuario", async ({ page }) => {
  await login(page, "/app/planeador/actividades")
  const nuevo = page.getByRole("button", { name: `Nuevas ${ROTULO}` }).or(page.getByRole("link", { name: `Nuevas ${ROTULO}` }))
  await expect(nuevo.first()).toBeVisible({ timeout: 60_000 })
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/listado.png` })

  await nuevo.first().click()
  await page.waitForURL((url) => url.pathname.endsWith("/planeador/actividades/agregar"))
  await expect(page.getByText(`Nombre de las ${ROTULO}`, { exact: false }).first()).toBeVisible({ timeout: 60_000 })
  await expect(page.getByText(`Tipo de ${ROTULO}`, { exact: false }).first()).toBeVisible()
  // Nunca en minúscula forzada ni con el artículo singular.
  await expect(page.getByText("de la tareas")).toHaveCount(0)
  await expect(page.getByText(/Nombre de la tareas|Tipo de tareas/)).toHaveCount(0)
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/formulario.png`, fullPage: false })
})
