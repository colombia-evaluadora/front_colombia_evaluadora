import { expect, test, type Page } from "@playwright/test"

// Quitar la foto del funcionario (MSW): al crear, al editar con una foto recién
// elegida y al editar con una ya guardada — guardar y reabrir debe dejarlo sin
// foto. Con `QUITAR_CAPTURAS=<dir>` guarda una captura por paso.
test.setTimeout(400_000)
const FUNCIONARIOS = "/app/establecimiento-educativo/funcionarios"
const CAPTURAS = process.env.QUITAR_CAPTURAS
const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
)
const ZONA_VACIA = "para cargar la foto del usuario"

async function captura(page: Page, nombre: string) {
  if (CAPTURAS) await page.screenshot({ path: `${CAPTURAS}/${nombre}.png`, fullPage: true })
}

async function login(page: Page) {
  await page.goto(`/login?redirectTo=${encodeURIComponent(FUNCIONARIOS)}`)
  await page.waitForFunction(() => !!navigator.serviceWorker?.controller, null, { timeout: 60_000 })
  // El primer ingreso tras arrancar MSW a veces rebota al login: se reintenta.
  // El primer compilado de Vite es lento: se espera el título, no la URL.
  const titulo = page.getByRole("heading", { name: "Funcionarios" })
  for (let intento = 0; intento < 4; intento++) {
    const ingresar = page.getByRole("button", { name: "Ingresar" })
    if (await ingresar.isVisible().catch(() => false)) {
      await page.getByLabel("Correo electrónico").fill("admin@example.com")
      await page.getByLabel("Contraseña", { exact: true }).fill("password")
      await ingresar.click()
    }
    if (await titulo.waitFor({ timeout: 45_000 }).then(() => true, () => false)) return
  }
  await expect(titulo).toBeVisible()
}

const subirFoto = (page: Page) =>
  page.locator('input[type="file"]').first().setInputFiles({ name: "foto.png", mimeType: "image/png", buffer: PNG })
const quitar = (page: Page) => page.getByRole("button", { name: "Eliminar foto" })

test("quitar la foto del funcionario al crear y al editar", async ({ page }) => {
  await login(page)

  // Crear: elegir y quitar.
  await page.getByRole("button", { name: "Agregar" }).click()
  await subirFoto(page)
  await captura(page, "01-crear-con-foto")
  await quitar(page).click()
  await expect(page.getByText(ZONA_VACIA)).toBeVisible()
  await captura(page, "02-crear-tras-quitar")
  await page.getByRole("button", { name: "Cancelar" }).click()
  const descartar = page.getByRole("button", { name: /Descartar/ })
  if (await descartar.isVisible().catch(() => false)) await descartar.click()

  // Editar: subir y guardar, para que al reabrir sea una foto ya guardada.
  // Por documento y no por posición: tras guardar, la lista puede reordenarse.
  const documento = (await page.getByRole("row").nth(1).getByRole("cell").nth(1).innerText()).trim()
  const fila = page.getByRole("row").filter({ hasText: documento })
  const abrirEdicion = async () => {
    await fila.hover()
    await fila.getByRole("button", { name: "Editar funcionario" }).click()
    // Al llegar el detalle el diálogo reinicia la foto elegida: se espera a que cargue.
    await expect(page.getByLabel("Número de documento*")).toHaveValue(documento, { timeout: 15_000 })
  }
  await abrirEdicion()
  await subirFoto(page)
  await page.getByLabel("Teléfono").fill("3001234567")
  await page.getByRole("button", { name: "Guardar" }).click()
  await expect(page.getByRole("dialog")).toHaveCount(0, { timeout: 15_000 })

  // Reabrir: la foto guardada trae su botón de quitar.
  await abrirEdicion()
  await expect(quitar(page)).toBeVisible({ timeout: 15_000 })
  await captura(page, "03-editar-foto-guardada")
  await quitar(page).click()
  await expect(page.getByText(ZONA_VACIA)).toBeVisible()
  await captura(page, "04-editar-tras-quitar")
  await page.getByRole("button", { name: "Guardar" }).click()
  await expect(page.getByRole("dialog")).toHaveCount(0, { timeout: 15_000 })

  // Reabrir otra vez: sigue sin foto.
  await abrirEdicion()
  await expect(page.getByText(ZONA_VACIA)).toBeVisible({ timeout: 15_000 })
  await expect(quitar(page)).toHaveCount(0)
  await captura(page, "05-reabierto-sin-foto")
})
