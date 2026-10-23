import { describe, expect, it } from "vitest"

import {
  MAX_ADJUNTOS,
  adjuntosDe,
  adjuntosVigentes,
  agregarAdjuntos,
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

describe("agregarAdjuntos", () => {
  const archivo = (name: string, size = 10, type = "") => ({ name, size, type })

  it("suma varios, ignora repetidos y explica el que no se puede adjuntar", () => {
    const { archivos, error } = agregarAdjuntos(
      [archivo("a.pdf")],
      [archivo("b.png"), archivo("a.pdf"), archivo("virus.exe"), archivo("c.zip", 10, "application/zip")],
    )
    expect(archivos.map((a) => a.name)).toEqual(["a.pdf", "b.png", "c.zip"])
    expect(error).toMatch(/^virus\.exe: .*tipo de archivo/)
  })

  it("corta en el máximo de archivos por mensaje", () => {
    const muchos = Array.from({ length: MAX_ADJUNTOS + 2 }, (_, i) => archivo(`f${i}.pdf`))
    const { archivos, error } = agregarAdjuntos([], muchos)
    expect(archivos).toHaveLength(MAX_ADJUNTOS)
    expect(error).toMatch(/hasta 10 archivos/)
  })

  it("no deja pasar del peso total del mensaje", () => {
    const mb = 1024 * 1024
    const { archivos, error } = agregarAdjuntos([], [archivo("a.pdf", 15 * mb), archivo("b.pdf", 15 * mb), archivo("c.pdf", 5 * mb)])
    expect(archivos.map((a) => a.name)).toEqual(["a.pdf", "c.pdf"])
    expect(error).toMatch(/25 MB/)
  })
})

describe("adjuntosDe", () => {
  const adj = (nombre: string, eliminadoEn: string | null = null) =>
    ({ nombre, formato: "PDF", eliminadoEn }) as const

  it("usa la lista y cae al adjunto único de los mensajes viejos", () => {
    expect(adjuntosDe({ adjunto: adj("a"), adjuntos: [adj("a"), adj("b")] })).toHaveLength(2)
    expect(adjuntosDe({ adjunto: adj("a") })).toHaveLength(1)
    expect(adjuntosDe({ adjunto: null, adjuntos: [] })).toHaveLength(0)
    expect(adjuntosVigentes({ adjunto: adj("b"), adjuntos: [adj("a", "2026-01-01"), adj("b")] })).toHaveLength(1)
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
