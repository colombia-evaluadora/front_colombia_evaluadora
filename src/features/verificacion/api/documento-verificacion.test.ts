import { describe, expect, it } from "vitest"

import { toDocumentoVerificacion } from "@/features/verificacion/api/documento-verificacion"

describe("toDocumentoVerificacion", () => {
  it("el boletín solo dice su tipo: su página hace el resto", () => {
    expect(toDocumentoVerificacion({ tipo: "BOLETIN", estado: "VIGENTE" })).toEqual({ tipo: "BOLETIN" })
  })

  it("un tipo desconocido o vacío es No encontrado", () => {
    expect(toDocumentoVerificacion({ tipo: null, estado: "NO_VALIDO" })).toEqual({ tipo: null })
    expect(toDocumentoVerificacion(null)).toEqual({ tipo: null })
  })

  it("el carné trae estado, vigencia de la matrícula y datos básicos", () => {
    const r = toDocumentoVerificacion({
      tipo: "CARNE",
      estado: "reemplazado",
      emitidoEn: "2027-02-10",
      reemplazadoEn: "2027-05-03",
      matriculaVigente: true,
      titular: "Ana S. P. G.",
      documentoUltimos4: "4321",
    })
    expect(r.tipo).toBe("CARNE")
    if (r.tipo !== "CARNE") return
    expect(r.carne.estado).toBe("REEMPLAZADO")
    expect(r.carne.matriculaVigente).toBe(true)
    expect(r.carne.titular).toBe("Ana S. P. G.")
    expect(r.carne.sede).toBeNull()
  })

  it("un estado que no conoce cae en NO_VALIDO", () => {
    const r = toDocumentoVerificacion({ tipo: "CARNE", estado: "RARO" })
    expect(r.tipo === "CARNE" && r.carne.estado).toBe("NO_VALIDO")
  })
})
