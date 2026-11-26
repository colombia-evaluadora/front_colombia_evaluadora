import { describe, expect, it } from "vitest"

import { hayCambios } from "@/features/gestion-estudiantil/configuracion/utils/cambios"

describe("hayCambios", () => {
  it("sin cambios si los valores son iguales", () => {
    expect(hayCambios({ horas: "80", grados: [11, 12] }, { horas: "80", grados: [11, 12] })).toBe(false)
  })

  it("las listas se comparan sin importar el orden", () => {
    expect(hayCambios({ grados: [12, 11] }, { grados: [11, 12] })).toBe(false)
  })

  it("detecta un campo cambiado o un elemento de más", () => {
    expect(hayCambios({ horas: "81" }, { horas: "80" })).toBe(true)
    expect(hayCambios({ grados: [10, 11, 12] }, { grados: [11, 12] })).toBe(true)
  })
})
