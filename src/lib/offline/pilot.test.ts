import { describe, expect, it } from "vitest"

import { canChoosePersonalDevice, isOfflinePilotUser, parseOfflinePilot } from "@/lib/offline/pilot"

describe("piloto offline", () => {
  it("vacío: nadie puede elegir equipo personal", () => {
    const cfg = parseOfflinePilot("")
    expect(canChoosePersonalDevice("a@x.co", cfg)).toBe(false)
    expect(isOfflinePilotUser({ email: "a@x.co", roles: ["DOCENTE"] }, cfg)).toBe(false)
  })

  it("por correo, sin distinguir mayúsculas", () => {
    const cfg = parseOfflinePilot(" A@x.co , b@x.co")
    expect(canChoosePersonalDevice("a@X.co", cfg)).toBe(true)
    expect(canChoosePersonalDevice("c@x.co", cfg)).toBe(false)
    expect(isOfflinePilotUser({ email: "B@x.co", roles: [] }, cfg)).toBe(true)
  })

  it("por rol: habilita el checkbox y se confirma con el token", () => {
    const cfg = parseOfflinePilot("CEVAL-PILOTO")
    expect(canChoosePersonalDevice("cualquiera@x.co", cfg)).toBe(true)
    expect(isOfflinePilotUser({ email: "c@x.co", roles: ["CEVAL-PILOTO"] }, cfg)).toBe(true)
    expect(isOfflinePilotUser({ email: "c@x.co", roles: ["OTRO"] }, cfg)).toBe(false)
  })

  it("`*` habilita a todos", () => {
    const cfg = parseOfflinePilot("*")
    expect(isOfflinePilotUser({ email: "z@x.co", roles: [] }, cfg)).toBe(true)
  })
})
