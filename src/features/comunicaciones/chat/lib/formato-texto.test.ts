import { describe, expect, it } from "vitest"

import {
  alternarBloque,
  alternarBloqueCodigo,
  alternarMarca,
  bloques,
  insertarEnlace,
  segmentosEnLinea,
} from "@/features/comunicaciones/chat/lib/formato-texto"

describe("alternarMarca", () => {
  it("envuelve y desenvuelve la selección", () => {
    const puesta = alternarMarca({ texto: "hola mundo", inicio: 5, fin: 10 }, "**")
    expect(puesta).toEqual({ texto: "hola **mundo**", inicio: 7, fin: 12 })
    expect(alternarMarca(puesta, "**")).toEqual({ texto: "hola mundo", inicio: 5, fin: 10 })
  })
})

describe("insertarEnlace", () => {
  it("usa la selección como etiqueta y deja la URL seleccionada", () => {
    const r = insertarEnlace({ texto: "ver guía", inicio: 4, fin: 8 })
    expect(r.texto).toBe("ver [guía](https://)")
    expect(r.texto.slice(r.inicio, r.fin)).toBe("https://")
  })
})

describe("alternarBloque", () => {
  it("numera cada línea y la quita al repetir", () => {
    const r = alternarBloque({ texto: "uno\ndos", inicio: 0, fin: 7 }, "numerada")
    expect(r.texto).toBe("1. uno\n2. dos")
    expect(alternarBloque(r, "numerada").texto).toBe("uno\ndos")
  })

  it("cambia de viñetas a cita", () => {
    expect(alternarBloque({ texto: "- a", inicio: 0, fin: 3 }, "cita").texto).toBe("> a")
  })
})

describe("alternarBloqueCodigo", () => {
  it("rodea con cercas", () => {
    expect(alternarBloqueCodigo({ texto: "x = 1", inicio: 0, fin: 5 }).texto).toBe("```\nx = 1\n```")
  })
})

describe("lectura", () => {
  it("separa marcas en línea sin tocar nombres con guion bajo", () => {
    expect(segmentosEnLinea("**ya** ver planeación_fracciones.docx")).toEqual([
      { tipo: "negrita", valor: "ya" },
      { tipo: "texto", valor: " ver planeación_fracciones.docx" },
    ])
  })

  it("no toma como cursiva los guiones bajos dentro de palabras", () => {
    expect(segmentosEnLinea("mi_archivo_final.pdf y _esto_")).toEqual([
      { tipo: "texto", valor: "mi_archivo_final.pdf y " },
      { tipo: "cursiva", valor: "esto" },
    ])
  })

  it("agrupa líneas de lista y bloques de código", () => {
    expect(bloques("- a\n- b\n```\nc\n```")).toEqual([
      { tipo: "vinetas", lineas: ["a", "b"] },
      { tipo: "codigo", valor: "c" },
    ])
  })
})
