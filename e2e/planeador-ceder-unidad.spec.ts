import { expect, test, type Page } from "@playwright/test"

// Regla 27: eliminar una unidad que otros docentes usan se bloquea y se cede
// a uno de ELLOS (GET /planeador/unidades/:id/colegas), no a cualquier
// funcionario. Contra el dev server con MSW (`playwright.config.ts`); el
// seed de `mocks/db/unidades-tematicas.ts` cubre los tres casos: la 4 sin
// colegas, la 2 con uno y la 3 con varios.
// `E2E_SHOTS` = carpeta para las capturas (opcional).

const SHOTS = process.env.E2E_SHOTS

const SIN_COLEGAS = { id: 4, nombre: "Clasificación de los seres vivos" }
const UN_COLEGA = { id: 2, nombre: "Resolución de problemas con números enteros" }
const VARIOS = { id: 3, nombre: "Interpretación de gráficos estadísticos" }

test.describe.configure({ timeout: 180_000 })

async function shot(page: Page, nombre: string) {
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/${nombre}.png` })
}

async function login(page: Page, to: string) {
  await page.goto(`/login?redirectTo=${encodeURIComponent(to)}`)
  await page.getByLabel("Correo electrónico").fill("docente@example.com")
  await page.getByLabel("Contraseña", { exact: true }).fill("password")
  await page.getByRole("button", { name: "Ingresar" }).click()
  await page.waitForURL((url) => url.pathname.startsWith("/app/"))
}

/** Abre el detalle de la unidad y pulsa su "Eliminar". */
async function pedirEliminar(page: Page, unidad: { id: number; nombre: string }) {
  await login(page, `/app/planeador/unidades?unidad=${unidad.id}`)
  await page.goto(`/app/planeador/unidades?unidad=${unidad.id}`)
  const detalle = page.getByRole("heading", { name: unidad.nombre }).first()
  await expect(detalle).toBeVisible({ timeout: 60_000 })
  const eliminar = page.getByRole("button", { name: `Eliminar ${unidad.nombre}` }).last()
  await expect(eliminar).toBeEnabled({ timeout: 30_000 })
  await eliminar.click({ force: true })
  const dialogo = page.getByRole("alertdialog")
  await dialogo.getByRole("button", { name: "Si" }).click()
  return dialogo
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

test("sin colegas: se elimina directamente", async ({ page }) => {
  const dialogo = await pedirEliminar(page, SIN_COLEGAS)
  await expect(dialogo).toBeHidden({ timeout: 15_000 })
  await expect(page.getByText(/eliminad[oa] correctamente/)).toBeVisible()
  await shot(page, "1-sin-colegas-eliminada")
  const colegas = await page.evaluate(async () => (await fetch("/api/eval-col/planeador/unidades/4")).status)
  expect(colegas).toBe(404)
})

test("un colega: 'Se cederá a' con un solo botón, sin buscador, y quien cede pierde la administración", async ({
  page,
}) => {
  const dialogo = await pedirEliminar(page, UN_COLEGA)
  await expect(dialogo.getByRole("heading", { name: /No se puede eliminar/ })).toBeVisible({ timeout: 15_000 })
  await expect(dialogo.getByText(/^Se cederá a/)).toContainText("Ana María Ruiz")
  await expect(dialogo.getByText(/2 actividades/)).toBeVisible()
  await expect(dialogo.getByRole("textbox")).toHaveCount(0)
  await expect(dialogo.getByRole("radio")).toHaveCount(0)
  await shot(page, "2-un-colega-se-cedera")

  await dialogo.getByRole("button", { name: "Confirmar y ceder" }).click()
  await expect(dialogo).toBeHidden({ timeout: 15_000 })
  await expect(page.getByText(/cedid[oa] correctamente a Ana María Ruiz/)).toBeVisible()
  // Ya no es suya: sin Eliminar ni Editar para esa unidad.
  await expect(page.getByRole("button", { name: `Eliminar ${UN_COLEGA.nombre}` })).toHaveCount(0, { timeout: 15_000 })
  await expect(page.getByRole("button", { name: `Editar ${UN_COLEGA.nombre}` })).toHaveCount(0)
  await shot(page, "3-un-colega-cedida")
})

test("varios colegas: el dueño elige de la lista y cede", async ({ page }) => {
  const dialogo = await pedirEliminar(page, VARIOS)
  const opciones = dialogo.getByRole("radio")
  await expect(opciones).toHaveCount(3, { timeout: 15_000 })
  await expect(dialogo.getByText("Beatriz Gómez", { exact: true })).toBeVisible()
  await expect(dialogo.getByText("1 actividad · 2 criterios")).toBeVisible()
  await expect(dialogo.getByText("Carlos Pérez", { exact: true })).toBeVisible()
  await expect(dialogo.getByText("Diana Torres", { exact: true })).toBeVisible()
  const ceder = dialogo.getByRole("button", { name: "Ceder", exact: true })
  await expect(ceder).toBeDisabled()
  await shot(page, "4-varios-colegas-lista")

  await dialogo.getByText("Carlos Pérez", { exact: true }).click()
  await expect(ceder).toBeEnabled()
  await shot(page, "5-varios-colegas-elegido")
  await ceder.click()
  await expect(dialogo).toBeHidden({ timeout: 15_000 })
  await expect(page.getByText(/cedid[oa] correctamente a Carlos Pérez/)).toBeVisible()
  await expect(page.getByRole("button", { name: `Eliminar ${VARIOS.nombre}` })).toHaveCount(0, { timeout: 15_000 })
  await shot(page, "6-varios-colegas-cedida")
})
