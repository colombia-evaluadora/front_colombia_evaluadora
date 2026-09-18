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

  // Un enlace sin extensión ni repositorio conocido no es un error: es el
  // caso "sitio web", que se previsualiza con un screenshot.
  it("cae a web cuando no hay extensión ni repositorio conocido", () => {
    const url = "https://www.colombiaaprende.edu.co/recursos"
    expect(resolveRecursoPreview(url)).toEqual({ kind: "web", value: url })
  })
})

/**
 * Un enlace de repositorio no dice qué hay del otro lado, así que el tipo no
 * se deduce: se delega en el visor del proveedor. Lo que estas pruebas fijan
 * es la construcción de esa URL embebible, que es lo único nuestro.
 */
describe("resolveRecursoPreview — repositorios", () => {
  it.each([
    ["https://drive.google.com/file/d/1A2b3C/view?usp=sharing", "1A2b3C"],
    ["https://drive.google.com/file/d/1A2b3C/preview", "1A2b3C"],
    ["https://drive.google.com/open?id=1A2b3C", "1A2b3C"],
    ["https://drive.google.com/uc?export=download&id=1A2b3C", "1A2b3C"],
  ])("arma el visor de Drive desde %s", (url, id) => {
    expect(resolveRecursoPreview(url)).toEqual({
      kind: "embed",
      value: `https://drive.google.com/file/d/${id}/preview`,
      proveedor: "Google Drive",
      urlOriginal: url,
    })
  })

  it("una carpeta de Drive usa la vista de listado embebible", () => {
    const url = "https://drive.google.com/drive/folders/9Z8y7X"
    expect(resolveRecursoPreview(url)).toMatchObject({
      kind: "embed",
      value: "https://drive.google.com/embeddedfolderview?id=9Z8y7X#grid",
    })
  })

  it.each([
    ["document", "https://docs.google.com/document/d/1A2b3C/edit"],
    ["spreadsheets", "https://docs.google.com/spreadsheets/d/1A2b3C/edit#gid=0"],
    ["presentation", "https://docs.google.com/presentation/d/1A2b3C/edit"],
  ])("arma el visor de Docs para %s", (tipo, url) => {
    expect(resolveRecursoPreview(url)).toMatchObject({
      kind: "embed",
      value: `https://docs.google.com/${tipo}/d/1A2b3C/preview`,
      proveedor: "Google Docs",
    })
  })

  // Si la URL ya dice de qué se trata, gana nuestro propio visor: no depende
  // de permisos ajenos ni de que el iframe del proveedor esté disponible.
  it("una extensión reconocible gana sobre el visor del repositorio", () => {
    const url = "https://drive.google.com/file/d/1A2b3C/guia.pdf"
    expect(resolveRecursoPreview(url)).toMatchObject({ kind: "documento", fileType: ".pdf" })
  })

  // Dropbox no delega: sus URLs traen el nombre del archivo, así que con
  // `raw=1` se sirve el archivo real y lo mostramos nosotros.
  it("Dropbox se resuelve por extensión con raw=1", () => {
    const resuelto = resolveRecursoPreview("https://www.dropbox.com/s/abc/clase.mp4?dl=0")
    expect(resuelto?.kind).toBe("video")
    expect(resuelto?.value).toContain("raw=1")
    expect(resuelto?.value).not.toContain("dl=0")
  })
})
