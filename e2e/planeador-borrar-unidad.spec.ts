import { expect, test, type Page } from "@playwright/test"

// Bug de QA: al BORRAR una unidad temática, el calendario/rail de
// actividades, las cards y el detalle de las actividades vinculadas seguían
// mostrando la unidad hasta recargar: `useDeleteUnidad` solo invalidaba los
// listados de unidades. El backend (`fn_unidad_eliminar_interno`, sso V492.2)
// desvincula las actividades del dueño, y el mock hace lo mismo. Contra el
// dev server con MSW (`playwright.config.ts`).

const ACTIVIDAD = 602
const NOMBRE_ACTIVIDAD = "Académico Diseño de prototipo 2"
const UNIDAD = 1
const NOMBRE_UNIDAD = "Análisis de un texto argumentativo"
const CAPTURAS = process.env.E2E_CAPTURAS_DIR

test.describe.configure({ timeout: 240_000 })

async function login(page: Page, to: string) {
  await page.goto(`/login?redirectTo=${encodeURIComponent(to)}`)
  await page.getByLabel("Correo electrónico").fill("docente@example.com")
  await page.getByLabel("Contraseña", { exact: true }).fill("password")
  await page.getByRole("button", { name: "Ingresar" }).click()
  await page.waitForURL((url) => url.pathname.startsWith("/app/"))
}

/** Navegación del lado del cliente: conserva la caché de TanStack Query. */
async function ir(page: Page, to: string, search: Record<string, string> = {}) {
  await page.evaluate(
    async ({ to, search }) => {
      const router = (window as unknown as {
        __ceRouter: { navigate(o: { to: string; search: Record<string, string> }): Promise<void> }
      }).__ceRouter
      await router.navigate({ to, search })
    },
    { to, search },
  )
  await page.waitForURL((url) => url.pathname === to, { timeout: 30_000 })
}

async function capturar(page: Page, nombre: string) {
  if (CAPTURAS) await page.screenshot({ path: `${CAPTURAS}/${nombre}.png`, fullPage: true })
}

const subtituloDetalle = (page: Page) =>
  page.getByRole("heading", { name: NOMBRE_ACTIVIDAD, level: 2 }).locator("xpath=following-sibling::p[1]")

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

test("borrar una unidad se refleja en el calendario y en el detalle de sus actividades sin recargar", async ({
  page,
}) => {
  await login(page, "/app/planeador/actividades")
  const listado = page.getByRole("region", { name: "Listado de actividades" })
  await expect(listado).toBeVisible({ timeout: 60_000 })
  // Vínculo de partida (por la API, como si lo hubiera hecho otra pantalla).
  const vinculo = await page.evaluate(
    async ({ unidad, actividad }) => {
      const res = await fetch(`/api/eval-col/planeador/unidades/${unidad}/actividades/${actividad}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ PONDERACION: 10, PERMITIR_MOVER_DE_UNIDAD: false }),
      })
      return res.status
    },
    { unidad: UNIDAD, actividad: ACTIVIDAD },
  )
  expect(vinculo).toBe(200)

  // 1) Calendario + detalle de la actividad en caché, mostrando la unidad.
  await ir(page, "/app/planeador/actividades", { actividad: String(ACTIVIDAD) })
  await expect(subtituloDetalle(page)).toContainText(NOMBRE_UNIDAD, { timeout: 60_000 })
  await capturar(page, "1-antes-detalle-con-unidad")

  // 2) Borrar la unidad desde su detalle.
  await ir(page, "/app/planeador/unidades", { unidad: String(UNIDAD) })
  const panel = page.getByLabel("Detalle de la unidad temática")
  await panel.getByRole("button", { name: `Eliminar ${NOMBRE_UNIDAD}` }).click({ timeout: 60_000 })
  const confirmar = page.getByRole("alertdialog")
  await capturar(page, "2-confirmar-borrado")
  await confirmar.getByRole("button", { name: "Si" }).click()
  await expect(confirmar).toHaveCount(0, { timeout: 30_000 })
  await expect(page.getByRole("button", { name: `Ver detalle de ${NOMBRE_UNIDAD}` })).toHaveCount(0, {
    timeout: 30_000,
  })
  await capturar(page, "3-unidades-sin-la-borrada")

  // 3) De vuelta al calendario (dentro del staleTime, sin recargar): el
  // detalle de la actividad ya no muestra la unidad borrada.
  await ir(page, "/app/planeador/actividades", { actividad: String(ACTIVIDAD) })
  await expect(subtituloDetalle(page)).toBeVisible({ timeout: 60_000 })
  await expect(subtituloDetalle(page)).not.toContainText(NOMBRE_UNIDAD, { timeout: 15_000 })
  await ir(page, "/app/planeador/actividades")
  await expect(listado).toBeVisible({ timeout: 60_000 })
  await expect(listado).not.toContainText(NOMBRE_UNIDAD)
  await capturar(page, "4-calendario-despues")
})
