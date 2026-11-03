import { afterEach, describe, expect, it, vi } from "vitest"

import { CAPTCHA_HEADER } from "@/lib/captcha"
import worker from "../../worker/index.js"

// El Worker de Cloudflare reenvía `/api/*` al gateway del SSO: si filtrara
// headers, el SSO respondería 403 a todo formulario público con captcha.
describe("worker/index.js reenvía X-Captcha-Token", () => {
  afterEach(() => vi.unstubAllGlobals())

  it("el header llega al gateway tal cual", async () => {
    const upstream = vi.fn(async (_req: Request) => new Response("{}", { status: 200 }))
    vi.stubGlobal("fetch", upstream)

    const res = await worker.fetch(
      new Request("https://testv2.colombiaevaluadora.com/api/auth/login", {
        method: "POST",
        headers: { [CAPTCHA_HEADER]: "tok-123", "Content-Type": "application/json" },
        body: "{}",
      }),
      { API_PROXY_TARGET: "http://gateway.interno:8080", ASSETS: { fetch: vi.fn() } },
    )

    expect(res.status).toBe(200)
    const forwarded = upstream.mock.calls[0][0]
    expect(forwarded.url).toBe("http://gateway.interno:8080/api/auth/login")
    expect(forwarded.headers.get(CAPTCHA_HEADER)).toBe("tok-123")
  })
})
