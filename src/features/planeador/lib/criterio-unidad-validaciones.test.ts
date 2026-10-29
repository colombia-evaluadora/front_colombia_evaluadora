import { describe, expect, it } from "vitest"

import { CRITERIO_UNIDAD_MAX, validarCriterioUnidad } from "@/features/planeador/lib/criterio-unidad-validaciones"

describe("validarCriterioUnidad", () => {
  it("exige texto", () => {
    expect(validarCriterioUnidad("")).toBe("El criterio es obligatorio")
    expect(validarCriterioUnidad("   ")).toBe("El criterio es obligatorio")
  })

  it("admite letras con tilde/diéresis/ñ, números, guiones y apóstrofos", () => {
    expect(validarCriterioUnidad("Comprensión lectora 2 - pingüino d'año ’ñ’")).toBeUndefined()
  })

  it("rechaza símbolos y lista los caracteres a quitar", () => {
    const error = validarCriterioUnidad('%#&$%/$/&$($/$&#"!$!%&/')
    expect(error).toMatch(/^El criterio solo admite letras/)
    expect(error).toContain('"%"')
    expect(error).toContain('"#"')
  })

  it("respeta el largo máximo", () => {
    expect(validarCriterioUnidad("a".repeat(CRITERIO_UNIDAD_MAX))).toBeUndefined()
    expect(validarCriterioUnidad("a".repeat(CRITERIO_UNIDAD_MAX + 1))).toMatch(/máximo/)
  })
})
