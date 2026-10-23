import { writeFileSync } from "node:fs"
import { expect, test, type Page } from "@playwright/test"

test.setTimeout(400_000)
const URL_F = "/app/establecimiento-educativo/funcionarios"
const CAPTURAS = process.env.QUITAR_CAPTURAS

async function captura(page: Page, nombre: string) {
  if (CAPTURAS) await page.screenshot({ path: `${CAPTURAS}/${nombre}.png`, fullPage: true })
}

async function volcar(page: Page, nombre: string) {
  if (CAPTURAS) writeFileSync(`${CAPTURAS}/${nombre}.txt`, page.url() + "\n" + (await page.locator("body").innerText()))
}

async function login(page: Page, destino: string) {
  await page.goto(`/login?redirectTo=${encodeURIComponent(destino)}`)
  await page.waitForFunction(() => !!navigator.serviceWorker?.controller, null, { timeout: 60_000 })
  for (let i = 0; i < 4; i++) {
    await page.waitForTimeout(1_000)
    if (!new URL(page.url()).pathname.startsWith("/login")) break
    await page.getByLabel("Correo electrónico").fill("admin@example.com")
    await page.getByLabel("Contraseña", { exact: true }).fill("password")
    await page.getByRole("button", { name: "Ingresar" }).click()
    await page.waitForURL((u) => u.pathname.startsWith("/app"), { timeout: 30_000 }).catch(() => {})
  }
  await page.waitForTimeout(30_000)
}

test("explorar", async ({ page }) => {
  const logs: string[] = []
  page.on("console", (m) => logs.push(m.type() + " " + m.text()))
  await login(page, URL_F)
  if (CAPTURAS) writeFileSync(`${CAPTURAS}/console.txt`, logs.join("\n"))
  await volcar(page, "00-lista")
  await captura(page, "00-lista")
  expect(new URL(page.url()).pathname).toBe(URL_F)

  await page.getByRole("button", { name: "Agregar" }).click()
  await page.waitForTimeout(2_000)
  await captura(page, "01-crear-abierto")
  const inputs = page.locator('input[type="file"]')
  writeFileSync(`${CAPTURAS}/inputs.txt`, String(await inputs.count()))
  await inputs.first().setInputFiles({ name: "foto.png", mimeType: "image/png", buffer: PNG })
  await page.waitForTimeout(1_000)
  await captura(page, "02-crear-con-foto")
  const quitar = page.getByRole("button", { name: "Eliminar foto" })
  writeFileSync(`${CAPTURAS}/quitar.txt`, `${await quitar.count()} visible=${await quitar.first().isVisible().catch(() => "x")}`)
  await quitar.first().click({ timeout: 5_000 }).catch((e) => writeFileSync(`${CAPTURAS}/click-err.txt`, String(e)))
  await page.waitForTimeout(1_000)
  await captura(page, "03-crear-tras-quitar")
  await volcar(page, "03-crear-tras-quitar")
  await page.getByRole("button", { name: "Cancelar" }).click()
  await page.waitForTimeout(1_000)
  const descartar = page.getByRole("button", { name: /Descartar/ })
  if (await descartar.count()) await descartar.first().click()
  await page.waitForTimeout(1_000)

  // Editar: subir, guardar, reabrir y quitar la ya guardada.
  const fila = page.getByRole("row").nth(1)
  await fila.hover()
  await fila.getByRole("button", { name: "Editar funcionario" }).click()
  await page.waitForTimeout(3_000)
  await captura(page, "10-editar-abierto")
  await page.locator('input[type="file"]').first().setInputFiles({ name: "foto.png", mimeType: "image/png", buffer: PNG })
  await page.waitForTimeout(1_000)
  await captura(page, "11-editar-con-foto")
  await page.getByLabel("Teléfono").fill("3001234567")
  await page.getByRole("button", { name: "Guardar" }).first().click()
  await page.waitForTimeout(4_000)
  await captura(page, "11b-tras-guardar")
  // Cerrar y reabrir: la foto llega como ya guardada (existingPreview).
  await fila.hover()
  await fila.getByRole("button", { name: "Editar funcionario" }).click()
  await page.waitForTimeout(4_000)
  await captura(page, "12-editar-guardado")
  await volcar(page, "12-editar-guardado")
  const q2 = page.getByRole("button", { name: "Eliminar foto" })
  writeFileSync(`${CAPTURAS}/quitar2.txt`, `${await q2.count()} visible=${await q2.first().isVisible().catch(() => "x")}`)
  await q2.first().click({ timeout: 5_000 }).catch((e) => writeFileSync(`${CAPTURAS}/click-err2.txt`, String(e)))
  await page.waitForTimeout(1_000)
  await captura(page, "13-editar-tras-quitar")
  await page.getByRole("button", { name: "Guardar" }).first().click()
  await page.waitForTimeout(4_000)
  await fila.hover()
  await fila.getByRole("button", { name: "Editar funcionario" }).click()
  await page.waitForTimeout(4_000)
  await captura(page, "14-reabierto-tras-quitar-y-guardar")
  await expect(page.getByRole("button", { name: "Eliminar foto" })).toHaveCount(0)
  await expect(page.getByText("para cargar la foto del usuario")).toBeVisible()
})

const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
)
