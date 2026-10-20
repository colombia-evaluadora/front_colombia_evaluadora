import { expect, test } from "@playwright/test"

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
  await page.getByLabel("Correo electrónico").fill("docente@example.com")
  await page.getByLabel("Contraseña", { exact: true }).fill("password")
  const compartido = page.getByRole("checkbox", { name: "Este es un equipo compartido" })
  if (await compartido.isChecked()) await compartido.click()
  await page.getByRole("button", { name: "Ingresar" }).click()
  await page.waitForURL((url) => url.pathname.startsWith("/app/"))
  await page.goto("/app/planeador/actividades")

  await page.getByRole("button", { name: "Cuenta de usuario" }).click()
  await page.getByRole("menuitem", { name: "Preparar para usar sin conexión" }).click()
  const dialog = page.getByRole("dialog", { name: "Preparar para usar sin conexión" })
  await dialog.getByLabel(/^PIN/).fill("246810")
  await dialog.getByLabel("Confirmar PIN").fill("246810")
  await dialog.getByRole("button", { name: "Crear PIN" }).click()
  await expect(dialog.getByText(/cifrados con tu PIN/)).toBeVisible({ timeout: 30_000 })
  await dialog.getByRole("button", { name: "Preparar", exact: true }).click()
  await expect(dialog.getByText(/Listo\. Este equipo puede usarse sin conexión\./)).toBeVisible({ timeout: 300_000 })
  await dialog.getByRole("button", { name: "Cerrar", exact: true }).first().click()
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
  await expect(page.getByRole("heading", { name: "Escribe tu PIN" })).toBeVisible({ timeout: 30_000 })
  await page.getByLabel("PIN").fill("111111")
  await page.getByRole("button", { name: "Abrir", exact: true }).click()
  await expect(page.getByText(/PIN incorrecto/)).toBeVisible({ timeout: 30_000 })
  await page.getByLabel("PIN").fill("246810")
  await page.getByRole("button", { name: "Abrir", exact: true }).click()
  await expect(page.getByRole("heading", { name: "Escribe tu PIN" })).toHaveCount(0, { timeout: 30_000 })
  await expect(page.getByText(/^Datos del /).first()).toBeVisible({ timeout: 30_000 })
})
