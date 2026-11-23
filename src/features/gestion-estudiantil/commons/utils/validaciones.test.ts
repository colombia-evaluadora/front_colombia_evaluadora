import { describe, expect, it } from "vitest"

import { errorLargo, obligatorioSegun } from "@/features/gestion-estudiantil/commons/utils/validaciones"

describe("obligatorioSegun", () => {
  it("concuerda con el artículo del campo", () => {
    expect(obligatorioSegun("El motivo")).toBe("es obligatorio")
    expect(obligatorioSegun("La descripción")).toBe("es obligatoria")
    expect(obligatorioSegun("Las observaciones")).toBe("son obligatorias")
    expect(obligatorioSegun("Los compromisos")).toBe("son obligatorios")
    expect(obligatorioSegun("Motivo")).toBe("es obligatorio")
  })
})

describe("errorLargo", () => {
  it("usa la concordancia en el mensaje de obligatorio", () => {
    expect(errorLargo("  ", 10, 2000, "La descripción")).toBe("La descripción es obligatoria.")
    expect(errorLargo("", 1, 1000, "El motivo de la corrección")).toBe("El motivo de la corrección es obligatorio.")
  })

  it("valida el largo después de recortar", () => {
    expect(errorLargo("corto", 10, 2000, "La descripción")).toBe("La descripción debe tener entre 10 y 2000 caracteres.")
    expect(errorLargo("suficientemente largo", 10, 2000, "La descripción")).toBeUndefined()
  })
})
