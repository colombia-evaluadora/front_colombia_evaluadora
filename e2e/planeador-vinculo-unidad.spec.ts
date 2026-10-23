import { expect, test, type Page } from "@playwright/test"

// Bug de QA: al desvincular (o vincular) una actividad desde la tabla de
// actividades de una unidad temática y abrir después el detalle de la
// actividad, seguía mostrando el vínculo viejo hasta recargar: la mutación
// solo invalidaba la unidad. Contra el dev server con MSW
// (`playwright.config.ts`). 602 no tiene resultados (se puede desvincular).

const ACTIVIDAD = 602
const NOMBRE_ACTIVIDAD = "Académico Diseño de prototipo 2"
const UNIDAD = 1
const NOMBRE_UNIDAD = "Análisis de un texto argumentativo"

test.describe.configure({ timeout: 240_000 })

async function login(page: Page, to: string) {
  await page.goto(`/login?redirectTo=${encodeURIComponent(to)}`)
  await page.getByLabel("Correo electrónico").fill("docente@example.com")
  await page.getByLabel("Contraseña", { exact: true }).fill("password")
  await page.getByRole("button", { name: "Ingresar" }).click()
  await page.waitForURL((url) => url.pathname.startsWith("/app/"))
}

/**
 * Navegación del lado del cliente (conserva la caché de TanStack Query). Con
 * `search` como objeto: el router serializa `actividad: "602"` como
 * `?actividad=%22602%22`; un `?actividad=602` a mano llega como número y el
 * schema (string) lo descarta.
 */
async function ir(page: Page, to: string, search: Record<string, string>) {
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

/** El subtítulo del detalle: "<asignatura> <grado> <grupo> · <unidad> · <tipo>". */
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

test("desvincular desde la tabla de la unidad se ve en el detalle de la actividad sin recargar", async ({ page }) => {
  await login(page, "/app/planeador/actividades")
  // El login pasa por `/app`, que redirige al primer ítem del menú: esperar
  // a que aterrice para que esa redirección no pise la navegación siguiente.
  await expect(page.getByRole("region", { name: "Listado de actividades" })).toBeVisible({ timeout: 60_000 })
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

  // 1) El detalle queda en caché mostrando la unidad.
  await ir(page, "/app/planeador/actividades", { actividad: String(ACTIVIDAD) })
  await expect(subtituloDetalle(page)).toContainText(NOMBRE_UNIDAD, { timeout: 60_000 })

  // 2) Desvincular desde la tabla de actividades de la unidad.
  await ir(page, "/app/planeador/unidades", { unidad: String(UNIDAD) })
  await page.getByLabel("Detalle de la unidad temática").getByRole("tab", { name: /Actividad/ }).click({ timeout: 60_000 })
  const fila = page.getByRole("row", { name: new RegExp(NOMBRE_ACTIVIDAD) })
  await expect(fila).toBeVisible({ timeout: 60_000 })
  await fila.getByRole("button", { name: /^Desvincular / }).click()
  await page.getByRole("alertdialog").getByRole("button", { name: "Sí" }).click()
  await expect(fila).toHaveCount(0, { timeout: 30_000 })

  // 3) De vuelta al detalle (dentro del staleTime): ya sin la unidad.
  await ir(page, "/app/planeador/actividades", { actividad: String(ACTIVIDAD) })
  await expect(subtituloDetalle(page)).toBeVisible({ timeout: 60_000 })
  await expect(subtituloDetalle(page)).not.toContainText(NOMBRE_UNIDAD, { timeout: 15_000 })
})
