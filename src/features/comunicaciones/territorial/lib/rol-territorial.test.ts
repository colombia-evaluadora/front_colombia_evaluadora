import { describe, expect, it } from "vitest"

import { esUsuarioTerritorial } from "@/features/comunicaciones/territorial/lib/rol-territorial"

describe("esUsuarioTerritorial", () => {
  it("reconoce al Supervisor y al Administrador territorial", () => {
    expect(esUsuarioTerritorial(["CEVAL-SUP_TER"])).toBe(true)
    expect(esUsuarioTerritorial(["CEVAL-DOCENTE", "CEVAL-ADM_TER"])).toBe(true)
    expect(esUsuarioTerritorial([" ceval-sup_ter "])).toBe(true)
  })

  it("no confunde otros roles ni una sesión sin roles", () => {
    expect(esUsuarioTerritorial(["CEVAL-RECTOR", "CEVAL-SUPER_ADMINISTRADOR"])).toBe(false)
    expect(esUsuarioTerritorial([])).toBe(false)
    expect(esUsuarioTerritorial(undefined)).toBe(false)
    expect(esUsuarioTerritorial(null)).toBe(false)
  })
})
