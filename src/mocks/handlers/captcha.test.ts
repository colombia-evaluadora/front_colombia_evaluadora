import { afterAll, beforeAll, describe, expect, it, vi } from "vitest"
import { setupServer } from "msw/node"

import { CAPTCHA_HEADER, MOCK_CAPTCHA_TOKEN, captchaHeaders } from "@/lib/captcha"
import { authHandlers } from "@/mocks/handlers/auth"
import { BOLETIN_MOCK_ULTIMOS4, verificacionBoletinHandlers } from "@/mocks/handlers/verificacion-boletin"

// Contrato del captcha en los mocks = el del SSO: sin `X-Captcha-Token` los
// endpoints públicos responden 403 con el mensaje en español.
const server = setupServer(...authHandlers, ...verificacionBoletinHandlers)
// Los handlers de auth usan rutas relativas (`/api/...`, como el browser
// worker): en Node MSW las resuelve contra `location`.
beforeAll(() => {
  vi.stubGlobal("location", new URL("http://localhost/"))
  server.listen({ onUnhandledRequest: "error" })
})
afterAll(() => {
  server.close()
  vi.unstubAllGlobals()
})

const BASE = "http://localhost/api"
const CODIGO = "VIGdEfGhIjKlMnOpQrStUvWx"

const login = (headers: Record<string, string>) =>
  fetch(`${BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify({ email: "admin@example.com", password: "password" }),
  })

describe("captchaHeaders", () => {
  it("manda el header solo si hay token", () => {
    expect(captchaHeaders("tok")).toEqual({ [CAPTCHA_HEADER]: "tok" })
    expect(captchaHeaders("")).toEqual({})
    expect(captchaHeaders(null)).toEqual({})
    expect(captchaHeaders(undefined)).toEqual({})
  })
})

describe("captcha en los mocks de auth", () => {
  it("login sin token → 403 con el mensaje del SSO", async () => {
    const res = await login({})
    expect(res.status).toBe(403)
    expect(((await res.json()) as { message: string }).message).toMatch(/verificación de seguridad/)
  })

  it("login con el token del bypass → 200", async () => {
    const res = await login(captchaHeaders(MOCK_CAPTCHA_TOKEN))
    expect(res.status).toBe(200)
    expect(((await res.json()) as { token: string }).token).toBeTruthy()
  })

  it.each([
    ["GET", "/sso-admin/forgotPassword?email=admin@example.com"],
    ["GET", "/sso-admin/resetTokenStatus?token=x"],
    ["GET", "/sso-admin/activationTokenStatus?token=x"],
    ["POST", "/sso-admin/restorePassword"],
    ["POST", "/sso-admin/activateAccount"],
  ])("%s %s exige captcha", async (method, path) => {
    const init = (headers: Record<string, string>): RequestInit => ({
      method,
      headers: { "Content-Type": "application/json", ...headers },
      body: method === "POST" ? JSON.stringify({ token: "x", password: "Clave-123" }) : undefined,
    })
    expect((await fetch(`${BASE}${path}`, init({}))).status).toBe(403)
    expect((await fetch(`${BASE}${path}`, init(captchaHeaders(MOCK_CAPTCHA_TOKEN)))).status).not.toBe(403)
  })
})

describe("captcha en el PDF público del boletín", () => {
  const pdf = (headers: Record<string, string>, ultimos4 = BOLETIN_MOCK_ULTIMOS4) =>
    fetch(`${BASE}/reportes/public/boletin/${CODIGO}/pdf`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...headers },
      body: JSON.stringify({ ultimos4 }),
    })

  it("el estado no exige captcha", async () => {
    const res = await fetch(`${BASE}/reportes/public/boletin/${CODIGO}`)
    expect(res.status).toBe(200)
    expect(((await res.json()) as { estado: string }).estado).toBe("VIGENTE")
  })

  it("sin token → 403 de captcha antes de comparar dígitos", async () => {
    const res = await pdf({})
    expect(res.status).toBe(403)
    expect(((await res.json()) as { message: string }).message).toMatch(/verificación de seguridad/)
  })

  it("con token: dígitos correctos → PDF; incorrectos → 403 de dígitos", async () => {
    const ok = await pdf(captchaHeaders(MOCK_CAPTCHA_TOKEN))
    expect(ok.status).toBe(200)
    expect(ok.headers.get("Content-Type")).toBe("application/pdf")
    const mal = await pdf(captchaHeaders(MOCK_CAPTCHA_TOKEN), "9999")
    expect(mal.status).toBe(403)
    expect(await mal.text()).not.toMatch(/verificación de seguridad/)
  })
})
