import { describe, expect, it } from "vitest"

import type { Actividad } from "@/features/planeador/api/types/actividad"
import { railDelDia } from "./rail-guardado"

const a = (id: number, fechaInicio: string, fechaCierre: string) => ({ id, fechaInicio, fechaCierre }) as Actividad
const lista = [a(1, "2026-11-02", "2026-11-02"), a(2, "2026-11-03", "2026-11-05"), a(3, "2026-12-01", "2026-12-02")]

describe("railDelDia", () => {
  it("trae las que cubren el día y los días ocupados vecinos", () => {
    const r = railDelDia(lista, "2026-11-05")
    expect(r.rows.map((x) => x.id)).toEqual([2])
    expect([r.diaAnterior, r.diaSiguiente]).toEqual(["2026-11-04", "2026-12-01"])
  })
  it("un día vacío queda vacío, con salida a los dos lados", () => {
    const r = railDelDia(lista, "2026-11-20")
    expect(r).toEqual({ rows: [], totalCount: 0, diaAnterior: "2026-11-05", diaSiguiente: "2026-12-01" })
  })
  it("en el primero y el último no hay más", () => {
    expect(railDelDia(lista, "2026-11-02").diaAnterior).toBeNull()
    expect(railDelDia(lista, "2026-12-02").diaSiguiente).toBeNull()
  })
})
