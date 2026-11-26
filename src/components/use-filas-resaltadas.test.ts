import { describe, expect, it } from "vitest"

import { huella } from "@/components/use-filas-resaltadas"

describe("huella", () => {
  it("ignora el total repetido en cada fila: eliminar otra fila no la cambia", () => {
    expect(huella({ id: 1, nombre: "Leve", total_count: 3 })).toBe(huella({ id: 1, nombre: "Leve", total_count: 2 }))
    expect(huella({ id: 1, totalCount: 10 })).toBe(huella({ id: 1, totalCount: 9 }))
  })

  it("sí cambia si cambia un dato de la fila", () => {
    expect(huella({ id: 1, nombre: "Leve", total_count: 3 })).not.toBe(huella({ id: 1, nombre: "Grave", total_count: 3 }))
  })

  it("no ignora campos anidados con otro nombre", () => {
    expect(huella({ id: 1, datos: { total_horas: 4 } })).not.toBe(huella({ id: 1, datos: { total_horas: 5 } }))
  })
})
