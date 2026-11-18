import { describe, expect, it } from "vitest"

import { limpiarUmbral, validarNiveles } from "@/features/gestion-estudiantil/configuracion/utils/niveles"

describe("validarNiveles", () => {
  it("los dos vacíos son válidos (quitan el nivel)", () => {
    expect(validarNiveles({ medio: "", alto: "" })).toEqual({})
  })
  it("los dos van juntos", () => {
    expect(validarNiveles({ medio: "10", alto: "" }).alto).toMatch(/obligatorio si hay Umbral del nivel Medio/)
    expect(validarNiveles({ medio: "", alto: "20" }).medio).toMatch(/juntos o ninguno/)
  })
  it("Alto mayor que Medio", () => {
    expect(validarNiveles({ medio: "20", alto: "20" }).alto).toMatch(/mayor que/)
    expect(validarNiveles({ medio: "10.5", alto: "20" })).toEqual({})
  })
  it("rangos y un decimal", () => {
    expect(validarNiveles({ medio: "0", alto: "20" }).medio).toMatch(/entre 0.1 y 99.9/)
    expect(validarNiveles({ medio: "10", alto: "101" }).alto).toMatch(/entre 0.2 y 100/)
    expect(validarNiveles({ medio: "10.25", alto: "20" }).medio).toMatch(/un decimal/)
  })
})

describe("limpiarUmbral", () => {
  it("acepta coma y recorta a un decimal", () => {
    expect(limpiarUmbral("12,34")).toBe("12.3")
    expect(limpiarUmbral("a1b2")).toBe("12")
  })
})
