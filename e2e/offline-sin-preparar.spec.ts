import { expect, test, type Page } from "@playwright/test"

// Auditoría de cargas infinitas sin conexión (docs/offline/AUDITORIA-RUTAS.md):
// SIN haber usado "Preparar", ninguna ruta no administrativa puede quedarse
// en un skeleton o spinner. A los 3 s cada una muestra lo guardado o un aviso
// claro ("Sin conexión: esta información no está guardada en este equipo",
// o "Esta sección necesita conexión" en las solo en línea).
//
// "Sin conexión" = el navegador dice offline (`navigator.onLine === false`,
// como un equipo en modo avión) Y la API mockeada no responde
// (`sessionStorage["msw:fault"] = "network"`, ver `src/mocks/browser.ts`). Se
// usa `addInitScript` y no `context.setOffline`: con este último Vite dev no
// podría servir los módulos de las rutas perezosas.

const ESPERA_MS = 3_000

/** Rutas no administrativas: todo `/app` salvo administración y auditoría. */
const RUTAS_ADMIN_SIN_ADMINISTRACION = [
  "/app/sin-acceso",
  "/app/pendientes",
  "/app/sincronizar",
  "/app/mis-dispositivos",
  "/app/planeador/actividades",
  "/app/planeador/actividades/agregar",
  "/app/planeador/actividades/1/editar",
  "/app/planeador/unidades",
  "/app/planeador/unidades/agregar",
  "/app/planeador/unidades/editar/1",
  "/app/planeador/planilla",
  "/app/planeador/recursos/vista-previa",
  "/app/gestion-academica/informes",
  "/app/gestion-academica/informes/planilla/1/1/1",
  "/app/gestion-academica/referentes-curriculares",
  "/app/gestion-academica/referentes-curriculares/detalle/1",
  "/app/asistencia",
  "/app/asistencia/seguimiento",
  "/app/asistencia/manual",
  "/app/comunicaciones/chat",
  "/app/notificaciones",
  "/app/notificaciones/preferencias",
  "/app/establecimiento-educativo/general",
  "/app/establecimiento-educativo/detalle/1",
  "/app/establecimiento-educativo/sedes",
  "/app/establecimiento-educativo/periodos",
  "/app/establecimiento-educativo/periodos/1/editar",
  "/app/establecimiento-educativo/periodos/agregar",
  "/app/establecimiento-educativo/agregar",
  "/app/establecimiento-educativo/editar/1",
  "/app/establecimiento-educativo/funcionarios",
  "/app/cobertura/reserva-de-cupo",
  "/app/cobertura/pre-matricula",
  "/app/cobertura/inscritos",
  "/app/cobertura/inscritos/1",
  "/app/cobertura/matricula",
  "/app/cobertura/matricula/agregar",
  "/app/cobertura/matricula/configuracion",
  "/app/cobertura/matricula/detalle/1",
  "/app/cobertura/matricula/detalle/1/editar",
]

/** Lo que ve un docente en su menú (el resto lo manda a "sin acceso"). */
const RUTAS_DOCENTE = [
  "/app/planeador/actividades",
  "/app/planeador/actividades/agregar",
  "/app/planeador/actividades/1/editar",
  "/app/planeador/unidades",
  "/app/planeador/unidades/agregar",
  "/app/planeador/unidades/editar/1",
  "/app/planeador/planilla",
  "/app/asistencia",
  "/app/asistencia/seguimiento",
  "/app/asistencia/manual",
  "/app/comunicaciones/chat",
  "/app/notificaciones",
  "/app/notificaciones/preferencias",
  "/app/pendientes",
  "/app/sincronizar",
  "/app/mis-dispositivos",
]

/** Indicadores de carga visibles (skeleton, spinner, pulso, aria-busy). */
const CARGANDO =
  '[data-slot="skeleton"], [data-slot="spinner"], .animate-spin, .animate-pulse, [aria-busy="true"]'

