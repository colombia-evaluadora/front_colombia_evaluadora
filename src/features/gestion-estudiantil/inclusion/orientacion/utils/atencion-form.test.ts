import { describe, expect, it } from "vitest"

import { atencionAlBackend, esquemaAtencion, valoresDesde } from "@/features/gestion-estudiantil/inclusion/orientacion/utils/atencion-form"

describe("atencion-form", () => {
  it("exige el trabajo realizado", () => {
    const r = esquemaAtencion.safeParse({ ...valoresDesde(), fecha: "2026-01-01", modalidad: "1", origen: "2", motivo: "3" })
    expect(r.success).toBe(false)
  })
  it("manda null en lo opcional vacío y números en los catálogos", () => {
    const b = atencionAlBackend({ ...valoresDesde(), modalidad: "1", origen: "2", motivo: "3", trabajo: " x " }, null)
    expect(b).toMatchObject({ FK_MODALIDAD: 1, TRABAJO_REALIZADO: "x", PRUEBAS_APLICADAS: null, FK_REMISION: null })
  })
})
