import { describe, expect, it } from "vitest"

import { conMetaPorDefecto } from "./modulos-persistibles"

describe("conMetaPorDefecto", () => {
  it.each(["observador", "matricula", "audits", "comunicados-gestion"])("guarda %s", (raiz) => {
    expect(conMetaPorDefecto<Parameters<typeof conMetaPorDefecto>[0]>({ queryKey: [raiz, "x"] }).meta?.offline).toBeTruthy()
  })
  it.each(["auth-user", "segundo-factor", "archivo", "verificacion-boletin", "devices"])("nunca guarda %s", (raiz) => {
    expect(conMetaPorDefecto<Parameters<typeof conMetaPorDefecto>[0]>({ queryKey: [raiz, "x"] }).meta).toBeUndefined()
  })
  it("respeta la meta propia", () => {
    const o = { queryKey: ["matricula"], meta: { offline: { ttl: 5 } } }
    expect(conMetaPorDefecto(o)).toBe(o)
  })
})
