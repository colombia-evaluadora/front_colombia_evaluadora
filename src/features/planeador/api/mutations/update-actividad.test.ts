import { describe, expect, it } from "vitest"

import { unidadBody } from "@/features/planeador/api/mutations/update-actividad"
import { crearActividadVacia } from "@/features/planeador/lib/empty-actividad"

// QA 73: la unidad viaja en el PUT de la actividad, no en un vínculo aparte.
const conUnidad = (id: number) => ({ ...crearActividadVacia(), unidad: { id, nombre: "" } })

describe("unidadBody", () => {
  it("sin cambio de unidad no manda nada (se puede omitir FK_TUNIDAD)", () => {
    expect(unidadBody(conUnidad(3), 3)).toBeNull()
    expect(unidadBody(conUnidad(3), undefined)).toBeNull()
  })
  it("asignar o mover: FK_TUNIDAD, sin PERMITIR_MOVER_DE_UNIDAD", () => {
    expect(unidadBody(conUnidad(3), 0)).toEqual({ FK_TUNIDAD: 3 })
    expect(unidadBody(conUnidad(4), 3)).toEqual({ FK_TUNIDAD: 4 })
  })
  it("quitar: DESVINCULAR_UNIDAD", () => {
    expect(unidadBody(conUnidad(0), 3)).toEqual({ DESVINCULAR_UNIDAD: true })
  })
})
