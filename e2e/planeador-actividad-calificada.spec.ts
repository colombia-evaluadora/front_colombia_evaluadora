import { expect, test, type Page } from "@playwright/test"

// Regla 37 (QA "No debería dejar editarla si ya tiene notas calificadas"):
// una actividad con resultados se abre en solo lectura con el motivo, sin
// "Guardar", y en la tabla de su unidad no se le cambia el peso ni se
// desvincula. Contra el dev server con MSW (`playwright.config.ts`): en el
// seed, 601 tiene 12 evaluados y está en la unidad 1; 602 no tiene ninguno.
// El último caso es el del QA: calificar y volver a la edición dentro del
// staleTime del detalle mostraba el formulario editable.

const MOTIVO = 'No puedes editar esta actividad porque ya tiene calificaciones, observaciones o "No presentó" registrados.'

async function login(page: Page, to: string) {
  await page.goto(`/login?redirectTo=${encodeURIComponent(to)}`)
  await page.getByLabel("Correo electrónico").fill("docente@example.com")
  await page.getByLabel("Contraseña", { exact: true }).fill("password")
  await page.getByRole("button", { name: "Ingresar" }).click()
  await page.waitForURL((url) => url.pathname.startsWith("/app/"))
}

// El primer arranque del dev server (deps de Vite + MSW) se come buena parte
// del minuto por defecto.
test.describe.configure({ timeout: 150_000 })

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

test("una actividad calificada abre en solo lectura, con el motivo y sin Guardar", async ({ page }) => {
  await login(page, "/app/planeador/actividades/601/editar")
  await page.goto("/app/planeador/actividades/601/editar")

  await expect(page.getByText(MOTIVO)).toBeVisible({ timeout: 60_000 })
  await expect(page.locator("#nombre")).toBeDisabled()
  // Ningún campo del formulario queda escribible (recuperación incluida).
  const editables = page.locator(
    "#editar-actividad-form :is(input, textarea):not([disabled]):not([type=hidden]):not([aria-hidden=true])",
  )
  await expect(editables).toHaveCount(0)
  await expect(page.getByRole("button", { name: "Guardar", exact: true })).toHaveCount(0)
})

test("una recuperación calificada también: la sección de recuperación queda bloqueada", async ({ page }) => {
  // 604 es la única recuperación del seed y tiene 8 evaluados.
  await login(page, "/app/planeador/actividades/604/editar")
  await page.goto("/app/planeador/actividades/604/editar")

  await expect(page.getByText(MOTIVO)).toBeVisible({ timeout: 60_000 })
  await expect(page.getByRole("switch", { name: /Es una recuperación/ })).toBeDisabled()
  const editables = page.locator(
    "#editar-actividad-form :is(input, textarea):not([disabled]):not([type=hidden]):not([aria-hidden=true])",
  )
  await expect(editables).toHaveCount(0)
  await expect(page.getByRole("button", { name: "Guardar", exact: true })).toHaveCount(0)
})

test("una actividad sin resultados sigue editable", async ({ page }) => {
  await login(page, "/app/planeador/actividades/602/editar")
  await page.goto("/app/planeador/actividades/602/editar")

  await expect(page.locator("#nombre")).toBeEnabled({ timeout: 60_000 })
  await expect(page.getByText(MOTIVO)).toHaveCount(0)
  await page.locator("#nombre").fill("Taller editado")
  await expect(page.getByRole("button", { name: "Guardar", exact: true })).toBeVisible()
})

test("en la unidad, el peso, Editar y Desvincular de una actividad calificada quedan bloqueados con el motivo", async ({
  page,
}) => {
  await login(page, "/app/planeador/unidades?unidad=1")
  await page.goto("/app/planeador/unidades?unidad=1")
  await page.getByLabel("Detalle de la unidad temática").getByRole("tab", { name: /Actividad/ }).click({ timeout: 30_000 })

  const fila = page.getByRole("row", { name: /Proyecto final: Diseño de prototipo 1/ })
  await expect(fila).toBeVisible({ timeout: 60_000 })
  // El "(%)" no se abre para editar: es un valor con el motivo en el tooltip.
  const peso = fila.locator('span[aria-disabled="true"]').first()
  await expect(peso).toHaveText("25")
  await peso.hover()
  await expect(page.getByRole("tooltip").or(page.locator("[data-slot=tooltip-content]")).first()).toContainText(
    "No puedes editar esta actividad",
  )
  await expect(fila.getByRole("button", { name: MOTIVO }).first()).toHaveAttribute("aria-disabled", "true")
  await expect(fila.getByRole("button", { name: /^Desvincular .*: No puedes editar/ })).toHaveAttribute(
    "aria-disabled",
    "true",
  )
})

test("calificar y volver enseguida a la edición: sale bloqueada aunque el detalle siga en caché", async ({ page }) => {
  await login(page, "/app/planeador/actividades/602/editar")
  await page.goto("/app/planeador/actividades/602/editar")
  await expect(page.locator("#nombre")).toBeEnabled({ timeout: 60_000 })

  // Navegación del lado del cliente: el detalle de 602 queda en la caché de
  // TanStack Query, "fresco" por su staleTime de 60 s.
  await page.getByRole("button", { name: "Cerrar", exact: true }).click()
  await page.waitForURL((url) => url.pathname === "/app/planeador/actividades")
  // Que la edición se haya desmontado de verdad (el listado es un chunk lazy:
  // mientras carga, el router sigue pintando la ruta anterior).
  await expect(page.locator("#nombre")).toHaveCount(0, { timeout: 60_000 })

  // La primera calificación llega por otro lado (la planilla, otro equipo):
  // nada invalida ese detalle.
  const calificado = await page.evaluate(async () => {
    for (let estudiante = 1; estudiante <= 10; estudiante++) {
      const res = await fetch(`/api/eval-col/planeador/actividades/estudiantes/${602000 + estudiante}/calificar`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ CALIFICACION: JSON.stringify({ valorNumerico: 4 }), FECHA: "2026-08-20" }),
      })
      if (res.ok) return true
    }
    return false
  })
  expect(calificado).toBe(true)

  await page.goBack()
  await page.waitForURL((url) => url.pathname === "/app/planeador/actividades/602/editar")
  await expect(page.getByText(MOTIVO)).toBeVisible({ timeout: 60_000 })
  await expect(page.locator("#nombre")).toBeDisabled()
  await expect(page.getByRole("button", { name: "Guardar", exact: true })).toHaveCount(0)
})
