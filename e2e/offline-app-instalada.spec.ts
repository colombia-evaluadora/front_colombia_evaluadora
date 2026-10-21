import { expect, test, type BrowserContext, type Page } from "@playwright/test"

// App INSTALADA (`add-offline-meses-pwa` D-12/D-14). Playwright no emula
// `display-mode` con `emulateMedia`, así que se reemplaza `matchMedia` para que
// `(display-mode: standalone)` responda `true` (lo que ve la app abierta desde
// su ícono). Corre contra el dev server con MSW como el resto de `e2e/`.
//
// Se usa un usuario FUERA de la lista del piloto (`playwright.config.ts`):
// en la app instalada el equipo es personal igual.

const USUARIO = "coordinador@example.com"
const NOMBRE = "Coordinador Demo"

async function emularAppInstalada(context: BrowserContext) {
  await context.addInitScript(() => {
    const original = window.matchMedia.bind(window)
    window.matchMedia = (query: string) => {
      if (/\(display-mode:\s*standalone\)/.test(query)) {
        return {
          matches: true,
          media: query,
          onchange: null,
          addListener: () => undefined,
          removeListener: () => undefined,
          addEventListener: () => undefined,
          removeEventListener: () => undefined,
          dispatchEvent: () => false,
        } as MediaQueryList
      }
      return original(query)
    }
  })
}

/** Filas guardadas (`ce-offline.queries`) de un usuario. */
async function filasGuardadas(page: Page, sub: string): Promise<number> {
  return page.evaluate(
    (usuario) =>
      new Promise<number>((resolve) => {
        const req = indexedDB.open("ce-offline")
        req.onerror = () => resolve(0)
        req.onsuccess = () => {
          const db = req.result
          if (!db.objectStoreNames.contains("queries")) {
            db.close()
            return resolve(0)
          }
          const all = db.transaction("queries").objectStore("queries").getAll()
          all.onsuccess = () => {
            db.close()
            resolve((all.result as { userSub: string }[]).filter((r) => r.userSub === usuario).length)
          }
          all.onerror = () => resolve(0)
        }
      }),
    sub,
  )
}

/** Un cambio sin sincronizar del usuario, escrito directo en la outbox. */
async function sembrarPendiente(page: Page, sub: string) {
  await page.evaluate(
    (usuario) =>
      new Promise<void>((resolve, reject) => {
        const req = indexedDB.open("ce-offline")
        req.onerror = () => reject(req.error)
        req.onsuccess = () => {
          const db = req.result
          const tx = db.transaction("outbox", "readwrite")
          const ahora = Date.now()
          tx.objectStore("outbox").put({
            id: "e2e-pendiente-1",
            seq: 1,
            userSub: usuario,
            kind: "asistencia.registrar",
            handlerVersion: 1,
            entityKey: "asistencia:e2e",
            dependsOn: [],
            payload: { e2e: true },
            blobRefs: [],
            idempotencyKey: "e2e-pendiente-1",
            status: "pending",
            attempts: 0,
            nextAttemptAt: ahora + 86_400_000,
            lastError: null,
            conflict: null,
            resultNote: null,
            createdAt: ahora,
            updatedAt: ahora,
            appBuild: "e2e",
          })
          tx.oncomplete = () => {
            db.close()
            resolve()
          }
          tx.onerror = () => reject(tx.error)
        }
      }),
    sub,
  )
}

async function sinConexion(page: Page) {
  await page.addInitScript(() => {
    Object.defineProperty(Navigator.prototype, "onLine", { configurable: true, get: () => false })
  })
  await page.evaluate(() => sessionStorage.setItem("msw:fault", "network"))
}

