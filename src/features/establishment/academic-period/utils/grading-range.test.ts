import { describe, expect, it } from "vitest"

import {
  RATING_SCALE_DESCRIPCION_MAX,
  makeRatingScaleGradesSchema,
} from "@/features/establishment/academic-period/utils/grading-range"

// Descripción por nivel de la escala (TESCALA_VALORACION.DESCRIPCION VARCHAR(1000), V71.1).
describe("makeRatingScaleGradesSchema · descripcion", () => {
  const schema = makeRatingScaleGradesSchema({ min: 0, max: 5 })
  const base = {
    nombre: "Bajo",
    abreviacion: "BJ",
    tipo: "1",
    iconografia: "x",
    notaMaxima: 2.9,
    notaMinima: 0,
    notaEquivalente: 1.5,
  }

  it("es opcional", () => {
    expect(schema.safeParse(base).success).toBe(true)
    expect(schema.safeParse({ ...base, descripcion: "" }).success).toBe(true)
  })

  it("acepta hasta 1000 caracteres y rechaza más", () => {
    const max = "a".repeat(RATING_SCALE_DESCRIPCION_MAX)
    expect(schema.safeParse({ ...base, descripcion: max }).success).toBe(true)
    expect(schema.safeParse({ ...base, descripcion: `${max}a` }).success).toBe(false)
  })
})
