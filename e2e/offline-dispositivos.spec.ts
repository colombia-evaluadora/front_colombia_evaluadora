import { expect, test, type BrowserContext, type Page } from "@playwright/test"

// Credencial del equipo y borrado remoto (`add-offline-meses-pwa` D-3/D-8) y
// conflicto por VERSION del planeador (BE-3B). Contra el dev server con MSW:
// la tabla de equipos del mock (`localStorage["msw:devices"]`, solo hashes)
// sobrevive a la recarga, como el servidor real.

const USUARIO = "docente@example.com"

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

async function limpiar(page: Page) {
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
  await page.reload()
}

interface MockDevice {
  id: number
  email: string
  deviceId: string
  tokenHash: string
  lastUsedAt: string | null
  revokedAt: string | null
  wipeRequested: boolean
  wipedAt: string | null
}

const equiposDelMock = (page: Page) =>
  page.evaluate(() => JSON.parse(localStorage.getItem("msw:devices") ?? "[]") as MockDevice[])

/** Claves `meta` de IndexedDB que empiezan por `prefix`, con su valor serializado. */
async function metaCon(page: Page, prefix: string): Promise<Record<string, string>> {
  return page.evaluate(
    (p) =>
      new Promise<Record<string, string>>((resolve) => {
        const req = indexedDB.open("ce-offline")
        req.onerror = () => resolve({})
        req.onsuccess = () => {
          const db = req.result
          if (!db.objectStoreNames.contains("meta")) {
            db.close()
            return resolve({})
          }
          const out: Record<string, string> = {}
          const cursor = db.transaction("meta").objectStore("meta").openCursor()
          cursor.onsuccess = () => {
            const c = cursor.result
            if (!c) {
              db.close()
              return resolve(out)
            }
            if (String(c.key).startsWith(p)) out[String(c.key)] = JSON.stringify(c.value)
            c.continue()
          }
          cursor.onerror = () => resolve(out)
        }
      }),
    prefix,
  )
}

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
            id: "e2e-pendiente-revocado",
            seq: 1,
            userSub: usuario,
            kind: "asistencia.registrar",
            handlerVersion: 1,
            entityKey: "asistencia:e2e",
            dependsOn: [],
            payload: { e2e: true },
            blobRefs: [],
            idempotencyKey: "e2e-pendiente-revocado",
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

test("equipo registrado: sincroniza sin contraseña, se revoca con borrado y borra sus datos", async ({ browser }) => {
  test.setTimeout(180_000)
  const context = await browser.newContext()
  await emularAppInstalada(context)
  const page = await context.newPage()
  await limpiar(page)

  await page.getByLabel("Correo electrónico").fill(USUARIO)
  await page.getByLabel("Contraseña", { exact: true }).fill("password")
  await page.getByRole("button", { name: "Ingresar" }).click()
  await page.waitForURL((url) => url.pathname.startsWith("/app/"))

  // 1. Registro automático: el servidor guarda solo el hash; el equipo, el
  //    token cifrado (nunca en claro ni en localStorage).
  await expect.poll(async () => (await equiposDelMock(page)).filter((d) => d.email === USUARIO).length, {
    timeout: 20_000,
  }).toBe(1)
  const [registrado] = await equiposDelMock(page)
  const tokenMeta = await metaCon(page, `device:token:${USUARIO}`)
  expect(Object.keys(tokenMeta)).toHaveLength(1)
  const guardado = JSON.parse(Object.values(tokenMeta)[0]) as { mode: string; sealed: string }
  expect(guardado.mode).toBe("key")
  expect(guardado.sealed).toMatch(/^[A-Za-z0-9+/=]+:[A-Za-z0-9+/=]+$/)
  const enLocalStorage = await page.evaluate(() => Object.keys(localStorage).filter((k) => !k.startsWith("msw:")))
  expect(enLocalStorage.join(",")).not.toMatch(/device/i)

  // 2. Sin cookie de sesión (meses después): el token del equipo abre la sesión
  //    y rota (el hash del servidor cambia).
  await context.clearCookies()
  await page.goto("/app/mis-dispositivos")
  await expect(page.getByRole("heading", { name: "Mis dispositivos" })).toBeVisible({ timeout: 30_000 })
  await expect(page.locator("[data-slot=device-row]").filter({ hasText: "Este equipo" })).toBeVisible()
  const [rotado] = await equiposDelMock(page)
  expect(rotado.tokenHash).not.toBe(registrado.tokenHash)
  expect(rotado.lastUsedAt).not.toBeNull()

  // 3. Se revoca "desde otro equipo" pidiendo borrar los datos, con un cambio
  //    sin sincronizar: al volver, aviso bloqueante y borrado.
  await page.evaluate((id) => {
    const rows = JSON.parse(localStorage.getItem("msw:devices") ?? "[]") as Record<string, unknown>[]
    for (const r of rows) {
      if (r.id === id) {
        r.revokedAt = new Date().toISOString()
        r.revokeReason = "ADMIN"
        r.wipeRequested = true
      }
    }
    localStorage.setItem("msw:devices", JSON.stringify(rows))
  }, rotado.id)
  await sembrarPendiente(page, USUARIO)
  await page.goto("/app")
  const aviso = page.getByRole("dialog", { name: "Este equipo fue desconectado de tu cuenta" })
  await expect(aviso).toBeVisible({ timeout: 30_000 })
  await expect(aviso.getByRole("alert")).toContainText("1 cambio sin sincronizar")
  await aviso.getByRole("button", { name: "Entendido, borrar los datos" }).click()
  await page.waitForURL((url) => url.pathname === "/login", { timeout: 30_000 })

  // 4. Equipo limpio y borrado confirmado al servidor.
  expect(await metaCon(page, "device:")).toEqual({})
  await expect.poll(async () => (await equiposDelMock(page))[0]?.wipedAt ?? null, { timeout: 10_000 }).not.toBeNull()
  await context.close()
})

