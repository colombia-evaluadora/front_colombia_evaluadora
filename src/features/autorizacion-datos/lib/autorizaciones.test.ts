import { describe, expect, it } from "vitest"

import {
  clavePendiente,
  listarNombres,
  mensajeAutorizados,
  pendientesDe,
  tienePendientes,
  toAutorizaciones,
  toAutorizacionPendiente,
} from "@/features/autorizacion-datos/lib/autorizaciones"

const a = (id: number, autorizado: boolean) => ({ establecimientoId: id, establecimiento: `IE ${id}`, autorizado })

describe("autorizaciones de datos", () => {
  it("normaliza filas y descarta basura", () => {
    expect(toAutorizaciones(null)).toEqual([])
    expect(
      toAutorizaciones([{ establecimientoId: "7", establecimiento: "IE 7", autorizado: true }, null, { establecimientoId: "x" }]),
    ).toEqual([a(7, true)])
  })

  it("detecta pendientes", () => {
    expect(pendientesDe([a(1, true), a(2, false)])).toEqual([a(2, false)])
    expect(tienePendientes(undefined)).toBe(false)
    expect(tienePendientes([a(1, true)])).toBe(false)
  })

  it("lista nombres en español", () => {
    expect(listarNombres([])).toBe("")
    expect(listarNombres(["A"])).toBe("A")
    expect(listarNombres(["A", "B", "C"])).toBe("A, B y C")
  })

  it("arma el mensaje solo con los recién autorizados", () => {
    expect(mensajeAutorizados([a(1, true), a(2, false), a(3, false)], [a(1, true), a(2, true), a(3, true)], [2, 3])).toBe(
      "Quedaron autorizados: IE 2 y IE 3.",
    )
  })

  it("mapea filas de pendientes, incluida la del funcionario", () => {
    const f = toAutorizacionPendiente({ tipo: "FUNCIONARIO", inscripcionId: null, numero: null, aspirante: null, establecimientos: [a(4, false)] })
    expect(f).toEqual({ tipo: "FUNCIONARIO", inscripcionId: null, numero: null, aspirante: null, establecimientos: [a(4, false)] })
    expect(clavePendiente(f)).toBe("funcionario")
    const i = toAutorizacionPendiente({ tipo: "INSCRIPCION", inscripcion_id: "12", numero: 412, aspirante: "Ana", establecimientos: [] })
    expect(i.inscripcionId).toBe(12)
    expect(i.numero).toBe("412")
    expect(clavePendiente(i)).toBe("inscripcion-12")
  })
})
