import { describe, expect, it } from "vitest"

import { accionesBandeja, esComunicadoRecibido } from "@/features/comunicaciones/chat/lib/acciones-bandeja"

describe("accionesBandeja", () => {
  it("comunicado recibido: eliminar de mi bandeja, nunca salir del foro", () => {
    const c = { tipo: "CANAL", categoria: "ANUNCIO", esCreador: false, esBot: false } as const
    expect(esComunicadoRecibido(c)).toBe(true)
    expect(accionesBandeja(c)).toEqual({ eliminarDeBandeja: true, salir: null })
  })

  it("comunicado propio: ni eliminar de la bandeja ni salir", () => {
    expect(accionesBandeja({ tipo: "CANAL", categoria: "ANUNCIO", esCreador: true, esBot: false })).toEqual({
      eliminarDeBandeja: false,
      salir: null,
    })
  })

  it("foro y grupo de mensajería conservan salir", () => {
    expect(accionesBandeja({ tipo: "CANAL", categoria: "GENERAL", esCreador: false, esBot: false })).toEqual({
      eliminarDeBandeja: true,
      salir: "del foro",
    })
    expect(accionesBandeja({ tipo: "GRUPO", categoria: "GENERAL", esCreador: false, esBot: false }).salir).toBe(
      "del grupo",
    )
  })

  it("directo: eliminar de la bandeja sin salir; el bot no se elimina", () => {
    expect(accionesBandeja({ tipo: "DIRECTO", categoria: "GENERAL", esCreador: false, esBot: false })).toEqual({
      eliminarDeBandeja: true,
      salir: null,
    })
    expect(accionesBandeja({ tipo: "DIRECTO", categoria: "GENERAL", esCreador: false, esBot: true }).eliminarDeBandeja).toBe(
      false,
    )
  })

  it("elección o encuesta: sin eliminar de la bandeja; salir del foro como antes", () => {
    expect(accionesBandeja({ tipo: "CANAL", categoria: "VOTACION", esCreador: false, esBot: false })).toEqual({
      eliminarDeBandeja: false,
      salir: "del foro",
    })
  })
})