test("unidad editada sin red y cambiada por otro: conflicto por VERSION y 'Conservar mis cambios'", async ({ page }) => {
  test.setTimeout(150_000)
  await limpiar(page)
  await page.goto(`/login?redirectTo=${encodeURIComponent("/app/planeador/unidades")}`)
  await page.getByLabel("Correo electrónico").fill(USUARIO)
  await page.getByLabel("Contraseña", { exact: true }).fill("password")
  await page.getByRole("checkbox", { name: "Este es un equipo compartido" }).click()
  await page.getByRole("button", { name: "Ingresar" }).click()
  await page.waitForURL((url) => url.pathname.startsWith("/app/"))
  await page.goto("/app/planeador/unidades")

  const editar = page.getByRole("button", { name: /^Editar / }).first()
  await expect(editar).toBeEnabled({ timeout: 30_000 })
  await editar.click({ force: true })
  await page.waitForURL(/\/unidades\/editar\//)
  const unidadId = Number(new URL(page.url()).pathname.split("/").pop())

  const nombre = page.getByRole("textbox", { name: "Ej: Diseño de prototipo" })
  await expect(nombre).toBeVisible({ timeout: 30_000 })
  await nombre.fill("Unidad editada sin conexión (versión)")

  // Sin red al guardar: la edición queda en la outbox con la versión que se vio.
  await page.evaluate(() => sessionStorage.setItem("msw:fault", "planeador-writes"))
  await page.getByRole("button", { name: "Guardar", exact: true }).click()
  await expect(page.getByText(/Guardado en este equipo/).first()).toBeVisible({ timeout: 15_000 })

  // Mientras el equipo sigue sin red, OTRA persona edita la unidad (sube la
  // versión en el servidor). Después vuelve la red.
  const status = await page.evaluate(async (id) => {
    const res = await fetch(`/api/eval-col/planeador/unidades/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", "x-msw-otra-persona": "1" },
      body: JSON.stringify({ descripcion: "Cambio de otra persona" }),
    })
    return res.status
  }, unidadId)
  expect(status).toBe(200)
  await page.evaluate(() => sessionStorage.removeItem("msw:fault"))

  // Navegación dentro de la app: recargar reiniciaría la base en memoria del mock.
  await page.evaluate(() =>
    (window as unknown as { __ceRouter: { navigate: (o: { to: string }) => Promise<void> } }).__ceRouter.navigate({
      to: "/app/pendientes",
    }),
  )
  // Puede que la outbox ya lo haya intentado sola al volver la red.
  await page.getByRole("button", { name: "Sincronizar ahora" }).click({ timeout: 5_000 }).catch(() => undefined)
  const paso = page.locator("[data-slot=saga-step][data-status=conflict]").first()
  await expect(paso).toBeVisible({ timeout: 30_000 })
  await expect(paso.locator("[data-slot=saga-conflict-version]")).toContainText("Editaste la versión 1")
  await expect(paso.locator("[data-slot=saga-conflict-version]")).toContainText("ya va en la 2")

  await paso.getByRole("button", { name: "Conservar mis cambios" }).click()
  await expect(page.locator("[data-slot=saga]")).toHaveCount(0, { timeout: 30_000 })

  // Se aplicó sobre la versión actual: el servidor quedó en la 3 con el nombre nuevo.
  const detalle = await page.evaluate(async (id) => {
    const res = await fetch(`/api/eval-col/planeador/unidades/${id}`)
    return ((await res.json()) as { rows: { nombre: string; version: number }[] }).rows[0]
  }, unidadId)
  expect(detalle).toMatchObject({ nombre: "Unidad editada sin conexión (versión)", version: 3 })
})
