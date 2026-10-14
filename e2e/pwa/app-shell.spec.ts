import { expect, test } from "@playwright/test"

// Tarea 1.1 / spec `app-shell`: tras una visita online, recargar sin red sirve
// el shell y los chunks desde el precache; `/api` nunca sale del cache del SW.

// Sin backend, `/auth/refresh` falla y el login tarda los reintentos de la
// Fase 0 en aparecer: por eso los timeouts amplios.
test("recarga sin red sirve el app shell desde el precache", async ({ page, context }) => {
  await page.goto("/login")
  // Primera visita: el SW se instala y activa, pero no reclama la página
  // (sin clients.claim, a propósito). Se espera a que esté activo y se recarga
  // para que la controle.
  await page.evaluate(async () => {
    const registration = await navigator.serviceWorker.ready
    const sw = registration.active
    if (sw && sw.state !== "activated") {
      await new Promise<void>((resolve) =>
        sw.addEventListener("statechange", () => sw.state === "activated" && resolve()),
      )
    }
  })
  await page.reload()
  await expect
    .poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller)))
    .toBe(true)
  await expect(page.getByLabel("Correo electrónico")).toBeVisible({ timeout: 30_000 })

  await context.setOffline(true)
  await page.reload()
  await expect(page).toHaveTitle("Colombia Evaluadora")
  await expect(page.getByLabel("Correo electrónico")).toBeVisible({ timeout: 30_000 })

  // Navegación profunda que nunca se visitó: el fallback responde index.html.
  await page.goto("/verificar/b/ABC123")
  await expect(page.locator("#root")).not.toBeEmpty()

  // `/api` no se intercepta: sin red falla, no viene del cache.
  const apiStatus = await page.evaluate(async () => {
    try {
      const r = await fetch("/api/eval-col/health", { cache: "no-store" })
      return r.status
    } catch {
      return "network-error"
    }
  })
  expect(apiStatus).toBe("network-error")

  const cachedApi = await page.evaluate(async () => {
    for (const key of await caches.keys()) {
      const cache = await caches.open(key)
      const reqs = await cache.keys()
      if (reqs.some((r) => new URL(r.url).pathname.startsWith("/api"))) return true
    }
    return false
  })
  expect(cachedApi).toBe(false)
  await context.setOffline(false)
})
