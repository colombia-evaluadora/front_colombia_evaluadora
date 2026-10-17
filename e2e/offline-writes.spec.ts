import { expect, test, type Page } from "@playwright/test"

// Fase 2 offline (`openspec/changes/add-offline-writes-asistencia-planilla`,
// tarea 5.3). Contra el dev server con MSW y `VITE_APP_OFFLINE=full`
// (`playwright.config.ts`). "Sin red" = `sessionStorage["msw:fault"] =
// "network"`; "conflicto" = `"conflict"` (las escrituras de asistencia y
// planilla responden 409 OFFLINE_CONFLICT, `src/mocks/browser.ts`).

const SHOTS = process.env.E2E_SCREENSHOTS_DIR
const ASISTENCIA = "/app/asistencia"

async function shot(page: Page, name: string) {
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/${name}.png`, fullPage: true })
}

async function setApiFault(page: Page, fault: "network" | "writes" | "conflict" | null) {
  await page.evaluate((f) => {
    if (f) sessionStorage.setItem("msw:fault", f)
    else sessionStorage.removeItem("msw:fault")
  }, fault)
}

/** Filas de `ce-offline.outbox` (estado de cada una). */
async function outboxStatuses(page: Page): Promise<string[]> {
  return page.evaluate(
    () =>
      new Promise<string[]>((resolve) => {
        const req = indexedDB.open("ce-offline")
        req.onerror = () => resolve([])
        req.onsuccess = () => {
          const db = req.result
          if (!db.objectStoreNames.contains("outbox")) {
            db.close()
            return resolve([])
          }
          const all = db.transaction("outbox").objectStore("outbox").getAll()
          all.onsuccess = () => {
            db.close()
            resolve((all.result as { status: string }[]).map((r) => r.status))
          }
          all.onerror = () => resolve([])
        }
      }),
  )
}

async function login(page: Page) {
  await page.goto(`/login?redirectTo=${encodeURIComponent(ASISTENCIA)}`)
  await page.getByLabel("Correo electrónico").fill("docente@example.com")
  await page.getByLabel("Contraseña", { exact: true }).fill("password")
  await page.getByRole("checkbox", { name: "Este es un equipo compartido" }).click()
  await page.getByRole("button", { name: "Ingresar" }).click()
  await page.waitForURL((url) => url.pathname.startsWith("/app/"))
}

/** Abre el primer día con clases del calendario y usa "Marcar todo como Asistió". */
async function marcarTodos(page: Page) {
  await page.locator("[role=gridcell] button").first().click({ timeout: 30_000 })
  const boton = page.getByRole("button", { name: "Marcar todo como Asistió" }).first()
  await expect(boton).toBeEnabled({ timeout: 30_000 })
  await boton.click()
}

test.beforeEach(async ({ page }) => {
  await page.goto("/login")
  await page.evaluate(
    () =>
      new Promise<void>((resolve) => {
        sessionStorage.clear()
        const req = indexedDB.deleteDatabase("ce-offline")
        req.onsuccess = req.onerror = req.onblocked = () => resolve()
      }),
  )
  await page.evaluate(() => localStorage.clear())
})

test("sin red: se encola, sobrevive a la recarga y se sincroniza al volver la red", async ({ page }) => {
  test.setTimeout(150_000)
  await login(page)
  await page.goto(ASISTENCIA)
  await page.waitForTimeout(2_000)

  // La escritura sale pero la respuesta se pierde (online-first, D-F2-7):
  // se encola con la misma Idempotency-Key.
  await setApiFault(page, "writes")
  await marcarTodos(page)
  await expect(page.getByText(/Guardado en este equipo/).first()).toBeVisible({ timeout: 10_000 })
  await expect.poll(() => outboxStatuses(page)).toEqual([expect.stringMatching(/pending|retry|inflight/)])
  await expect(page.locator("[data-slot=sync-indicator]")).toContainText("1")
  await shot(page, "f2-a-encolado")

  // Cerrar y reabrir (recarga) con las escrituras caídas: la op sigue en el equipo.
  await page.reload()
  await page.goto("/app/pendientes")
  await expect(page.locator("[data-slot=pendiente-row]")).toHaveCount(1, { timeout: 30_000 })
  await expect(page.locator("[data-slot=pendiente-row]").getByRole("button", { name: "Asistencia — Marcar todos como Asistió", exact: true })).toBeVisible()
  await shot(page, "f2-b-pendientes")

  // Vuelve la red: se envía una sola vez y la cola queda vacía.
  await setApiFault(page, null)
  await expect(page.getByText("No tienes cambios pendientes. Todo está sincronizado.")).toBeVisible({ timeout: 60_000 })
  await expect.poll(() => outboxStatuses(page), { timeout: 10_000 }).toEqual(["done"])
  await shot(page, "f2-c-sincronizado")
})

test("conflicto: 409 OFFLINE_CONFLICT abre la resolución y 'Usar el del servidor' descarta", async ({ page }) => {
  test.setTimeout(150_000)
  await login(page)
  await page.goto(ASISTENCIA)
  await page.waitForTimeout(2_000)

  await setApiFault(page, "writes")
  await marcarTodos(page)
  await expect.poll(() => outboxStatuses(page)).toEqual([expect.stringMatching(/pending|retry|inflight/)])

  await setApiFault(page, "conflict")
  await expect.poll(() => outboxStatuses(page), { timeout: 60_000 }).toEqual(["conflict"])
  await expect(page.locator("[data-slot=offline-banner]")).toContainText(/chocan con modificaciones/, { timeout: 15_000 })

  await page.goto("/app/pendientes?estado=conflictos")
  await page.getByRole("button", { name: "Resolver" }).click()
  const dialog = page.locator("[data-slot=conflict-dialog]")
  await expect(dialog.getByText("Este dato cambió mientras estabas sin conexión")).toBeVisible()
  await shot(page, "f2-d-conflicto")
  await dialog.getByRole("button", { name: "Usar el del servidor" }).click()
  await expect.poll(() => outboxStatuses(page)).toEqual([])
})

test("logout con pendientes pregunta antes de salir y conserva la cola", async ({ page }) => {
  test.setTimeout(150_000)
  await login(page)
  await page.goto(ASISTENCIA)
  await page.waitForTimeout(2_000)
  await setApiFault(page, "writes")
  await marcarTodos(page)
  await expect.poll(() => outboxStatuses(page)).toEqual([expect.stringMatching(/pending|retry|inflight/)])

  await page.getByRole("button", { name: "Cuenta de usuario" }).click()
  await page.getByRole("menuitem", { name: "Cerrar sesión" }).click()
  const dialog = page.locator("[data-slot=logout-pending-dialog]")
  await expect(dialog.getByText("Tienes 1 cambios sin sincronizar")).toBeVisible()
  await shot(page, "f2-e-logout")
  await dialog.getByRole("button", { name: "Salir y conservar en este equipo" }).click()
  await page.waitForURL((url) => url.pathname === "/login", { timeout: 15_000 })
  // La op sigue en el equipo (no se borra sin avisar, D-F2-6).
  expect(await outboxStatuses(page)).toEqual([expect.stringMatching(/pending|retry/)])
})

test("Sincronizar ahora: progreso y resumen con conflictos", async ({ page }) => {
  test.setTimeout(150_000)
  await login(page)
  await page.goto(ASISTENCIA)
  await page.waitForTimeout(2_000)
  await setApiFault(page, "writes")
  await marcarTodos(page)
  await expect.poll(() => outboxStatuses(page)).toEqual([expect.stringMatching(/pending|retry|inflight/)])

  // El servidor responde conflicto: el resumen lo cuenta y no se descarta nada.
  await setApiFault(page, "conflict")
  await page.goto("/app/sincronizar")
  await page.getByRole("button", { name: "Sincronizar ahora", exact: true }).click()
  const resumen = page.getByRole("region", { name: "Resumen de la sincronización" })
  await expect(resumen).toBeVisible({ timeout: 60_000 })
  await expect(resumen).toContainText(/Conflictos: 1|Subidos: 1/)
  await shot(page, "f5-sincronizar-resumen")
})

test("paquete USB: exportar sin red e importar en otro equipo", async ({ page, browser }) => {
  test.setTimeout(200_000)
  await login(page)
  await page.goto(ASISTENCIA)
  await page.waitForTimeout(2_000)
  await setApiFault(page, "writes")
  await marcarTodos(page)
  await expect.poll(() => outboxStatuses(page)).toEqual([expect.stringMatching(/pending|retry|inflight/)])

  await setApiFault(page, "network")
  await page.goto("/app/sincronizar")
  await page.getByLabel(/Frase del paquete/).fill("frase de prueba")
  const descarga = page.waitForEvent("download")
  await page.getByRole("button", { name: "Exportar paquete" }).click()
  const archivo = await (await descarga).path()
  await expect(page.getByText(/Paquete con 1 cambios descargado/)).toBeVisible()

  // Otro equipo, con internet y la misma cuenta.
  const otro = await browser.newContext()
  const p2 = await otro.newPage()
  await login(p2)
  await p2.goto("/app/sincronizar")
  await p2.getByLabel(/Frase del paquete/).fill("frase de prueba")
  await p2.getByLabel("Archivo de paquete").setInputFiles(archivo)
  await p2.getByRole("button", { name: "Importar paquete" }).click()
  await expect(p2.getByText(/Se agregaron 1 cambios a la cola/)).toBeVisible({ timeout: 30_000 })
  await expect.poll(() => outboxStatuses(p2), { timeout: 60_000 }).toEqual(["done"])
  await otro.close()
})
