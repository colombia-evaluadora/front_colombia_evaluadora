import { expect, test, type Page } from "@playwright/test"

// Regla 27: eliminar una unidad que otros docentes usan se bloquea y se cede
// a uno de ELLOS (GET /planeador/unidades/:id/colegas), no a cualquier
// funcionario. El diálogo consulta a los colegas al abrir. Contra el dev
// server con MSW (`playwright.config.ts`); el seed de
// `mocks/db/unidades-tematicas.ts` cubre: la 4 sin colegas, la 2 con uno y la
// 3 con varios (con buscador). "Sin cesionario válido" y "error del endpoint"
// usan el override E2E `localStorage["msw:unidad-colegas:<id>"]`.
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

/** Abre el detalle de la unidad y pulsa su "Eliminar" (sin confirmar). */
async function abrirEliminar(page: Page, unidad: { id: number; nombre: string }, antes?: () => Promise<void>) {
  await login(page, `/app/planeador/unidades?unidad=${unidad.id}`)
  await page.goto(`/app/planeador/unidades?unidad=${unidad.id}`)
  const detalle = page.getByRole("heading", { name: unidad.nombre }).first()
  await expect(detalle).toBeVisible({ timeout: 60_000 })
  const eliminar = page.getByRole("button", { name: `Eliminar ${unidad.nombre}` }).last()
  await expect(eliminar).toBeEnabled({ timeout: 30_000 })
  if (antes) await antes()
  await eliminar.click({ force: true })
  return page.getByRole("alertdialog")
}

/** Override E2E de los colegas de una unidad (ver `colegasOverrideE2E`). */
async function forzarColegas(page: Page, id: number, valor: unknown) {
  await page.evaluate(
    ([clave, v]) => localStorage.setItem(clave as string, typeof v === "string" ? v : JSON.stringify(v)),
    [`msw:unidad-colegas:${id}`, valor] as const,
  )
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
  const dialogo = await abrirEliminar(page, SIN_COLEGAS)
  await dialogo.getByRole("button", { name: "Si" }).click()
  await expect(dialogo).toBeHidden({ timeout: 15_000 })
  await expect(page.getByText(/eliminad[oa] correctamente/)).toBeVisible()
  await shot(page, "1-sin-colegas-eliminada")
  const colegas = await page.evaluate(async () => (await fetch("/api/eval-col/planeador/unidades/4")).status)
  expect(colegas).toBe(404)
})

test("un colega: 'Se cederá a' con un solo botón, sin buscador, y quien cede pierde la administración", async ({
  page,
}) => {
  const dialogo = await abrirEliminar(page, UN_COLEGA)
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

test("varios colegas: el dueño busca por nombre o documento, elige y cede", async ({ page }) => {
  const dialogo = await abrirEliminar(page, VARIOS)
  const opciones = dialogo.getByRole("radio")
  await expect(opciones).toHaveCount(3, { timeout: 15_000 })
  await expect(dialogo.getByText("Beatriz Gómez", { exact: true })).toBeVisible()
  await expect(dialogo.getByText("1 actividad · 2 criterios")).toBeVisible()
  await expect(dialogo.getByText("Carlos Pérez", { exact: true })).toBeVisible()
  await expect(dialogo.getByText("Diana Torres", { exact: true })).toBeVisible()
  const ceder = dialogo.getByRole("button", { name: "Ceder", exact: true })
  await expect(ceder).toBeDisabled()
  await shot(page, "4-varios-colegas-lista")

  const buscador = dialogo.getByRole("searchbox", { name: "Buscar docente por nombre o documento" })
  await buscador.fill("perez")
  await expect(opciones).toHaveCount(1)
  await expect(dialogo.getByText("Doc. 79111222", { exact: false })).toBeVisible()
  await shot(page, "4b-varios-colegas-busqueda-nombre")
  await buscador.fill("1.020.304")
  await expect(opciones).toHaveCount(1)
  await expect(dialogo.getByText("Beatriz Gómez", { exact: true })).toBeVisible()
  await buscador.fill("zzz")
  await expect(opciones).toHaveCount(0)
  await expect(dialogo.getByText(/Ningún docente coincide/)).toBeVisible()
  await shot(page, "4c-varios-colegas-sin-coincidencias")
  await buscador.fill("carlos")

  await dialogo.getByText("Carlos Pérez", { exact: true }).click()
  await expect(ceder).toBeEnabled()
  await shot(page, "5-varios-colegas-elegido")
  await ceder.click()
  await expect(dialogo).toBeHidden({ timeout: 15_000 })
  await expect(page.getByText(/cedid[oa] correctamente a Carlos Pérez/)).toBeVisible()
  await expect(page.getByRole("button", { name: `Eliminar ${VARIOS.nombre}` })).toHaveCount(0, { timeout: 15_000 })
  await shot(page, "6-varios-colegas-cedida")
})

test("sin cesionario válido (autores de carga masiva): sigue el flujo del dueño y no borra trabajo ajeno", async ({
  page,
}) => {
  const dialogo = await abrirEliminar(page, SIN_COLEGAS, async () => {
    // La 612 queda vinculada a la 4 como trabajo de un autor sin funcionario.
    const vinculo = await page.evaluate(async () => {
      const res = await fetch("/api/eval-col/planeador/unidades/4/actividades/612", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ PONDERACION: 0 }),
      })
      return res.status
    })
    expect(vinculo).toBe(200)
    await forzarColegas(page, SIN_COLEGAS.id, [
      { fk_tfuncionario: null, nombre: "Carga masiva", identificacion: null, actividades: 1, criterios: 0, actividad_ids: [612] },
    ])
  })
  await expect(dialogo.getByText(/¿Desea eliminar únicamente/)).toBeVisible({ timeout: 30_000 })
  await expect(dialogo.getByText(/de otros autores sin docente activo/)).toBeVisible()
  await expect(dialogo.getByRole("button", { name: /Ceder/ })).toHaveCount(0)
  await shot(page, "7-sin-cesionario-flujo-duenio")

  await dialogo.getByRole("button", { name: /^Eliminar con sus/ }).click()
  await expect(dialogo).toBeHidden({ timeout: 30_000 })
  await expect(page.getByText(/eliminad[oa] correctamente/)).toBeVisible()
  // La actividad ajena sigue existiendo (solo se desvinculó).
  const estado = await page.evaluate(async () => (await fetch("/api/eval-col/planeador/actividades/612")).status)
  expect(estado).toBe(200)
  await shot(page, "8-sin-cesionario-eliminada")
})

test("si falla la consulta de colegas no se asume 'sin colegas': muestra el error y no deja eliminar", async ({
  page,
}) => {
  const dialogo = await abrirEliminar(page, SIN_COLEGAS, () => forzarColegas(page, SIN_COLEGAS.id, "error"))
  await expect(dialogo.getByText(/No se pudo verificar si otros docentes usan/)).toBeVisible({ timeout: 30_000 })
  await expect(dialogo.getByRole("button", { name: /^(Si|Eliminar)/ })).toHaveCount(0)
  await expect(dialogo.getByRole("button", { name: /Ceder/ })).toHaveCount(0)
  await expect(dialogo.getByRole("button", { name: "Reintentar" })).toBeVisible()
  await shot(page, "9-error-colegas")

  // Al recuperarse el endpoint, Reintentar sigue el flujo normal.
  await page.evaluate(() => localStorage.removeItem("msw:unidad-colegas:4"))
  await dialogo.getByRole("button", { name: "Reintentar" }).click()
  await expect(dialogo.getByRole("button", { name: "Si" })).toBeVisible({ timeout: 15_000 })
})
