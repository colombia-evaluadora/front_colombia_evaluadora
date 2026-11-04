import { describe, expect, it } from "vitest"

import { validarCodigo, valoresVacios } from "./codigo-form"

describe("validarCodigo", () => {
  it("exige código, descripción y tipo", () => {
    const e = validarCodigo(valoresVacios())
    expect(e.codigo).toBeTruthy()
    expect(e.descripcion).toBeTruthy()
    expect(e.tipo).toBeTruthy()
  })
  it("respeta los límites de la sección 2.1", () => {
    const base = { ...valoresVacios(), tipo: "1" }
    expect(validarCodigo({ ...base, codigo: "12345678901", descripcion: "Válida" }).codigo).toBeTruthy()
    expect(validarCodigo({ ...base, codigo: "N01", descripcion: "Corta".slice(0, 4) }).descripcion).toBeTruthy()
    expect(validarCodigo({ ...base, codigo: "N01", descripcion: "Descripción válida" })).toEqual({})
  })
})
