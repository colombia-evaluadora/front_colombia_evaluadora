import { describe, expect, it } from "vitest"

import { PLAIN_TEXT_PATTERN, PLAIN_TEXT_PUNCT_PATTERN, plainTextInvalidChars } from "@/lib/text-input"
import { UNIDAD_DRAFT_VACIO } from "@/features/planeador/components/forms/form-unidad-info-general"
import {
  UNIDAD_LIMITES,
  unidadCampoId,
  validarUnidadDraft,
} from "@/features/planeador/lib/unidad-validaciones"

const valido = {
  ...UNIDAD_DRAFT_VACIO,
  gradoId: 1,
  grado: "Primero",
  asignaturaId: 2,
  asignatura: "Ciencias",
  nombre: "Ecosistemas del Caribe 2",
  descripcion: "Proyecto de aula: el niño y el pingüino.\n¿Con diéresis? ¡Sí! (d'Artagnan); fin",
  objetivos: ["Reconocer seres vivos.", "Comparar hábitats - año 2026"],
  contenidos: [{ titulo: "Fase uno: exploración", descripcion: "Exploración del entorno, paso a paso." }],
}

describe("PLAIN_TEXT_PATTERN (nombre)", () => {
  it("admite letras con tilde, diéresis, ñ, números, espacios, guiones y apóstrofos", () => {
    expect(PLAIN_TEXT_PATTERN.test("Áéíóú ÄËÏÖÜ ñÑ 0123 - ' ’ abc\nxyz")).toBe(true)
  })
  it.each([".", ",", ":", ";", "(", ")", "¿", "?", "¡", "!", "#", "/", "&", "@", "😀", "<", '"', "ç", "à"])(
    "rechaza %s",
    (ch) => {
      expect(PLAIN_TEXT_PATTERN.test(`abc${ch}`)).toBe(false)
      expect(plainTextInvalidChars(`abc${ch}`)).toEqual([ch])
    },
  )
})

describe("PLAIN_TEXT_PUNCT_PATTERN (descripción, objetivos, estructura)", () => {
  it("admite además . , : ; ¿ ? ¡ ! ( )", () => {
    expect(PLAIN_TEXT_PUNCT_PATTERN.test("¿Qué es? ¡Sí! Uno, dos: tres; (cuatro).")).toBe(true)
  })
  it.each(["#", "/", "&", "@", "😀", "<", '"', "%"])("rechaza %s", (ch) => {
    expect(plainTextInvalidChars(`abc.${ch}`, { puntuacion: true })).toEqual([ch])
  })
})

describe("validarUnidadDraft", () => {
  it("un borrador correcto no tiene errores", () => {
    expect(validarUnidadDraft(valido)).toEqual({})
  })

  it("marca vacíos obligatorios en orden visual", () => {
    const errores = validarUnidadDraft({
      ...UNIDAD_DRAFT_VACIO,
      objetivos: ["  "],
      contenidos: [{ titulo: "", descripcion: " " }],
    })
    expect(Object.keys(errores)).toEqual([
      unidadCampoId.grado,
      unidadCampoId.asignatura,
      unidadCampoId.nombre,
      unidadCampoId.objetivo(0),
      unidadCampoId.seccionDescripcion(0),
    ])
    expect(errores[unidadCampoId.nombre]).toBe("El nombre es obligatorio")
    expect(errores[unidadCampoId.objetivo(0)]).toMatch(/objetivo 1 está vacío/)
  })

  it("el nombre no admite puntuación; los textos largos sí", () => {
    const errores = validarUnidadDraft({ ...valido, nombre: "Unidad uno.", descripcion: "Uno, dos: tres." })
    expect(errores[unidadCampoId.nombre]).toMatch(/Quita: "\."/)
    expect(errores[unidadCampoId.descripcion]).toBeUndefined()
  })

  it("rechaza símbolos fuera de la puntuación básica en cada texto", () => {
    const errores = validarUnidadDraft({
      ...valido,
      nombre: "Unidad #1",
      descripcion: "Hola, mundo # dos",
      objetivos: ["Objetivo: leer (bien).", "Objetivo @ leer"],
      contenidos: [{ titulo: "Fase & uno", descripcion: "a/b" }],
    })
    expect(errores[unidadCampoId.nombre]).toMatch(/Quita: "#"/)
    expect(errores[unidadCampoId.descripcion]).toMatch(/además de .*Quita: "#"/)
    expect(errores[unidadCampoId.objetivo(0)]).toBeUndefined()
    expect(errores[unidadCampoId.objetivo(1)]).toMatch(/Quita: "@"/)
    expect(errores[unidadCampoId.seccionTitulo(0)]).toMatch(/Quita: "&"/)
    expect(errores[unidadCampoId.seccionDescripcion(0)]).toMatch(/Quita: "\/"/)
  })

  it("respeta los límites (nombre 150, objetivo 250, descripción 500)", () => {
    const ok = validarUnidadDraft({
      ...valido,
      nombre: "a".repeat(UNIDAD_LIMITES.nombre),
      objetivos: ["b".repeat(UNIDAD_LIMITES.objetivo)],
      descripcion: "c".repeat(UNIDAD_LIMITES.descripcion),
    })
    expect(ok).toEqual({})
    const errores = validarUnidadDraft({
      ...valido,
      nombre: "a".repeat(151),
      objetivos: ["b".repeat(251)],
      descripcion: "c".repeat(501),
    })
    expect(errores[unidadCampoId.nombre]).toMatch(/máximo 150/)
    expect(errores[unidadCampoId.objetivo(0)]).toMatch(/máximo 250/)
    expect(errores[unidadCampoId.descripcion]).toMatch(/máximo 500/)
  })
})
