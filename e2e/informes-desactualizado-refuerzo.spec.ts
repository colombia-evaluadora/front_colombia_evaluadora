import { expect, test, type Page } from "@playwright/test"

// Reglas 70/71 contra el dev server con MSW (`playwright.config.ts`):
// - En el seed de Informes, el informe de 5°01 (grupo 502) del Primer período
//   (201) está consolidado y DESPUÉS se aprobó un Refuerzo de Matemáticas:
//   la cabecera avisa con el texto fijo de la Regla 71 hasta reconsolidar.
// - El coordinador tiene en la campana el aviso INFORME_DESACTUALIZADO con
//   deep link a esa misma vista.
// - La actividad original con Refuerzo muestra "original / refuerzo" en la
//   planilla de Informes y en la del Planeador (con el promedio de la unidad).

const MENSAJE =
  "Este informe fue emitido antes de que se aprobara una actividad de Recuperación; los valores mostrados pueden no reflejar la Nota Final o el resultado más reciente del estudiante."

const INFORME_502_201 =
  "/app/gestion-academica/informes?sede=1&anio=2026&jornada=11&periodos=%5B201%5D&grupos=%5B502%5D&tab=502"

const SHOTS = process.env.E2E_SHOTS_DIR

async function shot(page: Page, name: string) {
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/${name}.png`, fullPage: true })
}

async function login(page: Page, email: string, to: string) {
  await page.goto(`/login?redirectTo=${encodeURIComponent(to)}`)
  await page.getByLabel("Correo electrónico").fill(email)
  await page.getByLabel("Contraseña", { exact: true }).fill("password")
  await page.getByRole("button", { name: "Ingresar" }).click()
  await page.waitForURL((url) => url.pathname.startsWith("/app/"))
}

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

test("Regla 71: el informe emitido antes de aprobar un Refuerzo muestra el aviso fijo en la cabecera", async ({
  page,
}) => {
  await login(page, "admin@example.com", INFORME_502_201)
  await page.goto(INFORME_502_201)

  const aviso = page.getByTestId("informe-desactualizado")
  await expect(aviso).toBeVisible({ timeout: 60_000 })
  await expect(aviso.getByText(MENSAJE, { exact: true })).toBeVisible()
  await expect(aviso).toContainText("Primer período: Matemáticas · Refuerzo")
  // Aviso estático: no se cierra.
  await expect(aviso.getByRole("button")).toHaveCount(0)
  await shot(page, "01-informe-desactualizado-aviso")

  // Otro período del mismo grupo no está marcado.
  await page.goto(INFORME_502_201.replace("%5B201%5D", "%5B202%5D"))
  await expect(page.getByRole("tab", { name: /5°01/ })).toBeVisible({ timeout: 60_000 })
  await expect(page.getByTestId("informe-desactualizado")).toHaveCount(0)
})

test("Regla 71: la notificación al coordinador (admin en el mock) lleva al informe desactualizado", async ({ page }) => {
  await login(page, "admin@example.com", "/app/notificaciones")
  await page.goto("/app/notificaciones")

  const aviso = page.getByText("Informe desactualizado: 5°01 - Matemáticas · Primer período").first()
  await expect(aviso).toBeVisible({ timeout: 60_000 })
  await expect(page.getByText(/Quedó desactualizado: Informe del periodo/).first()).toBeVisible()
  await shot(page, "02-notificacion-informe-desactualizado")

  await aviso.click()
  await page.waitForURL((url) => url.pathname === "/app/gestion-academica/informes")
  await expect(page.getByTestId("informe-desactualizado")).toBeVisible({ timeout: 60_000 })
  await shot(page, "03-deep-link-informe")
})

test("Reglas 70/71: la planilla de Informes muestra original / refuerzo en la actividad recuperada", async ({
  page,
}) => {
  const ruta = "/app/gestion-academica/informes/planilla/502/4401/203"
  await login(page, "admin@example.com", ruta)
  await page.goto(ruta)

  const fila = page.getByRole("row", { name: /CAMILA ANDREA ROJAS MEJÍA/ })
  await expect(fila).toBeVisible({ timeout: 60_000 })
  await expect(fila.getByText("3,0", { exact: true })).toBeVisible()
  await expect(fila.getByText("4,5", { exact: true }).first()).toBeVisible()
  await fila.getByText("3,0", { exact: true }).hover()
  await expect(page.getByTestId("tooltip-refuerzo")).toContainText("Refuerzo más reciente 4,5")
  await shot(page, "04-planilla-informes-refuerzo")
})

test("Reglas 70/71: la planilla del Planeador muestra original / refuerzo y el promedio de la unidad", async ({
  page,
}) => {
  await login(page, "docente@example.com", "/app/planeador/planilla")
  await page.goto("/app/planeador/planilla")
  await page.getByText("Grado, grupo, asignatura y rango de fechas").click({ timeout: 60_000 })
  const cascada = page.getByRole("dialog")
  for (const opcion of ["3º", "A", "Diseño", /^Primer periodo/]) {
    await cascada.getByRole("list").last().getByRole("button", { name: opcion }).click()
  }

  // En el mock, el primer estudiante tiene un Refuerzo en su primera actividad sumativa.
  const refuerzo = page.getByRole("row").nth(1).locator("button", { has: page.getByText("/", { exact: true }) })
  await expect(refuerzo).toBeVisible({ timeout: 60_000 })
  await refuerzo.hover()
  await expect(page.getByTestId("tooltip-refuerzo")).toContainText("Refuerzo más reciente")
  await shot(page, "05-planilla-planeador-refuerzo")

  await page.getByRole("group").filter({ hasText: "Ver por" }).getByRole("combobox").click()
  await page.getByRole("option", { name: /Unidad/ }).click()
  await expect(page.getByRole("columnheader", { name: "Prom. unidad" }).first()).toBeVisible()
  await expect(page.getByTestId("promedio-unidad").first()).toHaveText(/^\d\.\d{2}$/)
  await shot(page, "06-planilla-planeador-promedio-unidad")
})
