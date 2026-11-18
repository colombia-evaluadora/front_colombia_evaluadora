import { describe, expect, it } from "vitest"

import { causasConFijas, causasParaBackend } from "@/features/gestion-estudiantil/configuracion/utils/riesgo"

const FIJAS = ["C03", "C04", "C06", "C10"]

describe("causas reservadas", () => {
  it("las fijas no se pueden quitar", () => {
    expect(causasConFijas(["C04", "C01"], FIJAS)).toEqual(["C03", "C04", "C06", "C10", "C01"])
  })
  it("el backend recibe solo las agregadas", () => {
    expect(causasParaBackend(["C03", "C04", "C06", "C10", "C01"], FIJAS)).toEqual(["C01"])
  })
})
