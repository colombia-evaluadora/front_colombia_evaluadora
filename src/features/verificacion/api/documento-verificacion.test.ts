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

  it("el certificado de servicio social y la mención de honor traen estado y datos básicos", () => {
    const r = toDocumentoVerificacion({
      tipo: "MENCION_HONOR",
      estado: "reemplazado",
      emitidoEn: "2027-03-15",
      reemplazadoEn: "2027-06-01",
      institucion: "IE Prueba",
      dane: "105001000123",
      titular: "Ana S. P. G.",
    })
    expect(r.tipo).toBe("MENCION_HONOR")
    if (r.tipo !== "MENCION_HONOR") return
    expect(r.ge).toMatchObject({ estado: "REEMPLAZADO", reemplazadoEn: "2027-06-01", dane: "105001000123" })
  })

  it("ACTUALIZADO se conserva y un estado raro de un documento GE cae en NO_VALIDO", () => {
    const a = toDocumentoVerificacion({ tipo: "SERVICIO_SOCIAL_CERTIFICADO", estado: "ACTUALIZADO" })
    expect(a.tipo === "SERVICIO_SOCIAL_CERTIFICADO" && a.ge.estado).toBe("ACTUALIZADO")
    const b = toDocumentoVerificacion({ tipo: "SERVICIO_SOCIAL_CERTIFICADO", estado: "RARO" })
    expect(b.tipo === "SERVICIO_SOCIAL_CERTIFICADO" && b.ge.estado).toBe("NO_VALIDO")
  })

  it("un estado que no conoce cae en NO_VALIDO", () => {
    const r = toDocumentoVerificacion({ tipo: "CARNE", estado: "RARO" })
    expect(r.tipo === "CARNE" && r.carne.estado).toBe("NO_VALIDO")
  })
})
