import { describe, expect, it } from "vitest"

import { adaptacionFromRaw } from "@/features/planeador/api/query/use-actividad-detalle-query"

// Forma real de cada adaptación en `fn_actividad_buscar_por_pk` (sso V452):
// `estudiantes` es un array de FK_TMATRICULA, el mismo id que se guarda.
const rowReal = {
  tipoAdaptacion: 10,
  descripcion: "Lectura en voz alta",
  usaVersionModificada: "N",
  aplicaA: 20,
  aplicaANombre: "Estudiantes específicos",
  estudiantes: [101, 205],
  archivos: [],
}

describe("adaptacionFromRaw", () => {
  it("lee los estudiantes (pk_tmatricula) de la adaptación", () => {
    const adaptacion = adaptacionFromRaw(
      rowReal,
      [{ id: 10, tipo: "Acceso" }],
      [{ id: 20, valor: "Estudiantes específicos" }],
    )
    expect(adaptacion.aplicaA).toBe("Estudiantes específicos")
    expect(adaptacion.estudiantesIds).toEqual([101, 205])
  })

  it("sin estudiantes (A todo el grupo) queda vacío", () => {
    const adaptacion = adaptacionFromRaw({ ...rowReal, estudiantes: [] }, [], [])
    expect(adaptacion.estudiantesIds).toEqual([])
  })
})