/** Aviso claro de que falta el dato o de que la vista necesita red. */
const AVISO =
  '[data-slot="offline-data-message"], [data-slot="offline-missing-data"], [data-slot="select-offline-empty"]'
const AVISO_TEXTO = /no est[aá]n? guardad[ao]s? en este equipo|Esta sección necesita conexión|No tienes acceso|sin acceso/i

/** Vistas que muestran contenido local aunque no haya nada del servidor. */
const CONTENIDO_LOCAL: Record<string, RegExp> = {
  "/app/pendientes": /Cambios pendientes|No tienes cambios pendientes/i,
  "/app/sincronizar": /Sincronizar/i,
  "/app/sin-acceso": /acceso/i,
  // Sin `?sede=` la pantalla pide entrar desde Asistencia (no consulta nada).
  "/app/asistencia/seguimiento": /Seguimiento necesita una sede/i,
  // Sin recurso en el borrador local (sessionStorage) no hay nada que mostrar.
  "/app/planeador/recursos/vista-previa": /no tiene una fuente cargada/i,
}

async function limpiarEquipo(page: Page) {
  await page.goto("/login")
  await page.evaluate(
    () =>
      new Promise<void>((resolve) => {
        const req = indexedDB.deleteDatabase("ce-offline")
        req.onsuccess = req.onerror = req.onblocked = () => resolve()
      }),
  )
  await page.evaluate(() => {
    localStorage.clear()
    sessionStorage.removeItem("msw:fault")
  })
}

async function ingresar(page: Page, email: string) {
  await page.getByLabel("Correo electrónico").fill(email)
  await page.getByLabel("Contraseña", { exact: true }).fill("password")
  const compartido = page.getByRole("checkbox", { name: "Este es un equipo compartido" })
  if (await compartido.isChecked()) await compartido.click()
  await page.getByRole("button", { name: "Ingresar" }).click()
  await page.waitForURL((url) => url.pathname.startsWith("/app/"))
  // La pantalla de aterrizaje termina de cargar con red (y guarda lo suyo).
  await page.waitForLoadState("networkidle")
  await page.waitForTimeout(1_500)
}

/** Modo avión: el navegador dice offline y la API no responde. */
async function quedarSinConexion(page: Page) {
  await page.addInitScript(() => {
    Object.defineProperty(Navigator.prototype, "onLine", { configurable: true, get: () => false })
  })
  await page.evaluate(() => sessionStorage.setItem("msw:fault", "network"))
  await page.reload()
  await expect(
    page.locator("[data-slot=offline-banner]").filter({ hasText: /sin conexión/i }),
    "entra en modo sin conexión con la sesión guardada",
  ).toBeVisible({ timeout: 30_000 })
}

interface RouterDev {
  state: { status: string; location: { href: string }; resolvedLocation?: { href: string } }
}

/**
 * Navegación SPA y espera a que el router TERMINE de cargar la ruta (en Vite
 * dev el primer acceso a una ruta perezosa compila sus módulos y puede tardar
 * más que los 3 s del criterio; en producción vienen del precache del SW).
 * `__ceRouter` solo existe en desarrollo (`src/provider.tsx`).
 */
async function ir(page: Page, path: string) {
  await page.evaluate((p) => {
    history.pushState({}, "", p)
    dispatchEvent(new PopStateEvent("popstate"))
  }, path)
  await page.waitForFunction(
    () => {
      const router = (window as unknown as { __ceRouter?: RouterDev }).__ceRouter
      if (!router) return true
      const { status, location, resolvedLocation } = router.state
      return status === "idle" && resolvedLocation?.href === location.href
    },
    null,
    { timeout: 60_000, polling: 100 },
  )
}

/** Queries observadas sin datos (para entender un fallo, no para decidirlo). */
async function queriesSinDatos(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const client = (
      window as unknown as {
        __ceQueryClient?: {
          getQueryCache(): {
            getAll(): {
              queryKey: unknown
              state: { data: unknown; status: string; fetchStatus: string }
              isActive(): boolean
            }[]
          }
        }
      }
    ).__ceQueryClient
    if (!client) return []
    return client
      .getQueryCache()
      .getAll()
      .filter((q) => q.state.data === undefined && q.isActive())
      .map((q) => `${JSON.stringify(q.queryKey).slice(0, 70)}:${q.state.status}/${q.state.fetchStatus}`)
  })
}

