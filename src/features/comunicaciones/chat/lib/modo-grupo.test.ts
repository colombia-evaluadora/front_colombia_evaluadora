import { describe, expect, it } from "vitest"

import {
  cuerpoModo,
  listaPerfiles,
  modoValido,
  motivoSinEscritura,
  puedeEscribir,
  resumenModo,
} from "@/features/comunicaciones/chat/lib/modo-grupo"

const grupo = { tipo: "GRUPO" as const, esAdmin: false }

describe("modo de escritura del grupo", () => {
  it("abierto o sin modo: todos escriben; otros tipos no se ven afectados", () => {
    expect(puedeEscribir({ ...grupo, modo: "ABIERTO" }, "ESTUDIANTE")).toBe(true)
    expect(puedeEscribir({ ...grupo }, "ACUDIENTE")).toBe(true)
    expect(puedeEscribir({ tipo: "CANAL", modo: "SOLO_LECTURA" }, "ESTUDIANTE")).toBe(true)
  })

  it("solo lectura: solo quien gestiona", () => {
    expect(puedeEscribir({ ...grupo, modo: "SOLO_LECTURA" }, "DIRECTIVO")).toBe(false)
    expect(puedeEscribir({ ...grupo, modo: "SOLO_LECTURA", esAdmin: true }, "DOCENTE")).toBe(true)
    expect(motivoSinEscritura({ ...grupo, modo: "SOLO_LECTURA" }, "DOCENTE")).toMatch(/solo lectura/)
  })

  it("moderado: quien gestiona y los perfiles elegidos", () => {
    const c = { ...grupo, modo: "MODERADO" as const, rolesEscritura: ["DOCENTE" as const, "DIRECTIVO" as const] }
    expect(puedeEscribir(c, "DOCENTE")).toBe(true)
    expect(puedeEscribir(c, "ACUDIENTE")).toBe(false)
    expect(motivoSinEscritura(c, "ACUDIENTE")).toBe("En este grupo solo escriben quien lo gestiona y Directivos y Docentes.")
    expect(motivoSinEscritura(c, "DOCENTE")).toBeNull()
  })

  it("resumen, lista y cuerpo", () => {
    expect(listaPerfiles(["ESTUDIANTE", "DOCENTE", "ACUDIENTE"])).toBe("Docentes, Acudientes y Estudiantes")
    expect(resumenModo({ modo: "ABIERTO" })).toBeNull()
    expect(resumenModo({ modo: "SOLO_LECTURA" })).toBe("Solo lectura")
    expect(resumenModo({ modo: "MODERADO", rolesEscritura: ["DOCENTE"] })).toBe("Moderado: Docentes")
    expect(cuerpoModo("SOLO_LECTURA", ["DOCENTE"])).toEqual({ MODO: "SOLO_LECTURA", ROLES_ESCRITURA: [] })
    expect(cuerpoModo("MODERADO", ["DOCENTE"])).toEqual({ MODO: "MODERADO", ROLES_ESCRITURA: ["DOCENTE"] })
    expect(modoValido("MODERADO", [])).toBe(false)
    expect(modoValido("ABIERTO", [])).toBe(true)
  })
})
