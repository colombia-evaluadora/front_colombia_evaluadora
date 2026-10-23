import { describe, expect, it } from "vitest"

import {
  esComprimido,
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

  it("acepta ZIP y RAR con su MIME real o genérico, y sigue bloqueando ejecutables", () => {
    expect(validarAdjunto({ name: "tareas.zip", size: 10, type: "application/zip" })).toBeNull()
    expect(validarAdjunto({ name: "tareas.ZIP", size: 10, type: "application/x-zip-compressed" })).toBeNull()
    expect(validarAdjunto({ name: "tareas.rar", size: 10, type: "application/vnd.rar" })).toBeNull()
    expect(validarAdjunto({ name: "tareas.rar", size: 10, type: "application/x-rar-compressed" })).toBeNull()
    expect(validarAdjunto({ name: "tareas.rar", size: 10, type: "application/octet-stream" })).toBeNull()
    expect(validarAdjunto({ name: "tareas.zip", size: 10, type: "text/html" })).toMatch(/ZIP o RAR/)
    expect(validarAdjunto({ name: "setup.exe", size: 10, type: "application/octet-stream" })).toMatch(/tipo de archivo/)
    expect(validarAdjunto({ name: "script.bat", size: 10, type: "application/octet-stream" })).toMatch(/tipo de archivo/)
    expect(validarAdjunto({ name: "grande.zip", size: 21 * 1024 * 1024, type: "application/zip" })).toMatch(/20 MB/)
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
    expect(formatoDeArchivo({ name: "a.zip", type: "application/zip" })).toBe("OTRO")
    expect(esComprimido("Copia.RAR")).toBe(true)
    expect(esComprimido("a.pdf")).toBe(false)
  })
})

describe("pesoLegible", () => {
  it("muestra KB o MB", () => {
    expect(pesoLegible(2048)).toBe("2 KB")
    expect(pesoLegible(null)).toBe("")
  })
})
