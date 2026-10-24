import { expect, test, type Page } from "@playwright/test"

// Reglas 40/41/42 (escala de valoración por criterio) contra el dev server con MSW
// (`playwright.config.ts`). La 606 del seed es Cualitativa con dos criterios (el segundo
// ya trae "En proceso"); la 612 es Numérica. La precarga sale del mock de
// `GET /planeador/actividades/escala-precarga` (Bajo/Básico/Alto/Superior, 0-5).
// `CAPTURAS_DIR` guarda capturas de cada paso.

test.describe.configure({ timeout: 240_000 })

const CAPTURAS = process.env.CAPTURAS_DIR

async function captura(page: Page, nombre: string) {
  if (CAPTURAS) await page.screenshot({ path: `${CAPTURAS}/${nombre}.png`, fullPage: true })
}

async function abrir(page: Page, id: number) {
  const to = `/app/planeador/actividades/${id}/editar`
  await page.goto(`/login?redirectTo=${encodeURIComponent(to)}`)
  await page.getByLabel("Correo electrónico").fill("docente@example.com")
  await page.getByLabel("Contraseña", { exact: true }).fill("password")
  await page.getByRole("button", { name: "Ingresar" }).click()
  await page.waitForURL((url) => url.pathname === to, { timeout: 60_000 })
  await expect(page.getByText("Definición Escala de Valoración")).toBeVisible({ timeout: 60_000 })
}

test("cualitativa: criterios independientes, precarga del período y valor máximo", async ({ page }) => {
  await abrir(page, 606)
  const criterios = page.getByTestId("escala-criterio")
  await expect(criterios).toHaveCount(2)
  await expect(page.getByText("Escala de Niveles")).toHaveCount(2)
  // El segundo criterio tiene "En proceso" solo para él.
  await expect(criterios.nth(1).getByTestId("escala-nivel")).toHaveCount(5)
  await expect(criterios.nth(0).getByTestId("escala-nivel")).toHaveCount(4)
  await expect(criterios.nth(0).getByLabel("Valor máximo")).toHaveValue("5")
  await criterios.first().scrollIntoViewIfNeeded()
  await captura(page, "10-cualitativa-criterios")

})

// La 606 ya tiene notas (solo lectura): el constructor se ejercita en la 612 pasándola a Cualitativa.
test("cualitativa: precarga del período por criterio y cambios solo en ese criterio", async ({ page }) => {
  await abrir(page, 612)
  const criterios = page.getByTestId("escala-criterio")
  await page.getByText("Cualitativa", { exact: true }).click()
  await page.getByRole("button", { name: "Agregar más" }).click()
  await expect(criterios).toHaveCount(3)
  // Cada criterio nace con la escala del período: etiqueta y puntaje (el descriptor no existe en el período).
  for (const i of [0, 1, 2]) {
    const niveles = criterios.nth(i).getByTestId("escala-nivel")
    await expect(niveles).toHaveCount(4)
    await expect(niveles.nth(0).getByLabel("Etiqueta")).toHaveValue("Bajo")
    await expect(niveles.nth(3).getByLabel("Etiqueta")).toHaveValue("Superior")
    await expect(niveles.nth(3).getByLabel("Puntaje *")).toHaveValue("4.9")
    await expect(criterios.nth(i).getByLabel("Valor máximo")).toHaveValue("4.9")
  }
  const nuevo = criterios.nth(2)
  const niveles = nuevo.getByTestId("escala-nivel")
  await nuevo.getByLabel("Nombre del criterio *").fill("Participación")
  await nuevo.getByRole("button", { name: "Agregar Nivel" }).click()
  await expect(niveles).toHaveCount(5)
  await niveles.nth(4).getByLabel("Etiqueta").fill("En proceso")
  await niveles.nth(4).getByLabel("Puntaje *").fill("2")
  await niveles.nth(4).getByLabel("Descriptor *").fill("Participa con apoyo")
  await niveles.nth(3).getByLabel("Puntaje *").fill("6")
  await expect(nuevo.getByLabel("Valor máximo")).toHaveValue("6")
  // Los otros criterios no cambian.
  await expect(criterios.nth(0).getByTestId("escala-nivel")).toHaveCount(4)
  await expect(criterios.nth(0).getByLabel("Valor máximo")).toHaveValue("4.9")
  await nuevo.scrollIntoViewIfNeeded()
  await captura(page, "11-cualitativa-criterio-nuevo-precargado-y-en-proceso")
})

test("numérica: valor asignado por criterio con máximo del formato de calificación", async ({ page }) => {
  await abrir(page, 612)
  const criterios = page.getByTestId("escala-criterio")
  await expect(criterios).toHaveCount(2)
  await expect(page.getByText("Valor Asignado (Escala)")).toHaveCount(2)
  await expect(criterios.nth(1).getByLabel("Valor máximo *")).toHaveValue("10")
  await page.getByRole("button", { name: "Agregar más" }).click()
  await expect(criterios).toHaveCount(3)
  await expect(criterios.nth(2).getByLabel("Valor máximo *")).toHaveValue("5")
  await expect(criterios.nth(2).getByLabel("Valor mínimo *")).toHaveValue("0")
  await expect(criterios.nth(2).getByTestId("escala-nivel")).toHaveCount(0)
  await criterios.nth(2).scrollIntoViewIfNeeded()
  await captura(page, "12-numerica-valor-asignado")
})
