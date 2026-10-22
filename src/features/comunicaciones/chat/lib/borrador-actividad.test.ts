import { describe, expect, it } from "vitest"

import {
  bytesDatos,
  candidatosGuardables,
  conBorrador,
  datosDe,
  hayContenido,
  idsDe,
  preguntasGuardables,
  revivirCandidatos,
  revivirPreguntas,
  tituloBorrador,
} from "@/features/comunicaciones/chat/lib/borrador-actividad"
import { nuevaPregunta } from "@/features/comunicaciones/chat/lib/preguntas"

describe("borradores de actividades", () => {
  it("datosDe toma solo claves conocidas y del mismo tipo", () => {
    const base = {
      nombre: "",
      descripcion: "",
      fechaInicio: null as string | null,
      puntaje: -1,
      lista: [] as string[],
    }
    expect(
      datosDe(
        {
          nombre: "Examen",
          fechaInicio: "2026-10-21T08:00",
          puntaje: "10",
          lista: ["A"],
          extra: 1,
        },
        base,
      ),
    ).toEqual({
      nombre: "Examen",
      descripcion: "",
      fechaInicio: "2026-10-21T08:00",
      puntaje: -1,
      lista: ["A"],
    })
    expect(datosDe(null, base)).toBe(base)
    expect(datosDe({ nombre: null, fechaInicio: null }, base)).toEqual(base)
  })

  it("las preguntas se guardan sin claves y vuelven con claves nuevas", () => {
    const p = { ...nuevaPregunta("UNICA", "EVALUACION"), texto: "¿2+2?", puntos: "5" }
    p.opciones[0].texto = "4"
    p.opciones[0].correcta = true
    const guardadas = JSON.parse(JSON.stringify(preguntasGuardables([p])))
    expect(guardadas[0]).not.toHaveProperty("clave")
    const revividas = revivirPreguntas([...guardadas, { tipo: "OTRO" }, null])
    expect(revividas).toHaveLength(1)
    expect(revividas[0]).toMatchObject({ tipo: "UNICA", texto: "¿2+2?", puntos: "5" })
    expect(revividas[0].opciones[0]).toMatchObject({ texto: "4", correcta: true })
    expect(revividas[0].clave).not.toBe(p.clave)
    expect(revivirPreguntas("x")).toEqual([])
  })

  it("candidatos: solo nombre, número, lema y foto en data URL", () => {
    const guardados = candidatosGuardables([
      { nombre: "Ana", numero: "1", lema: "", fotoUrl: "data:image/jpeg;base64,AA" },
      { nombre: "Luis", numero: "2", lema: "Unidos" },
    ])
    expect(revivirCandidatos(guardados)).toEqual(guardados)
    expect(revivirCandidatos([{ nombre: "Sin número" }])).toEqual([])
  })

  it("idsDe, hayContenido, título y tamaño", () => {
    expect([...idsDe([3, "4", 5])]).toEqual([3, 5])
    expect(hayContenido("  ", [], new Set())).toBe(false)
    expect(hayContenido("", new Set([1]))).toBe(true)
    expect(tituloBorrador("  ")).toBe("Sin título")
    expect(tituloBorrador("x".repeat(200))).toHaveLength(150)
    expect(bytesDatos({ a: "ñ" })).toBe(JSON.stringify({ a: "ñ" }).length + 1)
  })

  it("conBorrador agrega ?borrador solo si hay id", () => {
    expect(conBorrador(7)).toEqual({ params: { borrador: 7 } })
    expect(conBorrador(null)).toBeUndefined()
  })
})
