import { expect, test, type Page } from "@playwright/test"

// Fase 1 offline (`openspec/changes/add-offline-reads`, tareas 6.2 y 6.3),
// parte de DATOS. Corre contra el dev server con MSW: el Service Worker de la
// PWA no se registra con MSW activo (spec app-shell, "Convivencia con MSW"),
// así que acá "sin red" = API caída (`sessionStorage["msw:fault"] = "network"`)
// con la página servida por Vite. La parte del SHELL (recarga con el navegador
// realmente offline) se prueba contra el build en `e2e/pwa/app-shell.spec.ts`.

const SHOTS = process.env.E2E_SCREENSHOTS_DIR
const ACTIVIDADES = "/app/planeador/actividades"
const RECORRIDO = [
  "/app/planeador/unidades",
  "/app/planeador/planilla",
  "/app/asistencia",
  "/app/gestion-academica/referentes-curriculares",
  ACTIVIDADES,
]

async function shot(page: Page, name: string) {
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/${name}.png`, fullPage: true })
}

async function setApiFault(page: Page, fault: "network" | null) {
  await page.evaluate((f) => {
    if (f) sessionStorage.setItem("msw:fault", f)
    else sessionStorage.removeItem("msw:fault")
  }, fault)
}

/** Filas de `ce-offline.queries` (`userSub` de cada una). */
async function persistedRows(page: Page): Promise<string[]> {
  return page.evaluate(
    () =>
      new Promise<string[]>((resolve) => {
        const req = indexedDB.open("ce-offline")
        req.onerror = () => resolve([])
        req.onsuccess = () => {
          const db = req.result
          if (!db.objectStoreNames.contains("queries")) {
            db.close()
            return resolve([])
          }
          const all = db.transaction("queries").objectStore("queries").getAll()
          all.onsuccess = () => {
            db.close()
            resolve((all.result as { userSub: string }[]).map((r) => r.userSub))
          }
          all.onerror = () => resolve([])
        }
      }),
  )
}

async function login(page: Page, email: string, { shared }: { shared: boolean }) {
  await page.goto(`/login?redirectTo=${encodeURIComponent(ACTIVIDADES)}`)
  await page.getByLabel("Correo electrónico").fill(email)
  await page.getByLabel("Contraseña", { exact: true }).fill("password")
  const checkbox = page.getByRole("checkbox", { name: "Este es un equipo compartido" })
  await expect(checkbox).toBeChecked() // por defecto: compartido (§0.3)
  if (!shared) await checkbox.click()
  await page.getByRole("button", { name: "Ingresar" }).click()
  await page.waitForURL((url) => url.pathname.startsWith("/app/"))
  await page.waitForLoadState("networkidle")
}

async function recorrer(page: Page) {
  for (const path of RECORRIDO) {
    await page.goto(path)
    // Algunas pantallas hacen polling: `networkidle` nunca llega.
    await page.waitForTimeout(2_500)
  }
}

async function openAccountMenu(page: Page) {
  await page.getByRole("button", { name: "Cuenta de usuario" }).click()
}

async function logout(page: Page) {
  await openAccountMenu(page)
  await page.getByRole("menuitem", { name: "Cerrar sesión" }).click()
  await page.waitForURL((url) => url.pathname === "/login", { timeout: 15_000 })
}

test.beforeEach(async ({ page }) => {
  // Cada test arranca con un equipo limpio.
  await page.goto("/login")
  await page.evaluate(
    () =>
      new Promise<void>((resolve) => {
        const req = indexedDB.deleteDatabase("ce-offline")
        req.onsuccess = req.onerror = req.onblocked = () => resolve()
      }),
  )
  await page.evaluate(() => localStorage.clear())
})

test("6.2 equipo personal: preparar, sin red, recargar y navegar con datos guardados", async ({ page }) => {
  test.setTimeout(180_000)
  await login(page, "docente@example.com", { shared: false })
  await recorrer(page)

  await openAccountMenu(page)
  await page.getByRole("menuitem", { name: "Preparar para usar sin conexión" }).click()
  const dialog = page.getByRole("dialog", { name: "Preparar para usar sin conexión" })
  await dialog.getByRole("button", { name: "Preparar" }).click()
  await expect(dialog.getByText(/Listo\. Este equipo puede usarse sin conexión\./)).toBeVisible({ timeout: 60_000 })
  await shot(page, "f1-a-preparado")
  await dialog.getByRole("button", { name: "Cerrar", exact: true }).first().click()

  // Throttle del persister (1 s).
  await expect.poll(async () => (await persistedRows(page)).length, { timeout: 30_000 }).toBeGreaterThan(0)
  const rows = await persistedRows(page)
  expect(new Set(rows)).toEqual(new Set(["docente@example.com"]))

  await setApiFault(page, "network")
  await page.reload()
  // Entrada automática en modo sin conexión (equipo personal, session ≤ 14 días).
  await expect(page.getByRole("status").filter({ hasText: /sin conexión/i }).first()).toBeVisible({
    timeout: 30_000,
  })
  expect(new URL(page.url()).pathname).toBe(ACTIVIDADES)
  await expect(page.getByText(/^Datos del /).first()).toBeVisible({ timeout: 15_000 })
  await shot(page, "f1-b-actividades-sin-red")

  // Navegación del SPA (sin recargar: Vite dev no sirve módulos con fault de API,
  // pero sí con la página ya cargada).
  for (const [name, path] of [
    ["Unidades", "/app/planeador/unidades"],
    ["Asistencia", "/app/asistencia"],
  ] as const) {
    await page.evaluate((p) => {
      history.pushState({}, "", p)
      dispatchEvent(new PopStateEvent("popstate"))
    }, path)
    await page.waitForURL((url) => url.pathname === path)
    await page.waitForTimeout(1_500)
    await shot(page, `f1-c-${name.toLowerCase()}-sin-red`)
  }
  await page.evaluate(() => {
    history.pushState({}, "", "/app/gestion-academica/referentes-curriculares")
    dispatchEvent(new PopStateEvent("popstate"))
  })
  await page.waitForTimeout(1_500)
  await shot(page, "f1-d-referentes-sin-red")

  // Sección solo en línea entrando sin red: empty state o sin-acceso (si el
  // menú del docente no la incluye); nunca datos.
  await page.evaluate(() => {
    history.pushState({}, "", "/app/cobertura/matricula")
    dispatchEvent(new PopStateEvent("popstate"))
  })
  await expect(
    page.getByText("Esta sección necesita conexión").or(page.getByText(/no tienes acceso|sin acceso/i)).first(),
  ).toBeVisible({ timeout: 15_000 })
  await shot(page, "f1-e-solo-en-linea")

  // Logout sin red (§7.8): limpia igual las filas del usuario.
  await page.evaluate(() => {
    history.pushState({}, "", "/app/planeador/actividades")
    dispatchEvent(new PopStateEvent("popstate"))
  })
  await logout(page)
  await expect.poll(async () => (await persistedRows(page)).length, { timeout: 10_000 }).toBe(0)
  await shot(page, "f1-f-logout-sin-red")
  await setApiFault(page, null)
})

test("equipo compartido (por defecto): no se persiste nada y sin red no hay datos", async ({ page }) => {
  await login(page, "docente@example.com", { shared: true })
  await recorrer(page)
  await page.waitForTimeout(2_500)
  expect(await persistedRows(page)).toHaveLength(0)

  await setApiFault(page, "network")
  await page.reload()
  await page.waitForTimeout(10_000)
  await expect(page.getByText(/^Datos del /)).toHaveCount(0)
  await shot(page, "f1-g-compartido-sin-red")
  await setApiFault(page, null)
})

test("otro usuario en el mismo navegador no lee las filas del anterior", async ({ page, context }) => {
  test.setTimeout(120_000)
  await login(page, "docente@example.com", { shared: false })
  await recorrer(page)
  await expect.poll(async () => (await persistedRows(page)).length, { timeout: 30_000 }).toBeGreaterThan(0)
  const docenteRows = (await persistedRows(page)).length

  // Sin logout (p. ej. cookie vencida): las filas del docente quedan en el equipo.
  // MSW guarda sus cookies en su propio store (localStorage) además del navegador.
  await context.clearCookies()
  await page.evaluate(() => localStorage.clear())
  await login(page, "user@example.com", { shared: false })
  await page.waitForTimeout(2_500)
  const rows = await persistedRows(page)
  // Las del docente siguen intactas (no se reescriben con datos del otro) y
  // las del nuevo usuario van en su propia partición.
  expect(rows.filter((s) => s === "docente@example.com")).toHaveLength(docenteRows)
  expect(rows.every((s) => s === "docente@example.com" || s === "user@example.com")).toBe(true)
  await expect(page.getByText(/^Datos del /)).toHaveCount(0)

  // Logout online del segundo usuario: borra solo lo suyo.
  await logout(page)
  await expect
    .poll(async () => (await persistedRows(page)).filter((s) => s === "user@example.com").length)
    .toBe(0)
  expect((await persistedRows(page)).filter((s) => s === "docente@example.com")).toHaveLength(docenteRows)
})

test("6.3 /verificar/b sin red: solo el aviso, nunca un estado cacheado", async ({ page }) => {
  await page.goto("/verificar/b/ABC123")
  await page.waitForLoadState("networkidle")
  await setApiFault(page, "network")
  await page.reload()
  await expect(
    page.getByText(
      "No pudimos verificar el boletín porque no hay conexión. Intenta de nuevo cuando tengas internet.",
    ),
  ).toBeVisible({ timeout: 15_000 })
  await expect(page.getByText(/Boletín auténtico|Código no válido|fue reemplazado/)).toHaveCount(0)
  await shot(page, "f1-h-verificar-sin-red")
  await setApiFault(page, null)
})

test("vista solo en línea sin red: empty state 'Esta sección necesita conexión'", async ({ page }) => {
  test.setTimeout(120_000)
  // El docente fixture no tiene Cobertura ni Referentes en su menú (cae a
  // `sin-acceso` con el aviso de menú viejo): se usa el administrador.
  await login(page, "admin@example.com", { shared: false })
  // Vite compila en frío las vistas del admin: esperar a que la tabla cargue
  // (y el persister escriba) antes de cortar la API.
  await page.goto("/app/gestion-academica/referentes-curriculares")
  await expect(page.getByRole("columnheader", { name: /Nombre del referente/i })).toBeVisible({ timeout: 30_000 })
  await page.waitForTimeout(3_000)
  await setApiFault(page, "network")
  await page.reload()
  await expect(page.getByRole("status").filter({ hasText: /sin conexión/i }).first()).toBeVisible({
    timeout: 30_000,
  })
  // Referentes es de lectura offline (§8.7): datos restaurados, no el error,
  // y las escrituras deshabilitadas.
  await expect(page.getByText(/No fue posible/)).toHaveCount(0)
  await expect(page.getByRole("button", { name: /Nuevo referente/ })).toBeDisabled()
  await shot(page, "f1-i-referentes-admin-sin-red")
  await page.evaluate(() => {
    history.pushState({}, "", "/app/cobertura/matricula")
    dispatchEvent(new PopStateEvent("popstate"))
  })
  await expect(page.getByText("Esta sección necesita conexión", { exact: true })).toBeVisible({ timeout: 15_000 })
  await expect(page.getByRole("button", { name: "Reintentar" }).first()).toBeVisible()
  await shot(page, "f1-j-matricula-solo-en-linea")
  await setApiFault(page, null)
})
