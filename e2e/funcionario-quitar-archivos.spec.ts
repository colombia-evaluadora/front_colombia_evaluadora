import { expect, test, type Page } from "@playwright/test"

// Funcionarios (MSW): quitar la foto y los documentos anexos —al crear, antes de guardar, y al
// modificar uno ya guardado—, y Roles y permisos (Sección 4.2). Guardar y reabrir debe dejar la
// ficha sin foto ni anexo. Con `QUITAR_CAPTURAS=<dir>` guarda una captura por paso.
test.setTimeout(400_000)
const FUNCIONARIOS = "/app/establecimiento-educativo/funcionarios"
const CAPTURAS = process.env.QUITAR_CAPTURAS
const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
)
const SIN_ANEXOS = "El funcionario no tiene documentos anexos."

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
const quitarFoto = (page: Page) => page.getByRole("button", { name: "Eliminar foto" })
/** Sin foto: la zona de carga vuelve a pedir la "Foto" y no hay nada que quitar. */
async function sinFoto(page: Page, timeout = 5_000) {
  await expect(page.getByRole("region", { name: "Carga de archivos" }).getByText("Foto", { exact: true })).toBeVisible({ timeout })
  await expect(quitarFoto(page)).toHaveCount(0)
}

async function agregarAnexo(page: Page, nombre: string) {
  await page.getByRole("button", { name: "Agregar documento" }).click()
  const dialogo = page.getByRole("dialog")
  await dialogo.getByLabel(/Nombre documento/).fill(nombre)
  await dialogo.getByLabel(/Descripción/).fill("Soporte del requisito de vinculación")
  await dialogo.locator('input[type="file"]').setInputFiles({ name: "acta.pdf", mimeType: "application/pdf", buffer: Buffer.from("%PDF-1.4") })
  await dialogo.getByRole("button", { name: "Agregar" }).click()
  await expect(dialogo).toHaveCount(0)
}

async function confirmarSi(page: Page) {
  await page.getByRole("alertdialog").getByRole("button", { name: "Si" }).click()
  await expect(page.getByRole("alertdialog")).toHaveCount(0)
}

/** La fila del primer funcionario, por documento: tras guardar, la lista puede reordenarse. */
async function primeraFila(page: Page) {
  await expect(page.getByRole("button", { name: "Ver detalle" }).first()).toBeVisible({ timeout: 30_000 })
  const documento = (await page.getByRole("row").nth(1).getByRole("cell").first().innerText()).trim()
  return page.getByRole("row").filter({ hasText: documento })
}

async function abrirModificar(page: Page) {
  await page.getByRole("button", { name: "Modificar" }).click()
  await expect(page.getByRole("button", { name: "Guardar" })).toBeVisible({ timeout: 15_000 })
}

test("quitar la foto y los documentos anexos del funcionario", async ({ page }) => {
  await login(page)

  // Nuevo: la foto elegida y un anexo pendiente se quitan antes de guardar.
  await page.getByRole("button", { name: "Nuevo funcionario" }).click()
  await subirFoto(page)
  await captura(page, "01-nuevo-con-foto")
  await quitarFoto(page).click()
  await sinFoto(page)
  await agregarAnexo(page, "Acta de posesión")
  await expect(page.getByText("se carga al guardar")).toBeVisible()
  await page.getByRole("button", { name: "Quitar documento" }).click()
  await confirmarSi(page)
  await expect(page.getByText(SIN_ANEXOS)).toBeVisible()
  await captura(page, "02-nuevo-tras-quitar")
  await page.getByRole("button", { name: "Cancelar" }).click()

  // Modificar: subir la foto y guardar; el anexo se carga al momento.
  const fila = await primeraFila(page)
  await fila.hover()
  await fila.getByRole("button", { name: "Modificar" }).click()
  await expect(page.getByRole("button", { name: "Guardar" })).toBeVisible({ timeout: 15_000 })
  await subirFoto(page)
  await agregarAnexo(page, "Acta de posesión")
  await expect(page.getByRole("button", { name: "Eliminar documento" })).toBeVisible({ timeout: 15_000 })
  await page.getByRole("button", { name: "Guardar" }).click()
  // Guardar lleva al detalle.
  await expect(page.getByRole("button", { name: "Modificar" })).toBeVisible({ timeout: 15_000 })

  // Reabrir: la foto y el anexo guardados traen su botón de quitar.
  await abrirModificar(page)
  await expect(quitarFoto(page)).toBeVisible({ timeout: 15_000 })
  await captura(page, "03-modificar-guardados")
  await quitarFoto(page).click()
  await sinFoto(page)
  await page.getByRole("button", { name: "Eliminar documento" }).click()
  await confirmarSi(page)
  await expect(page.getByText(SIN_ANEXOS)).toBeVisible()
  await captura(page, "04-modificar-tras-quitar")
  await page.getByRole("button", { name: "Guardar" }).click()
  await expect(page.getByRole("button", { name: "Modificar" })).toBeVisible({ timeout: 15_000 })

  // Reabrir otra vez: sigue sin foto ni anexo.
  await abrirModificar(page)
  await sinFoto(page, 15_000)
  await expect(page.getByText(SIN_ANEXOS)).toBeVisible()
  await captura(page, "05-reabierto-sin-archivos")
})

