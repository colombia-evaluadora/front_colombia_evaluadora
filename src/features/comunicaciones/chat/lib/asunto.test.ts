import { describe, expect, it } from "vitest"

import {
  abreviarNombre,
  contextoBandeja,
  eventoMembresia,
  lineaParticipantesGrupo,
  textoEventoMembresia,
  tituloConversacion,
} from "@/features/comunicaciones/chat/lib/asunto"

describe("asunto de la mensajería", () => {
  it("usa el asunto como título y el nombre como respaldo", () => {
    expect(tituloConversacion({ asunto: "Salida pedagógica", nombre: "Nelly Silva" })).toBe("Salida pedagógica")
    expect(tituloConversacion({ asunto: null, nombre: "Nelly Silva" })).toBe("Nelly Silva")
    expect(tituloConversacion({ asunto: "  ", nombre: "#general" })).toBe("#general")
  })

  it("abrevia el nombre de pila", () => {
    expect(abreviarNombre("Nelly Silva")).toBe("N. Silva")
    expect(abreviarNombre("javier Ramírez Toro")).toBe("J. Ramírez Toro")
    expect(abreviarNombre("Colevabot")).toBe("Colevabot")
  })

  it("arma el contexto de la bandeja", () => {
    const base = { asunto: "Tareas", nombre: "Nelly Silva", totalMiembros: 3 }
    expect(contextoBandeja({ ...base, tipo: "DIRECTO" })).toBe("N. Silva")
    expect(contextoBandeja({ ...base, tipo: "GRUPO" })).toBe("Grupo · 3")
    expect(contextoBandeja({ ...base, asunto: null, tipo: "DIRECTO" })).toBeNull()
  })

  it("pone primero al creador en la línea de participantes", () => {
    const linea = lineaParticipantesGrupo([
      { nombre: "Carlos Medina" },
      { nombre: "Javier Ramírez", esCreador: true },
      { nombre: "Ana Ruiz" },
      { nombre: "Luis Peña" },
      { nombre: "Acudiente", estado: "INVITADO" },
    ])
    expect(linea).toBe("Grupal · J. Ramírez (creador), C. Medina, A. Ruiz…")
  })

  it("reconoce los eventos de membresía", () => {
    expect(eventoMembresia("agregó a María López")).toEqual({ accion: "agregó", nombre: "María López" })
    expect(eventoMembresia("retiró a María López.")).toEqual({ accion: "retiró", nombre: "María López" })
    expect(eventoMembresia("se ha unido a 7A.")).toBeNull()
    expect(textoEventoMembresia("Javier Ramírez", { accion: "agregó", nombre: "María López" })).toBe(
      "J. Ramírez agregó a M. López",
    )
  })
})
