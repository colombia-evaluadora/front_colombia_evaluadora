import { AxiosError, type AxiosResponse } from "axios"
import { describe, expect, it } from "vitest"

import { PLAZO_RETIRO_MS, restanteRetiro, segundosDePausa } from "@/features/comunicaciones/chat/lib/limites-mensaje"

const conEstado = (status: number, headers = {}) =>
  new AxiosError("x", "E", undefined, undefined, { status, headers } as AxiosResponse)

describe("restanteRetiro", () => {
  const envio = "2026-11-03T15:00:00Z"
  const t0 = Date.parse(envio)

  it("cuenta 15 minutos desde el envío y luego queda en 0", () => {
    expect(restanteRetiro(envio, t0)).toBe(PLAZO_RETIRO_MS)
    expect(restanteRetiro(envio, t0 + PLAZO_RETIRO_MS - 1)).toBe(1)
    expect(restanteRetiro(envio, t0 + PLAZO_RETIRO_MS)).toBe(0)
    expect(restanteRetiro(envio, t0 + 2 * PLAZO_RETIRO_MS)).toBe(0)
  })
})

describe("segundosDePausa", () => {
  it("usa Retry-After del 429 o una pausa por defecto", () => {
    expect(segundosDePausa(conEstado(429, { "retry-after": "20" }))).toBe(20)
    expect(segundosDePausa(conEstado(429))).toBe(30)
  })

  it("ignora los demás errores", () => {
    expect(segundosDePausa(conEstado(400))).toBeNull()
    expect(segundosDePausa(new Error("x"))).toBeNull()
  })
})