test("roles y permisos del funcionario", async ({ page }) => {
  await login(page)
  const fila = await primeraFila(page)
  await fila.hover()
  await fila.getByRole("button", { name: "Roles y permisos" }).click()
  await expect(page.getByRole("heading", { name: /Roles y permisos —/ })).toBeVisible({ timeout: 15_000 })
  await captura(page, "10-roles")

  // Asignar un rol con Vigente hasta vacía.
  await page.getByRole("button", { name: "Asignar permisos" }).click()
  const dialogo = page.getByRole("dialog")
  await dialogo.getByRole("combobox", { name: /Rol/ }).click()
  await page.getByRole("option", { name: "Docente" }).click()
  await dialogo.getByRole("combobox", { name: /Sede educativa/ }).click()
  await page.getByRole("option").first().click()
  await dialogo.getByRole("combobox", { name: /Jornada/ }).click()
  await page.getByRole("option").first().click()
  await captura(page, "11-asignar")
  await dialogo.getByRole("button", { name: "Guardar" }).click()
  await expect(dialogo).toHaveCount(0, { timeout: 15_000 })
  const nuevo = page.getByRole("row").filter({ hasText: "Docente" }).first()
  await expect(nuevo).toBeVisible()

  // Inactivar y volver a activar.
  await nuevo.hover()
  await nuevo.getByRole("button", { name: "Inactivar" }).click()
  await expect(page.getByRole("alertdialog")).toContainText("quedará Inactivo y dejará de dar acceso")
  await captura(page, "12-inactivar")
  await page.getByRole("alertdialog").getByRole("button", { name: "Inactivar" }).click()
  await expect(nuevo).toContainText("Inactivo")
  await nuevo.hover()
  await nuevo.getByRole("button", { name: "Activar" }).click()
  await expect(nuevo).toContainText("Activo")

  // Permisos: quitar el Acceso a un módulo apaga sus submódulos.
  await nuevo.hover()
  await nuevo.getByRole("button", { name: "Permisos" }).click()
  await expect(page.getByRole("heading", { name: /Permisos —/ })).toBeVisible({ timeout: 15_000 })
  await page.getByRole("switch", { name: "Acceso en Gestión académica" }).click()
  await expect(page.getByRole("switch", { name: "Acceso en Planeador" })).not.toBeChecked()
  await expect(page.getByText("Sin acceso").first()).toBeVisible()
  await captura(page, "13-permisos")
  await page.getByRole("button", { name: "Guardar" }).click()
  await expect(page.getByRole("heading", { name: /Roles y permisos —/ })).toBeVisible({ timeout: 15_000 })
  await expect(page.getByText(/Se guardaron los permisos/)).toBeVisible()

  // Eliminar.
  await nuevo.hover()
  await nuevo.getByRole("button", { name: "Eliminar" }).click()
  await expect(page.getByRole("alertdialog")).toContainText("Esta acción no se puede deshacer")
  await captura(page, "14-eliminar")
  await page.getByRole("alertdialog").getByRole("button", { name: "Eliminar" }).click()
  await expect(page.getByRole("row").filter({ hasText: "Docente" })).toHaveCount(0)
})
