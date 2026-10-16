import { describe, expect, it } from "vitest"

import type { ConversacionDetalle } from "@/features/assistant/api/types"
import { aMensajesChat } from "@/features/assistant/hooks/use-asistente"
import { elegirSugerencias, sugerenciasPara } from "@/features/assistant/lib/sugerencias"

const base = { conversacion: { id: "c", titulo: null, estado: "ACTIVA", ultimoMensajeAt: null, createdAt: "" } } as const

describe("aMensajesChat", () => {
  it("restaura la respuesta estructurada y solo deja confirmar lo PENDIENTE", () => {
    const detalle: ConversacionDetalle = {
      ...base,
      mensajes: [
        { id: 1, secuencia: 1, rol: "USER", texto: "cambia el cargo", createdAt: "" },
        {
          id: 2,
          secuencia: 2,
          rol: "ASSISTANT",
          texto: "¿Confirmas?",
          tipoRespuesta: "CONFIRMACION",
          createdAt: "",
          respuesta: {
            tipo: "CONFIRMACION",
            texto: "¿Confirmas?",
            accionPendiente: { id: "a1", resumen: "Cambiar cargo", expira: "2099-01-01T00:00:00", estado: "PENDIENTE" },
          },
        },
        {
          id: 3,
          secuencia: 3,
          rol: "ASSISTANT",
          texto: "¿Confirmas otra?",
          tipoRespuesta: "CONFIRMACION",
          createdAt: "",
          respuesta: {
            tipo: "CONFIRMACION",
            texto: "¿Confirmas otra?",
            accionPendiente: { id: "a2", resumen: "Otra", expira: "2020-01-01T00:00:00", estado: "EXPIRADA" },
          },
        },
        {
          id: 4,
          secuencia: 4,
          rol: "ASSISTANT",
          texto: "Total",
          tipoRespuesta: "DATOS",
          createdAt: "",
          respuesta: { tipo: "DATOS", texto: "Total", datos: { columnas: ["n"], filas: [{ n: 3 }] } },
        },
        // Mensaje viejo sin `respuesta`.
        { id: 5, secuencia: 5, rol: "ASSISTANT", texto: "Hola", tipoRespuesta: "RESPUESTA", createdAt: "" },
      ],
    }
    const [, pendiente, expirada, datos, viejo] = aMensajesChat(detalle)
    expect(pendiente.estadoAccion).toBe("PENDIENTE")
    expect(expirada.estadoAccion).toBe("RESUELTA")
    expect(datos.respuesta?.datos?.filas).toEqual([{ n: 3 }])
    expect(viejo.respuesta).toEqual({ tipo: "RESPUESTA", texto: "Hola" })
  })
})

describe("elegirSugerencias", () => {
  it("usa las del servidor (máx. 6) o cae a las fijas", () => {
    const servidor = Array.from({ length: 8 }, (_, i) => ({ texto: `s${i}` }))
    expect(elegirSugerencias(servidor, "/app")).toHaveLength(6)
    expect(elegirSugerencias([], "/app/planeador")).toEqual(sugerenciasPara("/app/planeador"))
    expect(elegirSugerencias(undefined, "/app/planeador")).toEqual(sugerenciasPara("/app/planeador"))
  })
})
