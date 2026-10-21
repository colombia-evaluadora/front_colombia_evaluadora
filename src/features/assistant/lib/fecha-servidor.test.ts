import { describe, expect, it } from "vitest"

import { fechaServidor } from "@/features/assistant/lib/fecha-servidor"

describe("fechaServidor", () => {
  it("lee la fecha sin zona como UTC", () => {
    expect(fechaServidor("2026-10-20T15:10:00").toISOString()).toBe("2026-10-20T15:10:00.000Z")
  })

  it("respeta la zona si viene", () => {
    expect(fechaServidor("2026-10-20T10:10:00-05:00").toISOString()).toBe("2026-10-20T15:10:00.000Z")
  })

  it("sin valor da fecha inválida", () => {
    expect(Number.isNaN(fechaServidor(null).getTime())).toBe(true)
  })
})
