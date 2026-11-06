import { describe, expect, it } from "vitest"

import type { PiarDetalle } from "@/features/gestion-estudiantil/inclusion/piar/api/types"
import { accesoPiar, progresoBloques, sinAjustesTodas } from "@/features/gestion-estudiantil/inclusion/piar/utils/piar"

const base = {
  ajustes: [],
  caracterizacion: { fortalezas: "a", barreras: "b" },
  valoracion_pedagogica: "v",
  cobertura: [
    { cobertura: "SIN_AJUSTES" },
    { cobertura: "PENDIENTE_REVISION" },
  ],
  version_actual: { participantes: [], acta: null },
} as unknown as PiarDetalle

describe("accesoPiar", () => {
  const editar = { puedeCrear: true, puedeEditar: true }
  it("solo orientación gestiona; coordinador y rector anulan", () => {
    expect(accesoPiar(["CEVAL-PSICO_ORIENTADOR"], editar).puedeGestionar).toBe(true)
    expect(accesoPiar(["CEVAL-RECTOR"], editar)).toMatchObject({ puedeGestionar: false, puedeAnular: true })
  })
  it("el docente en solo lectura no edita ajustes (D3)", () => {
    expect(accesoPiar(["CEVAL-DOCENTE"], { puedeCrear: false, puedeEditar: false }).puedeEditarAjustes).toBe(false)
    expect(accesoPiar(["CEVAL-DOCENTE"], editar).puedeEditarAjustes).toBe(true)
  })
})

describe("progresoBloques", () => {
  it("cuenta los bloques y nombra lo que falta en singular", () => {
    const r = progresoBloques(base)
    expect(r.completos).toBe(2)
    expect(r.faltan).toContain("la cobertura de 1 asignatura")
    expect(r.faltan).toContain("el acta de acuerdo firmada")
  })
})

describe("sinAjustesTodas", () => {
  it("exige toda la cobertura sin ajustes", () => {
    expect(sinAjustesTodas(base)).toBe(false)
    expect(sinAjustesTodas({ ...base, cobertura: [{ cobertura: "SIN_AJUSTES" }] } as unknown as PiarDetalle)).toBe(true)
  })
})
