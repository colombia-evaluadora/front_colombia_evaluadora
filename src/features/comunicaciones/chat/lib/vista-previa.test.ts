import { describe, expect, it } from "vitest"

import type { Mensaje } from "@/features/comunicaciones/chat/api/types"
import {
  horaVistaPrevia,
  lineaVistaPrevia,
  textoPlanoVistaPrevia,
  ultimoMensajeDe,
} from "@/features/comunicaciones/chat/lib/vista-previa"

const base: Mensaje = {
  id: 1,
  conversacionId: 7,
  autor: { id: 2, nombre: "Darlene Robertson", enLinea: true },
  esPropio: false,
  texto: "",
  fecha: "2026-10-22T12:00:00.000Z",
  adjunto: null,
  editado: false,
  fijado: false,
}

describe("vista previa del último mensaje", () => {
  it("quita el formato del compositor como comms-service", () => {
    expect(textoPlanoVistaPrevia("**Hola** _todos_\n> cita\n- uno <@3>")).toBe("Hola todos cita uno @")
    expect(textoPlanoVistaPrevia("snake_case_id")).toBe("snake_case_id")
    const largo = textoPlanoVistaPrevia("x".repeat(300))
    expect(largo).toHaveLength(120)
    expect(largo.endsWith("…")).toBe(true)
  })

  it("resume adjuntos, votaciones y tarjetas del bot", () => {
    expect(ultimoMensajeDe({ ...base, adjunto: { nombre: "acta.pdf", formato: "PDF", eliminadoEn: null } }, 1)?.texto).toBe(
      "Adjunto: acta.pdf",
    )
    const bot = ultimoMensajeDe(
      { ...base, bot: { clave: "k", encabezado: null, titulo: "Planilla lista", descripcion: null, campos: [], acciones: [] } },
      2,
    )
    expect(bot).toMatchObject({ texto: "Planilla lista", tipo: "BOT", esPropio: false })
    expect(ultimoMensajeDe({ ...base, eliminado: true }, 1)).toBeNull()
  })

  it("antepone Tú o el nombre en grupos, no en directos", () => {
    const u = { texto: "Hola", autor: "Darlene Robertson", esPropio: false, enviadoEn: base.fecha, tipo: "NORMAL" as const }
    expect(lineaVistaPrevia({ tipo: "DIRECTO", ultimoMensaje: u })).toBe("Hola")
    expect(lineaVistaPrevia({ tipo: "GRUPO", ultimoMensaje: u })).toBe("Darlene: Hola")
    expect(lineaVistaPrevia({ tipo: "GRUPO", ultimoMensaje: { ...u, esPropio: true } })).toBe("Tú: Hola")
    expect(lineaVistaPrevia({ tipo: "DIRECTO", ultimoMensaje: { ...u, tipo: "BOT" } })).toBe("Hola")
    expect(lineaVistaPrevia({ tipo: "CANAL", ultimoMensaje: null })).toBe("")
  })

  it("la hora es corta hoy, Ayer, el día de la semana y luego la fecha", () => {
    const ahora = new Date(2026, 9, 22, 15, 0)
    expect(horaVistaPrevia(new Date(2026, 9, 22, 9, 5).toISOString(), ahora)).toMatch(/^9:05/)
    expect(horaVistaPrevia(new Date(2026, 9, 21, 9, 5).toISOString(), ahora)).toBe("Ayer")
    expect(horaVistaPrevia(new Date(2026, 9, 19, 9, 5).toISOString(), ahora)).toBe("Lunes")
    expect(horaVistaPrevia(new Date(2026, 8, 1, 9, 5).toISOString(), ahora)).toBe("01/09/26")
  })
})
