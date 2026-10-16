import { describe, expect, it } from "vitest"

import { leerSse, parsearSse } from "@/features/assistant/lib/sse"

describe("parsearSse", () => {
  it("separa eventos completos y deja el resto", () => {
    const { eventos, resto } = parsearSse(
      'event:estado\ndata:{"estado":"VALIDADO"}\n\nevent: respuesta\ndata: {"tipo"',
    )
    expect(eventos).toEqual([{ evento: "estado", datos: '{"estado":"VALIDADO"}' }])
    expect(resto).toBe('event: respuesta\ndata: {"tipo"')
  })

  it("acepta CRLF, comentarios y data multilínea", () => {
    const { eventos } = parsearSse(": ping\r\ndata: a\r\ndata: b\r\n\r\n")
    expect(eventos).toEqual([{ evento: "message", datos: "a\nb" }])
  })
})

describe("leerSse", () => {
  it("reconstruye eventos partidos entre chunks", async () => {
    const encoder = new TextEncoder()
    const chunks = ['event: estado\ndata: {"est', 'ado":"INTENCION"}\n\nevent: respuesta\n', 'data: {"tipo":"RESPUESTA"}']
    const cuerpo = new ReadableStream<Uint8Array>({
      start(controller) {
        for (const chunk of chunks) controller.enqueue(encoder.encode(chunk))
        controller.close()
      },
    })
    const eventos = []
    for await (const evento of leerSse(cuerpo)) eventos.push(evento)
    expect(eventos).toEqual([
      { evento: "estado", datos: '{"estado":"INTENCION"}' },
      { evento: "respuesta", datos: '{"tipo":"RESPUESTA"}' },
    ])
  })
})
