import { describe, expect, it } from "vitest"

import type { UnidadTab } from "@/features/planeador/api/query/use-unidades-tabs-query"
import { mensajeUnidadGuardada, resolverRotuloUnidad } from "@/features/planeador/lib/unidad-instrumento-label"

const tab = (instrumento: string, referenteId: number | null, gradoIds: number[]): UnidadTab => ({
  instrumento,
  descripcion: null,
  referenteId,
  grados: gradoIds.map((id) => ({ id, nombre: String(id) })),
  asignaturas: [],
  gradoIds,
})

const PRIMARIA = tab("Unidad temática", 10, [1, 2])
const PREESCOLAR = tab("Proyecto pedagógico", 20, [0])

describe("resolverRotuloUnidad", () => {
  it("prioriza el referente real de la unidad sobre el grado", () => {
    expect(resolverRotuloUnidad(20, 1, [PRIMARIA, PREESCOLAR])).toBe("Proyecto pedagógico")
  })

  it("sin referente, resuelve por grado", () => {
    expect(resolverRotuloUnidad(null, 0, [PRIMARIA, PREESCOLAR])).toBe("Proyecto pedagógico")
  })

  it("con una sola pestaña usa esa aunque no matchee nada (docente solo de Preescolar)", () => {
    expect(resolverRotuloUnidad(undefined, undefined, [PREESCOLAR])).toBe("Proyecto pedagógico")
  })

  it("sin pestañas ni datos cae al genérico", () => {
    expect(resolverRotuloUnidad(undefined, undefined, undefined)).toBe("Unidad temática")
    expect(resolverRotuloUnidad(99, 99, [PRIMARIA, PREESCOLAR])).toBe("Unidad temática")
  })
})

describe("mensajeUnidadGuardada", () => {
  it("concuerda el artículo y baja la mayúscula inicial", () => {
    expect(mensajeUnidadGuardada("creado", "Unidad temática")).toBe("Se ha creado con éxito la unidad temática.")
    expect(mensajeUnidadGuardada("actualizado", "Proyecto pedagógico")).toBe(
      "Se ha actualizado con éxito el proyecto pedagógico.",
    )
  })
})
