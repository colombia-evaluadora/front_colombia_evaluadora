import { describe, expect, it } from "vitest"

import {
  duracionLegible,
  elegirMimeGrabacion,
  extensionDeGrabacion,
  mensajeErrorMicrofono,
  motivoSinGrabacion,
  nombreNotaDeVoz,
} from "@/features/comunicaciones/chat/lib/nota-de-voz"
import { esAudio, formatoDeArchivo, validarAdjunto } from "@/features/comunicaciones/chat/lib/archivo-adjunto"

describe("elegirMimeGrabacion", () => {
  it("elige el primero soportado según el navegador", () => {
    // Chrome / Edge
    expect(elegirMimeGrabacion((m) => m.startsWith("audio/webm"))).toBe("audio/webm;codecs=opus")
    // Firefox (también soporta webm, pero ogg queda después; con solo ogg)
    expect(elegirMimeGrabacion((m) => m.startsWith("audio/ogg"))).toBe("audio/ogg;codecs=opus")
    // Safari
    expect(elegirMimeGrabacion((m) => m === "audio/mp4")).toBe("audio/mp4")
    expect(elegirMimeGrabacion(() => false)).toBe("")
    expect(elegirMimeGrabacion(undefined)).toBe("")
  })
})

describe("extensionDeGrabacion", () => {
  it("mapea el MIME grabado a una extensión de la lista blanca", () => {
    expect(extensionDeGrabacion("audio/webm;codecs=opus")).toEqual({ extension: "weba", tipo: "audio/webm" })
    expect(extensionDeGrabacion("audio/ogg; codecs=opus")).toEqual({ extension: "ogg", tipo: "audio/ogg" })
    expect(extensionDeGrabacion("audio/mp4")).toEqual({ extension: "m4a", tipo: "audio/mp4" })
    expect(extensionDeGrabacion("")).toEqual({ extension: "weba", tipo: "audio/webm" })
  })

  it("el archivo resultante es un audio adjuntable (formato OTRO)", () => {
    for (const ext of ["weba", "ogg", "m4a"]) {
      const name = nombreNotaDeVoz(new Date(2026, 9, 23, 15, 30, 5), ext)
      expect(name).toBe(`nota-de-voz-2026-10-23-153005.${ext}`)
      expect(esAudio(name)).toBe(true)
      expect(formatoDeArchivo({ name, type: "audio/webm" })).toBe("OTRO")
      expect(validarAdjunto({ name, size: 1000 })).toBeNull()
    }
    expect(esAudio("video.webm")).toBe(false)
    expect(validarAdjunto({ name: "nota.weba", size: 21 * 1024 * 1024 })).toMatch(/20 MB/)
  })
})

describe("textos", () => {
  it("duración y motivos", () => {
    expect(duracionLegible(7)).toBe("0:07")
    expect(duracionLegible(299.9)).toBe("4:59")
    expect(motivoSinGrabacion({ mediaRecorder: {}, getUserMedia: {}, contextoSeguro: true })).toBeNull()
    expect(motivoSinGrabacion({ mediaRecorder: undefined, getUserMedia: {}, contextoSeguro: true })).toMatch(/navegador/)
    expect(motivoSinGrabacion({ mediaRecorder: {}, getUserMedia: {}, contextoSeguro: false })).toMatch(/https/)
    expect(mensajeErrorMicrofono(new DOMException("x", "NotAllowedError"))).toMatch(/permiso/)
    expect(mensajeErrorMicrofono(new DOMException("x", "NotFoundError"))).toMatch(/micrófono conectado/)
    expect(mensajeErrorMicrofono(new Error("x"))).toMatch(/No se pudo grabar/)
  })
})
