import { expect, test, type Page } from "@playwright/test"

// QA 71 / Regla 27: en la pestaña de criterios de la unidad, el docente edita
// y elimina SOLO los criterios que creó (antes los botones estaban siempre
// deshabilitados). Contra el dev server con MSW (`playwright.config.ts`); la
// unidad 1 del seed trae criterios de "otro docente" (p. ej. "Comprensión de
// los conceptos"). `E2E_SHOTS` = carpeta para las capturas (opcional).

const SHOTS = process.env.E2E_SHOTS
const UNIDAD = { id: 1 }

test.describe.configure({ timeout: 180_000 })

async function shot(page: Page, nombre: string) {
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/${nombre}.png` })
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

async function abrirCriterios(page: Page) {
  const to = `/app/planeador/unidades?unidad=${UNIDAD.id}`
  await page.goto(`/login?redirectTo=${encodeURIComponent(to)}`)
  await page.getByLabel("Correo electrónico").fill("docente@example.com")
  await page.getByLabel("Contraseña", { exact: true }).fill("password")
  await page.getByRole("button", { name: "Ingresar" }).click()
  await page.waitForURL((url) => url.pathname.startsWith("/app/"))
  await page.goto(to)
  await page.getByRole("tab", { name: /Rúbricas|Criterios en/ }).first().click()
  await expect(page.getByText("Comprensión de los conceptos").first()).toBeVisible({ timeout: 60_000 })
}

function fila(page: Page, texto: string) {
  return page.getByRole("row").filter({ hasText: texto }).first()
}

test("criterio ajeno: editar y eliminar deshabilitados", async ({ page }) => {
  await abrirCriterios(page)
  const ajena = fila(page, "Comprensión de los conceptos")
  await expect(ajena.getByRole("button", { name: "Editar criterio" })).toBeDisabled()
  await expect(ajena.getByRole("button", { name: "Eliminar criterio" })).toBeDisabled()
  await shot(page, "qa71-01-criterio-ajeno")
})

test("criterio propio: el autor lo edita y lo elimina", async ({ page }) => {
  await abrirCriterios(page)

  await page.getByRole("button", { name: "Agregar criterio" }).first().click()
  const alta = page.getByRole("dialog")
  await alta.getByLabel("Criterio *").fill("Criterio propio QA71")
  for (const textarea of await alta.getByPlaceholder("Agregar").all()) {
    if (!(await textarea.inputValue())) await textarea.fill("Descripción del nivel")
  }
  await alta.getByRole("button", { name: "Vincular y cerrar" }).click()
  await expect(alta).toBeHidden({ timeout: 15_000 })

  const propia = fila(page, "Criterio propio QA71")
  await expect(propia).toBeVisible({ timeout: 15_000 })
  const editar = propia.getByRole("button", { name: "Editar criterio" })
  await expect(editar).toBeEnabled()
  await editar.click({ force: true })

  const edicion = page.getByRole("dialog")
  await expect(edicion.getByRole("heading", { name: "Editar criterio" })).toBeVisible()
  await edicion.getByLabel("Criterio *").fill("Criterio propio QA71 editado")
  await edicion.getByRole("button", { name: "Guardar" }).click()
  await expect(edicion).toBeHidden({ timeout: 15_000 })
  await expect(page.getByText("El criterio se actualizó correctamente.")).toBeVisible()
  const editada = fila(page, "Criterio propio QA71 editado")
  await expect(editada).toBeVisible()
  await shot(page, "qa71-02-criterio-editado")

  await editada.getByRole("button", { name: "Eliminar criterio" }).click({ force: true })
  await page.getByRole("alertdialog").getByRole("button", { name: /Sí|Si/ }).click()
  await expect(page.getByText("El criterio se eliminó correctamente.")).toBeVisible({ timeout: 15_000 })
  await expect(page.getByText("Criterio propio QA71 editado")).toHaveCount(0)
  await shot(page, "qa71-03-criterio-eliminado")
})
