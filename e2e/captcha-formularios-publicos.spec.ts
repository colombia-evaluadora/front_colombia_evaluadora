import { expect, test, type Page, type Request } from "@playwright/test"

/**
 * Captcha (Turnstile) de los formularios públicos, con MSW: en modo mock no hay
 * widget de Cloudflare (bypass) pero cada request pública debe llevar
 * `X-Captcha-Token`, porque los handlers de `src/mocks` la rechazan con 403 si
 * falta, igual que el SSO.
 */
const HEADER = "x-captcha-token"
const CODIGO = "VIGdEfGhIjKlMnOpQrStUvWx"

function capturar(page: Page, patron: RegExp) {
  const vistas: Request[] = []
  page.on("request", (r) => {
    if (patron.test(new URL(r.url()).pathname)) vistas.push(r)
  })
  return vistas
}

function sinCloudflare(page: Page) {
  const externas: string[] = []
  page.on("request", (r) => {
    if (r.url().includes("challenges.cloudflare.com")) externas.push(r.url())
  })
  return externas
}

test("login manda el token del captcha y entra a la app", async ({ page }) => {
  const externas = sinCloudflare(page)
  const logins = capturar(page, /^\/api\/auth\/login$/)

  await page.goto("/login")
  await page.getByLabel("Correo electrónico").fill("admin@example.com")
  await page.getByLabel("Contraseña", { exact: true }).fill("password")
  const ingresar = page.getByRole("button", { name: "Ingresar" })
  await expect(ingresar).toBeEnabled()
  await ingresar.click()
  await page.waitForURL((url) => url.pathname.startsWith("/app"))

  expect(logins).toHaveLength(1)
  expect(logins[0].headers()[HEADER]).toBeTruthy()
  // El token no viaja en el body (sería una hoja más para el backend).
  expect(logins[0].postData()).not.toContain("captcha")
  expect(externas).toEqual([])
  await expect(page.getByTestId("captcha")).toHaveCount(0)
})

test("olvidé mi contraseña y check-email mandan el token", async ({ page }) => {
  const forgot = capturar(page, /^\/api\/sso-admin\/forgotPassword$/)
  const status = capturar(page, /^\/api\/sso-admin\/resetTokenStatus$/)

  await page.goto("/forgot-password")
  await page.getByLabel("Correo electrónico").fill("admin@example.com")
  await page.getByRole("button", { name: "Enviar instrucciones" }).click()
  await page.waitForURL((url) => url.pathname === "/check-email")
  await expect(page.getByText("¡Instrucciones enviadas!")).toBeVisible()
  await expect(page.getByText(/El enlace vence en/)).toBeVisible()

  expect(forgot[0].headers()[HEADER]).toBeTruthy()
  // La consulta de la pantalla check-email (la que pinta la cuenta regresiva).
  const desdeCheckEmail = status.filter((r) => r.headers()[HEADER])
  expect(desdeCheckEmail.length).toBeGreaterThan(0)
})

test("activar cuenta: el estado del enlace y el envío llevan el token", async ({ page }) => {
  const status = capturar(page, /^\/api\/sso-admin\/activationTokenStatus$/)
  const activar = capturar(page, /^\/api\/sso-admin\/activateAccount$/)

  await page.goto("/activate?token=mock-activation-token")
  await expect(page.getByText("Activa tu cuenta")).toBeVisible()
  await page.getByLabel("Nueva contraseña", { exact: true }).fill("Clave-Segura-2026!")
  await page.getByLabel("Confirma tu nueva contraseña").fill("Clave-Segura-2026!")
  await page.getByRole("button", { name: "Activar cuenta" }).click()
  await page.waitForURL((url) => url.pathname === "/login")

  expect(status[0].headers()[HEADER]).toBeTruthy()
  expect(activar[0].headers()[HEADER]).toBeTruthy()
})

test("boletín público: el PDF exige el token, el estado no", async ({ page }) => {
  const estado = capturar(page, new RegExp(`^/api/reportes/public/boletin/${CODIGO}$`))
  const pdf = capturar(page, new RegExp(`^/api/reportes/public/boletin/${CODIGO}/pdf$`))

  await page.goto(`/verificar/b/${CODIGO}`)
  await expect(page.getByText("Boletín auténtico y vigente")).toBeVisible()
  await page.getByLabel(/últimos 4 dígitos/).fill("1234")
  await page.getByRole("button", { name: "Ver boletín" }).click()
  await expect(page.getByRole("button", { name: "Descargar PDF" })).toBeVisible()

  expect(estado[0].headers()[HEADER]).toBeUndefined()
  expect(pdf[0].headers()[HEADER]).toBeTruthy()
})
