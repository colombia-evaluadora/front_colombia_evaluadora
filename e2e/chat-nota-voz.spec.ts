import { expect, test, type Page } from "@playwright/test"

// Chat con MSW: nota de voz con el micrófono falso de Chromium (grabar, escuchar antes de
// enviar, quitar, enviar y reproducir en el hilo) y el aviso cuando se niega el permiso.
test.setTimeout(300_000)
const CHAT = "/app/comunicaciones/chat"

// El primer ingreso tras arrancar MSW a veces rebota al login: se espera al service worker y
// se reintenta una vez (como `chat-pantallas.spec.ts`). La primera carga del chat compila en Vite: espera larga.
async function login(page: Page, email: string) {
  await page.goto(`/login?redirectTo=${encodeURIComponent(CHAT)}`)
  await page.waitForFunction(() => !!navigator.serviceWorker?.controller, null, { timeout: 60_000 })
  for (let intento = 0; intento < 2; intento++) {
    if (!new URL(page.url()).pathname.startsWith("/login")) break
    await page.getByLabel("Correo electrónico").fill(email)
    await page.getByLabel("Contraseña", { exact: true }).fill("password")
    const compartido = page.getByRole("checkbox", { name: "Este es un equipo compartido" })
    if (
      (await compartido.count()) &&
      (await compartido.isChecked()) &&
      (await compartido.isEnabled())
    ) {
      await compartido.click()
    }
    await page.getByRole("button", { name: "Ingresar" }).click()
    await page.waitForURL((u) => u.pathname.startsWith("/app"), { timeout: 30_000 })
    await page.waitForTimeout(1_500)
  }
  if (!page.url().includes(CHAT)) await page.goto(CHAT)
  await page.getByRole("navigation", { name: "Conversaciones" }).waitFor({ timeout: 150_000 })
}


test.use({
  launchOptions: { args: ["--use-fake-device-for-media-stream", "--use-fake-ui-for-media-stream"] },
  permissions: ["microphone"],
})

async function abrirConversacion(page: Page) {
  await login(page, "user@example.com")
  await page
    .getByRole("navigation", { name: "Conversaciones" })
    .getByRole("button", { name: /^02-docentes-general/ })
    .first()
    .click()
}

async function grabar(page: Page, ms: number) {
  await page.getByRole("button", { name: "Grabar nota de voz" }).click()
  await expect(page.getByRole("status").filter({ hasText: "Grabando nota de voz" })).toBeVisible()
  await page.waitForTimeout(ms)
  await expect(page.getByText(/0:0[1-9] \/ 5:00/)).toBeVisible()
}

test("nota de voz: se graba, se escucha, se quita, se envía y se reproduce en el hilo", async ({ page }) => {
  await abrirConversacion(page)
  const pendientes = page.getByRole("list", { name: /^Archivos para enviar/ })

  // Cancelar no deja nada.
  await page.getByRole("button", { name: "Grabar nota de voz" }).click()
  await page.getByRole("button", { name: "Cancelar grabación" }).click()
  await expect(pendientes).toHaveCount(0)

  // Grabar y quitar.
  await grabar(page, 1_500)
  await page.getByRole("button", { name: "Detener grabación" }).click()
  const nota = pendientes.getByRole("listitem")
  await expect(nota).toHaveCount(1)
  await expect(nota.locator("audio")).toHaveCount(1)
  await expect(nota).toContainText(/nota-de-voz-.*\.weba/)
  await nota.getByRole("button", { name: /^Quitar nota-de-voz/ }).click()
  await expect(pendientes).toHaveCount(0)

  // Grabar, escuchar la previa y enviar.
  await grabar(page, 2_000)
  await page.getByRole("button", { name: "Detener grabación" }).click()
  const duracion = await nota.locator("audio").evaluate(
    (a: HTMLAudioElement) =>
      new Promise<number>((ok) => {
        if (a.readyState >= 1) ok(a.duration)
        else a.addEventListener("loadedmetadata", () => ok(a.duration), { once: true })
      }),
  )
  expect(duracion === Infinity || duracion > 0).toBe(true)
  const nombre = (await nota.textContent())?.match(/nota-de-voz-[\d-]+\.weba/)?.[0] as string
  await page.getByRole("button", { name: "Enviar mensaje" }).click()
  await expect(pendientes).toHaveCount(0)

  // En el hilo: tarjeta con descarga y "Escuchar" → reproductor inline.
  const lista = page.getByRole("list", { name: "Archivo adjunto" }).filter({ hasText: nombre })
  await expect(lista).toBeVisible()
  await expect(lista.getByRole("button", { name: `Descargar ${nombre}` })).toBeEnabled()
  await lista.getByRole("button", { name: `Escuchar ${nombre}` }).click()
  const audio = lista.locator("audio")
  await expect(audio).toHaveCount(1)
  await expect(audio).toHaveAttribute("src", /^blob:/)
  await expect
    .poll(() => audio.evaluate((a: HTMLAudioElement) => a.error?.code ?? 0))
    .toBe(0)
  // El autor puede quitarla (escuchar no cuenta como descarga).
  await expect(lista.getByRole("button", { name: `Eliminar ${nombre}` })).toBeEnabled()
})

test("nota de voz: si se niega el micrófono se explica cómo habilitarlo", async ({ page }) => {
  await page.addInitScript(() => {
    navigator.mediaDevices.getUserMedia = () =>
      Promise.reject(new DOMException("Permission denied", "NotAllowedError"))
  })
  await abrirConversacion(page)
  await page.getByRole("button", { name: "Grabar nota de voz" }).click()
  await expect(page.getByRole("alert").filter({ hasText: "permiso para usar el micrófono" })).toBeVisible()
  await expect(page.getByRole("button", { name: "Grabar nota de voz" })).toBeEnabled()
})

test("nota de voz: navegador sin MediaRecorder", async ({ page }) => {
  await page.addInitScript(() => {
    // @ts-expect-error simulación de un navegador viejo
    delete window.MediaRecorder
  })
  await abrirConversacion(page)
  await page.getByRole("button", { name: "Grabar nota de voz" }).click()
  await expect(page.getByRole("alert").filter({ hasText: "no permite grabar notas de voz" })).toBeVisible()
})
