import { describe, expect, it } from "vitest"

import { resolveRecursoPreview } from "@/features/planeador/lib/recurso-preview"

/**
 * El caso que motiva estas pruebas es el de los archivos subidos desde el PC:
 * llegan como `blob:` URL, que NO trae extensión en el path, así que el tipo
 * sale del nombre original que el form guarda en `fuente`. Si esa segunda
 * fuente se perdiera, el previsualizador no tendría de dónde deducir si es un
 * audio, un video o una foto.
 */
describe("resolveRecursoPreview — archivo local (blob:)", () => {
  const BLOB = "blob:http://localhost:5173/9f0c-8ac1"

  it.each([
    ["grabacion.mp3", "audio"],
    ["clase.m4a", "audio"],
    ["nota-de-voz.opus", "audio"],
    ["experimento.mp4", "video"],
    ["clase.webm", "video"],
    ["mapa.png", "image"],
    ["foto.JPG", "image"],
  ])("clasifica %s como %s", (nombre, kind) => {
    expect(resolveRecursoPreview(BLOB, nombre)).toEqual({ kind, value: BLOB })
  })

  it("clasifica un PDF como documento y conserva la extensión", () => {
    expect(resolveRecursoPreview(BLOB, "guia.pdf")).toEqual({
      kind: "documento",
      value: BLOB,
      fileType: ".pdf",
    })
  })

  // Sin nombre no hay nada que mirar: un blob no dice qué es. Devolver null
  // (y no adivinar "web") es lo que deja al componente mostrar el estado
  // vacío en vez de mandarle un blob a Microlink, que no lo puede visitar.
  it.each([
    ["sin extensión", "archivo"],
    ["extensión desconocida", "backup.zip"],
    ["nombre vacío", ""],
    ["nombre ausente", undefined],
  ])("devuelve null con %s", (_caso, nombre) => {
    expect(resolveRecursoPreview(BLOB, nombre)).toBeNull()
  })
})

describe("resolveRecursoPreview — enlaces", () => {
  it("reconoce un audio servido por URL", () => {
    const url = "https://cdn.ejemplo.com/clases/dictado.mp3"
    expect(resolveRecursoPreview(url)).toEqual({ kind: "audio", value: url })
  })

  it("YouTube gana sobre cualquier extensión", () => {
    expect(resolveRecursoPreview("https://youtu.be/abc123")).toEqual({
      kind: "youtube",
      value: "abc123",
    })
  })

  // Un enlace sin extensión reconocible no es un error: es el caso "sitio
  // web", que se previsualiza con un screenshot.
  it("cae a web cuando no hay extensión", () => {
    const url = "https://drive.google.com/file/d/1a2b3c/view"
    expect(resolveRecursoPreview(url)).toEqual({ kind: "web", value: url })
  })
})
