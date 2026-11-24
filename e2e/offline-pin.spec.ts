import { expect, test } from "@playwright/test"
import { usarComoEquipoPersonal } from "./support/equipo-personal"

// PIN local y cifrado en reposo (`add-offline-meses-pwa` D-4/D-8).

test("crear PIN: lo guardado queda cifrado y al recargar sin red se pide el PIN", async ({ page }) => {
  test.setTimeout(480_000)
  await page.goto("/login")
  await page.evaluate(
    () =>
      new Promise<void>((resolve) => {
        localStorage.clear()
        sessionStorage.clear()
        const req = indexedDB.deleteDatabase("ce-offline")
        req.onsuccess = req.onerror = req.onblocked = () => resolve()
      }),
  )
  await page.getByLabel("Correo o número de documento").fill("docente@example.com")
  await page.getByLabel("Contraseña", { exact: true }).fill("password")
  await usarComoEquipoPersonal(page)
  await page.getByRole("button", { name: "Ingresar" }).click()
  await page.waitForURL((url) => url.pathname.startsWith("/app/"))
  await page.goto("/app/planeador/actividades")

  await page.getByRole("button", { name: "Cuenta de usuario" }).click()
  await page.getByRole("menuitem", { name: "Preparar para usar sin conexión" }).click()
  const dialog = page.getByRole("dialog", { name: "Preparar para usar sin conexión" })
  await dialog.getByLabel("PIN nuevo").fill("246813")
  // Al repetirlo, la preparación arranca sola.
  await dialog.getByLabel("Repetir PIN").fill("246813")
  await expect(dialog).toBeHidden()
  await expect(page.getByText(/Listo. Este equipo puede usarse sin conexión./).first()).toBeVisible({ timeout: 300_000 })
  await page.waitForTimeout(2_000)

  // En disco no hay texto en claro de las queries.
  const enClaro = await page.evaluate(
    () =>
      new Promise<number>((resolve) => {
        const req = indexedDB.open("ce-offline")
        req.onsuccess = () => {
          const all = req.result.transaction("queries").objectStore("queries").getAll()
          all.onsuccess = () =>
            resolve((all.result as { data: string }[]).filter((r) => !r.data.startsWith("enc1:")).length)
        }
      }),
  )
  expect(enClaro).toBe(0)

  await page.evaluate(() => sessionStorage.setItem("msw:fault", "network"))
  await page.reload()
  await expect(page.getByRole("heading", { name: "Escriba su PIN" })).toBeVisible({ timeout: 30_000 })
  await page.getByLabel("PIN", { exact: true }).fill("111111")
  await expect(page.getByText(/PIN incorrecto/)).toBeVisible({ timeout: 30_000 })
  await page.getByLabel("PIN", { exact: true }).fill("246813")
  await expect(page.getByRole("heading", { name: "Escriba su PIN" })).toHaveCount(0, { timeout: 30_000 })
  await expect(page.getByText(/^Datos del /).first()).toBeVisible({ timeout: 30_000 })
})
