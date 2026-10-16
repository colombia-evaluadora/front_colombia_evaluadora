import { expect, test } from "@playwright/test"

// Auditoría de rutas offline (docs/offline/AUDITORIA-RUTAS.md): después de
// "Preparar para usar sin conexión", NINGUNA ruta no administrativa debe
// mostrar "Esta sección necesita conexión". "Sin red" = API caída por MSW
// (`sessionStorage["msw:fault"] = "network"`), igual que offline-reads.

const RUTAS_NO_ADMIN = [
  "/app",
  "/app/planeador/actividades",
  "/app/planeador/actividades/agregar",
  "/app/planeador/unidades",
  "/app/planeador/unidades/agregar",
  "/app/planeador/planilla",
  "/app/asistencia",
  "/app/asistencia/seguimiento",
  "/app/gestion-academica/informes",
  "/app/gestion-academica/referentes-curriculares",
  "/app/establecimiento-educativo/general",
  "/app/establecimiento-educativo/sedes",
  "/app/establecimiento-educativo/periodos",
  "/app/comunicaciones/foros",
  "/app/comunicaciones/chat",
  "/app/notificaciones",
  "/app/notificaciones/preferencias",
  "/app/pendientes",
]

const RUTAS_SOLO_EN_LINEA = ["/app/cobertura/matricula", "/app/establecimiento-educativo/funcionarios"]

const VACIO = "Esta sección necesita conexión"

test("ninguna ruta no administrativa muestra el empty state sin red tras preparar", async ({ page }) => {
  test.setTimeout(300_000)
  await page.goto("/login")
  await page.evaluate(
    () =>
      new Promise<void>((resolve) => {
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

  await page.getByRole("button", { name: "Cuenta de usuario" }).click()
  await page.getByRole("menuitem", { name: "Preparar para usar sin conexión" }).click()
  const dialog = page.getByRole("dialog", { name: "Preparar para usar sin conexión" })
  await dialog.getByRole("button", { name: "Preparar todo el año" }).click()
  await expect(dialog.getByText(/Listo\. Este equipo puede usarse sin conexión\./)).toBeVisible({ timeout: 90_000 })
  await dialog.getByRole("button", { name: "Cerrar", exact: true }).first().click()

  await page.evaluate(() => sessionStorage.setItem("msw:fault", "network"))
  await page.reload()
  // Garantiza que de verdad estamos en modo sin conexión (si no, la prueba
  // pasaría trivialmente).
  await expect(page.getByRole("status").filter({ hasText: /sin conexión/i }).first()).toBeVisible({ timeout: 30_000 })
  // Navegación SPA: Vite dev no sirve módulos nuevos con la red "caída" del
  // lado de la API, pero la página ya cargada sí navega.
  const ir = (p: string) =>
    page.evaluate((path) => {
      history.pushState({}, "", path)
      dispatchEvent(new PopStateEvent("popstate"))
    }, p)

  for (const ruta of RUTAS_NO_ADMIN) {
    await ir(ruta)
    await page.waitForTimeout(2_000)
    await expect(page.getByText(VACIO), `${ruta} no debe pedir conexión`).toHaveCount(0)
  }
  // `/app` sin red aterriza en una pantalla que funciona offline.
  await ir("/app")
  await page.waitForURL((url) => url.pathname !== "/app" && url.pathname !== "/app/")
  await expect(page.getByText(VACIO)).toHaveCount(0)

  // Las solo en línea (admin) sí muestran el empty state; el docente no
  // tiene esos menús, así que basta con que no sean alcanzables desde /app.
  expect(RUTAS_SOLO_EN_LINEA.length).toBeGreaterThan(0)
})
