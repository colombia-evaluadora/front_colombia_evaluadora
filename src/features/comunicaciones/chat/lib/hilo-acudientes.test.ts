import { describe, expect, it } from "vitest"

import {
  acudientesTexto,
  contextoBandejaHilo,
  cuerpoNuevoHilo,
  lineaEncabezadoHilo,
  motivoSinEscrituraHilo,
  nuevoHiloSchema,
  silencioSchema,
  valorOpcionHilo,
} from "@/features/comunicaciones/chat/lib/hilo-acudientes"

const grupo = { tipo: "GRUPO" as const, grupo: 601, asignacion: null, nombre: "Sexto 601", acudientes: 3 }
const ejecucion = { tipo: "EJECUCION" as const, grupo: 702, asignacion: 9001, nombre: "Matemáticas · 702", acudientes: 1 }

describe("hilo con acudientes", () => {
  it("arma el encabezado y la línea de la bandeja", () => {
    expect(lineaEncabezadoHilo({ acudientes: 3, moderador: { id: 1, nombre: "Julia Ramírez" } })).toBe(
      "3 acudientes vigentes · Moderador: Julia Ramírez",
    )
    expect(lineaEncabezadoHilo({ acudientes: 1, moderador: { id: 1, nombre: "J" } })).toBe(
      "1 acudiente vigente · Moderador: J",
    )
    expect(contextoBandejaHilo({ acudientes: 12 })).toBe("Grupo · 12 acudientes")
    expect(acudientesTexto(1)).toBe("1 acudiente")
  })

  it("explica por qué no se escribe", () => {
    expect(motivoSinEscrituraHilo(undefined)).toBeNull()
    expect(motivoSinEscrituraHilo({ soloLectura: false, silenciado: false })).toBeNull()
    expect(motivoSinEscrituraHilo({ soloLectura: true, silenciado: true })).toMatch(/solo lectura/)
    expect(motivoSinEscrituraHilo({ soloLectura: false, silenciado: true })).toMatch(/silenció/)
  })

  it("distingue grupo y ejecución en el select y en el cuerpo", () => {
    expect(valorOpcionHilo(grupo)).toBe("g:601")
    expect(valorOpcionHilo(ejecucion)).toBe("e:9001")
    expect(cuerpoNuevoHilo(ejecucion, " Taller ", " Hola ")).toEqual({
      FK_TGRUPO: 702,
      FK_TDOCENTE_ASIGNATURA: 9001,
      ASUNTO: "Taller",
      TEXTO: "Hola",
    })
    expect(cuerpoNuevoHilo(grupo, "a", "b").FK_TDOCENTE_ASIGNATURA).toBeNull()
  })

  it("valida campos obligatorios y el motivo del silencio", () => {
    const r = nuevoHiloSchema.safeParse({ opcion: "", asunto: " ", mensaje: "" })
    expect(r.success).toBe(false)
    if (!r.success) expect(r.error.issues.map((i) => i.path[0]).sort()).toEqual(["asunto", "mensaje", "opcion"])
    expect(nuevoHiloSchema.safeParse({ opcion: "g:601", asunto: "Salida", mensaje: "Hola" }).success).toBe(true)
    expect(silencioSchema.safeParse({ motivo: "   " }).success).toBe(false)
    expect(silencioSchema.safeParse({ motivo: "x".repeat(501) }).success).toBe(false)
    expect(silencioSchema.safeParse({ motivo: "Mensajes ofensivos" }).success).toBe(true)
  })
})
