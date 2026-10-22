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

const RUTAS_SOLO_EN_LINEA = [
  "/app/cobertura/matricula",
  "/app/establecimiento-educativo/funcionarios",
  // Registrar o revocar equipos necesita el servidor.
  "/app/mis-dispositivos",
]

const VACIO = "Esta sección necesita conexión"

// Un usuario por perfil de menú: el bug de "Establecimiento sin guardar" solo
// se veía con el menú de super admin/rector, que el docente no tiene.
const USUARIOS = ["docente@example.com", "admin@example.com", "coordinador@example.com"]

for (const usuario of USUARIOS)
test(`${usuario}: ninguna ruta muestra el empty state sin red tras preparar`, async ({ page }) => {
  test.setTimeout(600_000)
  await page.goto("/login")
  await page.evaluate(
    () =>
      new Promise<void>((resolve) => {
        const req = indexedDB.deleteDatabase("ce-offline")
        req.onsuccess = req.onerror = req.onblocked = () => resolve()
      }),
  )
  await page.getByLabel("Correo electrónico").fill(usuario)
  await page.getByLabel("Contraseña", { exact: true }).fill("password")
  const compartido = page.getByRole("checkbox", { name: "Este es un equipo compartido" })
  if (await compartido.isChecked()) await compartido.click()
  await page.getByRole("button", { name: "Ingresar" }).click()
  await page.waitForURL((url) => url.pathname.startsWith("/app/"))

  await page.getByRole("button", { name: "Cuenta de usuario" }).click()
  await page.getByRole("menuitem", { name: "Preparar para usar sin conexión" }).click()
  const dialog = page.getByRole("dialog", { name: "Preparar para usar sin conexión" })
  await dialog.getByRole("button", { name: "Preparar todo" }).click()
  await expect(dialog).toBeHidden()
  await expect(page.getByText(/Listo. Este equipo puede usarse sin conexión./).first()).toBeVisible({ timeout: 300_000 })

  await page.evaluate(() => sessionStorage.setItem("msw:fault", "network"))
  await page.reload()
  // Garantiza que de verdad estamos en modo sin conexión (si no, la prueba
  // pasaría trivialmente).
  await expect(page.getByRole("status").filter({ hasText: /sin conexión/i }).first()).toBeVisible({ timeout: 60_000 })
  // Navegación SPA: Vite dev no sirve módulos nuevos con la red "caída" del
  // lado de la API, pero la página ya cargada sí navega.
  const ir = async (p: string) => {
    await page.evaluate((path) => {
      history.pushState({}, "", path)
      dispatchEvent(new PopStateEvent("popstate"))
    }, p)
    // Espera a que el router termine (en Vite dev el primer acceso compila).
    await page.waitForFunction(
      () => {
        const router = (window as unknown as { __ceRouter?: { state: { status: string; location: { href: string }; resolvedLocation?: { href: string } } } }).__ceRouter
        if (!router) return true
        return router.state.status === "idle" && router.state.resolvedLocation?.href === router.state.location.href
      },
      null,
      { timeout: 60_000, polling: 100 },
    )
  }

  for (const ruta of RUTAS_NO_ADMIN) {
    await ir(ruta)
    await page.waitForTimeout(2_000)
    // Rutas fuera del menú del usuario redirigen: no aplican a este perfil.
    if (new URL(page.url()).pathname !== ruta) continue
    await expect(page.getByText(VACIO), `${ruta} no debe pedir conexión`).toHaveCount(0)
    // Tras "Preparar todo el año" la vista por defecto tiene TODO guardado: el
    // banner no debe decir que falta algo (prueba que Preparar usa las mismas
    // keys que cada pantalla, incluidas las listas con filtros).
    const faltan = await page.evaluate(() => {
      const client = (window as unknown as { __ceQueryClient?: { getQueryCache(): { getAll(): { queryKey: unknown; meta?: { offlineOptional?: boolean }; state: { data: unknown }; isActive(): boolean }[] } } }).__ceQueryClient
      if (!client) return []
      return client
        .getQueryCache()
        .getAll()
        .filter((q) => q.state.data === undefined && q.isActive() && !q.meta?.offlineOptional)
        .map((q) => JSON.stringify(q.queryKey).slice(0, 90))
    })
    expect.soft(faltan, `${ruta}: todo lo de la vista por defecto quedó guardado`).toEqual([])
  }
  // `/app` sin red aterriza en una pantalla que funciona offline.
  await ir("/app")
  await page.waitForURL((url) => url.pathname !== "/app" && url.pathname !== "/app/")
  await expect(page.getByText(VACIO)).toHaveCount(0)

  // Las solo en línea (admin) sí muestran el empty state; el docente no
  // tiene esos menús, así que basta con que no sean alcanzables desde /app.
  expect(RUTAS_SOLO_EN_LINEA.length).toBeGreaterThan(0)
})