test("app instalada: equipo personal sin piloto, guarda todo sola, cerrar sesión bloquea y borrar pide doble confirmación", async ({
  browser,
}) => {
  test.setTimeout(420_000)
  const context = await browser.newContext()
  await emularAppInstalada(context)
  const page = await context.newPage()

  await page.goto("/login")
  await page.evaluate(
    () =>
      new Promise<void>((resolve) => {
        const req = indexedDB.deleteDatabase("ce-offline")
        req.onsuccess = req.onerror = req.onblocked = () => resolve()
      }),
  )
  // Los E2E apagan la autopreparación por build; este equipo la prende.
  await page.evaluate(() => {
    localStorage.clear()
    localStorage.setItem("ce-offline-auto-prepare", "on")
  })
  await page.reload()

  // 1. Sin checkbox de equipo compartido: la app instalada es personal.
  await expect(page.getByRole("checkbox", { name: "Este es un equipo compartido" })).toHaveCount(0)
  await expect(page.locator('[data-slot="installed-device-note"]')).toBeVisible()

  await page.getByLabel("Correo electrónico").fill(USUARIO)
  await page.getByLabel("Contraseña", { exact: true }).fill("password")
  await page.getByRole("button", { name: "Ingresar" }).click()
  await page.waitForURL((url) => url.pathname.startsWith("/app/"))

  // 2. Primera preparación automática, con progreso visible, sin tocar nada.
  await expect(page.locator('[data-slot="first-prepare-banner"]')).toBeVisible({ timeout: 30_000 })
  await expect(page.locator('[data-slot="first-prepare-banner"]')).toBeHidden({ timeout: 240_000 })
  await expect(page.locator('[data-slot="offline-data-status"]')).toHaveAttribute("title", /^Datos guardados: hace/, {
    timeout: 15_000,
  })
  await expect.poll(() => filasGuardadas(page, USUARIO), { timeout: 30_000 }).toBeGreaterThan(5)
  const guardadas = await filasGuardadas(page, USUARIO)

  // 3. Cerrar sesión NO borra: avisa y bloquea.
  await page.getByRole("button", { name: "Cuenta de usuario" }).click()
  await page.getByRole("menuitem", { name: "Cerrar sesión" }).click()
  const dialogo = page.getByRole("dialog", { name: "Cerrar sesión en este equipo" })
  await expect(dialogo).toBeVisible()
  await dialogo.getByRole("button", { name: "Cerrar sesión", exact: true }).click()
  await page.waitForURL((url) => url.pathname === "/login", { timeout: 15_000 })
  expect(await filasGuardadas(page, USUARIO)).toBeGreaterThanOrEqual(guardadas)

  // 4. Sin red: no entra solo; pide la contraseña y la verifica en el equipo.
  await sinConexion(page)
  await page.goto("/app")
  await page.waitForURL((url) => url.pathname === "/login", { timeout: 30_000 })
  await expect(page.getByRole("button", { name: /Continuar sin conexión/ })).toHaveCount(0)
  await expect(page.getByText(/escribe tu correo y tu contraseña/i)).toBeVisible({ timeout: 15_000 })
  await page.getByLabel("Correo electrónico").fill(USUARIO)
  await page.getByLabel("Contraseña", { exact: true }).fill("otra-cosa")
  await page.getByRole("button", { name: "Entrar sin conexión" }).click()
  await expect(page.getByRole("alert").filter({ hasText: /solo puede entrar/ })).toBeVisible({ timeout: 15_000 })
  await page.getByLabel("Contraseña", { exact: true }).fill("password")
  await page.getByRole("button", { name: "Entrar sin conexión" }).click()
  await page.waitForURL((url) => url.pathname.startsWith("/app/"), { timeout: 30_000 })
  await expect(page.locator("[data-slot=offline-banner]").filter({ hasText: /sin conexión/i })).toBeVisible({
    timeout: 30_000,
  })
  await expect(page.getByRole("button", { name: "Cuenta de usuario" })).toBeVisible()

  // 5. Borrar los datos con un cambio sin sincronizar: doble confirmación.
  await sembrarPendiente(page, USUARIO)
  await page.reload()
  await page.waitForURL((url) => url.pathname.startsWith("/app/") || url.pathname === "/login", { timeout: 30_000 })
  if (new URL(page.url()).pathname === "/login") {
    // Recargar sin red vuelve a pedir desbloquear (la sesión no se reabre sola).
    await page.getByLabel("Correo electrónico").fill(USUARIO)
    await page.getByLabel("Contraseña", { exact: true }).fill("password")
    await page.getByRole("button", { name: "Entrar sin conexión" }).click()
    await page.waitForURL((url) => url.pathname.startsWith("/app/"), { timeout: 30_000 })
  }
  await page.getByRole("button", { name: "Cuenta de usuario" }).click()
  await page.getByRole("menuitem", { name: /Borrar los datos de este equipo/ }).click()
  const borrar = page.getByRole("dialog", { name: "Borrar los datos de este equipo" })
  await expect(borrar).toBeVisible()
  await expect(borrar.getByRole("alert")).toContainText("cambios sin sincronizar")
  await borrar.getByRole("button", { name: "Borrar de todas formas…" }).click()
  const seguro = page.getByRole("dialog", { name: /¿Seguro\?/ })
  await expect(seguro).toBeVisible()
  await seguro.getByRole("button", { name: "Sí, borrar todo" }).click()
  await page.waitForURL((url) => url.pathname === "/login", { timeout: 30_000 })
  await expect.poll(() => filasGuardadas(page, USUARIO), { timeout: 15_000 }).toBe(0)
  // Sin datos ni sesión guardada ya no hay a quién desbloquear sin red.
  await expect(page.getByText(new RegExp(`Continuar sin conexión como ${NOMBRE}`))).toHaveCount(0)
  await context.close()
})
