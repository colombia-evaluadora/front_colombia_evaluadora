import { expect, test, type Page, type Request } from "@playwright/test"

// "Preparar sin conexión" y el fin de la sesión (QA): al cerrar sesión con una
// preparación en curso, las tareas que faltaban seguían saliendo con el token
// viejo — decenas de 401 en la red y varios "Tu sesión no es válida"
// apilados. Ahora el logout aborta la corrida y nada más sale; y si la sesión
// vence durante la autopreparación, la corrida se detiene limpia.

const SESSION_TOAST = "Tu sesión no es válida"

async function login(page: Page, email: string, init?: () => void) {
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
  if (init) await page.evaluate(init)
  await page.reload()
  await page.getByLabel("Correo electrónico").fill(email)
  await page.getByLabel("Contraseña", { exact: true }).fill("password")
  const compartido = page.getByRole("checkbox", { name: "Este es un equipo compartido" })
  if (await compartido.isChecked()) await compartido.click()
  await page.getByRole("button", { name: "Ingresar" }).click()
  await page.waitForURL((url) => url.pathname.startsWith("/app/"))
}

/** Requests a la API (sin las de auth ni el heartbeat) desde `desde()`. */
function apiRequests(page: Page) {
  const all: { t: number; url: string }[] = []
  page.on("request", (req: Request) => {
    const url = new URL(req.url())
    if (!url.pathname.startsWith("/api/")) return
    if (url.pathname.startsWith("/api/auth/") || url.pathname.startsWith("/api/eval-col/health")) return
    all.push({ t: Date.now(), url: url.pathname })
  })
  return { after: (t: number) => all.filter((r) => r.t > t) }
}

async function countSessionToasts(page: Page) {
  return page.locator("[data-sonner-toast]").filter({ hasText: SESSION_TOAST }).count()
}

test("logout a mitad de Preparar: 0 requests después y a lo sumo un toast", async ({ page }) => {
  test.setTimeout(180_000)
  const reqs = apiRequests(page)
  await login(page, "docente@example.com")
  await page.waitForLoadState("networkidle")

  await page.getByRole("button", { name: "Cuenta de usuario" }).click()
  await page.getByRole("menuitem", { name: "Preparar para usar sin conexión" }).click()
  const dialog = page.getByRole("dialog", { name: "Preparar para usar sin conexión" })
  await dialog.getByRole("button", { name: "Preparar todo" }).click()
  const chip = page.locator('[data-slot="offline-data-status"]')
  await expect(chip).toHaveAttribute("title", /^Preparando… \d+ %$/, { timeout: 15_000 })

  // Cerrar sesión con la corrida en curso.
  await page.getByRole("button", { name: "Cuenta de usuario" }).click()
  const logout = page.waitForResponse((r) => r.url().includes("/api/auth/logout"))
  await page.getByRole("menuitem", { name: "Cerrar sesión" }).click()
  await logout
  const t = Date.now()
  await page.waitForURL((url) => url.pathname.startsWith("/login"), { timeout: 15_000 })

  // Lo que estaba en vuelo terminó (abortado) y nada nuevo sale.
  await page.waitForTimeout(8_000)
  expect(reqs.after(t), JSON.stringify(reqs.after(t).slice(0, 10))).toHaveLength(0)
  expect(await countSessionToasts(page)).toBeLessThanOrEqual(1)

  // Al volver a entrar, la corrida quedó para "Continuar" (detenida por la sesión).
  await page.getByLabel("Correo electrónico").fill("docente@example.com")
  await page.getByLabel("Contraseña", { exact: true }).fill("password")
  const compartido = page.getByRole("checkbox", { name: "Este es un equipo compartido" })
  if (await compartido.isChecked()) await compartido.click()
  await page.getByRole("button", { name: "Ingresar" }).click()
  await page.waitForURL((url) => url.pathname.startsWith("/app/"))
  await page.getByRole("button", { name: "Cuenta de usuario" }).click()
  await page.getByRole("menuitem", { name: "Preparar para usar sin conexión" }).click()
  await expect(
    page
      .getByRole("dialog", { name: "Preparar para usar sin conexión" })
      .getByRole("button", { name: /Continuar/ }),
  ).toBeVisible({ timeout: 15_000 })
})

test("autopreparación y sesión vencida: se detiene limpia, sin tormenta de 401 ni toasts apilados", async ({
  page,
}) => {
  test.setTimeout(180_000)
  const reqs = apiRequests(page)
  const status401: number[] = []
  page.on("response", (r) => {
    if (r.status() === 401 && new URL(r.url()).pathname.startsWith("/api/")) status401.push(Date.now())
  })
  await login(page, "docente@example.com", () => localStorage.setItem("ce-offline-auto-prepare", "on"))
  const chip = page.locator('[data-slot="offline-data-status"]')
  // La autopreparación arranca sola (~5 s después de entrar).
  await expect(chip).toHaveAttribute("title", /^Preparando… \d+ %$/, { timeout: 30_000 })

  // La sesión vence en el servidor: todo responde 401 (refresh incluido).
  await page.evaluate(() => sessionStorage.setItem("msw:fault", "expired"))
  const t = Date.now()
  await page.waitForURL((url) => url.pathname.startsWith("/login"), { timeout: 30_000 })
  const tLogin = Date.now()
  // La falla sigue puesta: la cookie de la sesión vieja ya no sirve.
  await page.waitForTimeout(8_000)

  // Unos pocos 401 (los que estaban en vuelo y el refresh), no una tormenta.
  expect(status401.filter((x) => x > t).length).toBeLessThanOrEqual(10)
  // En /login ya no sale nada de la sesión vieja.
  expect(reqs.after(tLogin + 1_000), JSON.stringify(reqs.after(tLogin + 1_000).slice(0, 10))).toHaveLength(0)
  expect(await countSessionToasts(page)).toBeLessThanOrEqual(1)
  await page.evaluate(() => sessionStorage.removeItem("msw:fault"))
})
