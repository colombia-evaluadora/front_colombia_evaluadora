import { describe, expect, it } from "vitest"

import {
  codificarMenciones,
  consultaMencion,
  decodificarMenciones,
  extraerMenciones,
  segmentarMenciones,
  sugerenciasMencion,
} from "@/features/comunicaciones/chat/lib/menciones"
import {
  POLITICA_CHAT_SUGERIDA,
  perfilDeRoles,
  puedeMencionarMasivo,
  reglaDirecto,
} from "@/features/comunicaciones/chat/lib/politica-chat"

const miembros = [
  { id: 2, nombre: "Darlene Robertson" },
  { id: 3, nombre: "Marta Lucía Ríos" },
]

describe("menciones", () => {
  it("detecta la consulta antes del cursor", () => {
    expect(consultaMencion("hola @Mar", 9)).toEqual({ inicio: 5, consulta: "Mar" })
    expect(consultaMencion("correo@x", 8)).toBeNull()
  })

  it("sugiere por palabra sin tildes y masivas solo con permiso", () => {
    expect(sugerenciasMencion("lu", miembros, false).map((s) => s.nombre)).toEqual(["Marta Lucía Ríos"])
    expect(sugerenciasMencion("to", miembros, true).map((s) => s.tipo)).toEqual(["TODOS"])
    expect(sugerenciasMencion("to", miembros, false)).toEqual([])
  })

  it("codifica, extrae y decodifica", () => {
    const texto = codificarMenciones("Hola @Darlene Robertson y @todos", [miembros[0]])
    expect(texto).toBe("Hola <@2> y @todos")
    const sin = extraerMenciones(texto, miembros, false)
    expect(sin).toEqual([{ tipo: "USUARIO", usuarioId: 2, nombre: "Darlene Robertson" }])
    const con = extraerMenciones(texto, miembros, true)
    expect(con.map((m) => m.tipo)).toEqual(["USUARIO", "TODOS"])
    expect(decodificarMenciones(texto, con)).toBe("Hola @Darlene Robertson y @todos")
    expect(segmentarMenciones(texto, sin).map((p) => p.tipo)).toEqual(["texto", "mencion", "texto"])
  })
})

describe("politica-chat", () => {
  it("aplica la matriz sugerida sin hardcodear en la UI", () => {
    const p = POLITICA_CHAT_SUGERIDA
    expect(reglaDirecto(p, "DOCENTE", "ACUDIENTE")).toBe("PERMITIDO")
    expect(reglaDirecto(p, "ESTUDIANTE", "ESTUDIANTE")).toBe("PROHIBIDO")
    expect(puedeMencionarMasivo(p, "ESTUDIANTE")).toBe(false)
    expect(perfilDeRoles(["CEVAL-RECTOR", "CEVAL-DOCENTE"])).toBe("DIRECTIVO")
  })
})
