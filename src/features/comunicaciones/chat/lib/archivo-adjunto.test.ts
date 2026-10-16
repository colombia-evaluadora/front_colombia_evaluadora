import { describe, expect, it } from "vitest"

import {
  formatoDeArchivo,
  pesoLegible,
  validarAdjunto,
} from "@/features/comunicaciones/chat/lib/archivo-adjunto"

describe("validarAdjunto", () => {
  it("acepta los tipos de la lista y rechaza el resto", () => {
    expect(validarAdjunto({ name: "acta.PDF", size: 10 })).toBeNull()
    expect(validarAdjunto({ name: "foto.jpeg", size: 10 })).toBeNull()
    expect(validarAdjunto({ name: "setup.exe", size: 10 })).toMatch(/tipo de archivo/)
    expect(validarAdjunto({ name: "sin-extension", size: 10 })).toMatch(/tipo de archivo/)
  })

  it("rechaza lo que supera el máximo", () => {
    expect(validarAdjunto({ name: "video.mp4", size: 21 * 1024 * 1024 })).toMatch(/20 MB/)
  })
})

describe("formatoDeArchivo", () => {
  it("decide por la extensión, igual que el servidor", () => {
    expect(formatoDeArchivo({ name: "a.docx", type: "" })).toBe("WORD")
    expect(formatoDeArchivo({ name: "a.png", type: "" })).toBe("IMAGEN")
    expect(formatoDeArchivo({ name: "a.xlsx", type: "" })).toBe("OTRO")
  })
})

describe("pesoLegible", () => {
  it("muestra KB o MB", () => {
    expect(pesoLegible(2048)).toBe("2 KB")
    expect(pesoLegible(null)).toBe("")
  })
})