const SHOTS = process.env.E2E_SCREENSHOTS_DIR

/** Para el reporte: qué indicador quedó (slot, clases y texto, recortados). */
async function describir(locator: ReturnType<Page["locator"]>): Promise<string[]> {
  return locator.evaluateAll((els) =>
    els.slice(0, 3).map((el) => {
      const slot = el.getAttribute("data-slot") ?? ""
      const cls = (el.getAttribute("class") ?? "").slice(0, 80)
      const parent = (el.parentElement?.textContent ?? "").trim().slice(0, 80)
      return `<${el.tagName.toLowerCase()} slot="${slot}" class="${cls}"> en "${parent}"`
    }),
  )
}

async function revisarRuta(page: Page, ruta: string) {
  await ir(page, ruta)
  await page.waitForTimeout(ESPERA_MS)
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/sin-preparar${ruta.replaceAll("/", "_")}.png`, fullPage: true })
  const cargando = page.locator(CARGANDO).filter({ visible: true })
  const textoCargando = page.getByText(/Cargando/).filter({ visible: true })
  const nCargando = await cargando.count()
  const nTexto = await textoCargando.count()
  expect
    .soft(nCargando, `${ruta}: ningún skeleton/spinner a los ${ESPERA_MS / 1000} s ${nCargando ? (await describir(cargando)).join(" | ") : ""}`)
    .toBe(0)
  expect
    .soft(nTexto, `${ruta}: ningún "Cargando…" a los ${ESPERA_MS / 1000} s ${nTexto ? (await describir(textoCargando)).join(" | ") : ""}`)
    .toBe(0)

  // El aviso de la pantalla se busca en el contenido (no en el sidebar, el
  // header ni el banner global, que se cuenta aparte).
  const contenido = page.locator('[data-slot="app-content"]')
  const path = new URL(page.url()).pathname
  const local = CONTENIDO_LOCAL[path]
  const senales = {
    avisoEnPantalla: await contenido.locator(AVISO).filter({ visible: true }).count(),
    textoEnPantalla: await contenido.getByText(AVISO_TEXTO).filter({ visible: true }).count(),
    bannerFaltan: await page.locator('[data-slot="offline-missing-data"]').filter({ visible: true }).count(),
    datosDel: await contenido.getByText(/^Datos del /).filter({ visible: true }).count(),
    local: local != null ? await contenido.getByText(local).filter({ visible: true }).count() : 0,
  }
  const faltan = await queriesSinDatos(page)
  console.log(`${ruta} → ${path} ${JSON.stringify(senales)} sin datos: ${faltan.join(", ") || "—"}`)
  const claro = Object.values(senales).some((n) => n > 0)
  expect.soft(claro, `${ruta}: muestra lo guardado o un aviso claro ${JSON.stringify(senales)}`).toBe(true)
}

test.describe("sin conexión y sin Preparar: ninguna carga infinita", () => {
  test.beforeEach(async ({ page }) => {
    await limpiarEquipo(page)
  })

  test("administrador: todas las rutas no administrativas", async ({ page }) => {
    test.setTimeout(420_000)
    await ingresar(page, "admin@example.com")
    await quedarSinConexion(page)
    for (const ruta of RUTAS_ADMIN_SIN_ADMINISTRACION) await revisarRuta(page, ruta)
    // `/app` sin red aterriza en una pantalla que funciona offline, sin quedar cargando.
    await revisarRuta(page, "/app")
  })

  test("docente: las rutas de su menú", async ({ page }) => {
    test.setTimeout(300_000)
    await ingresar(page, "docente@example.com")
    await quedarSinConexion(page)
    for (const ruta of RUTAS_DOCENTE) await revisarRuta(page, ruta)
  })
})
