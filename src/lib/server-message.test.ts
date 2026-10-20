import { describe, expect, it } from "vitest"

import { noteServerMessage, resolveSuccessMessage, takeServerMessage } from "@/lib/server-message"

describe("server-message (header X-Mensaje)", () => {
  it("usa el mensaje del servidor una sola vez y cae al texto local", () => {
    noteServerMessage(encodeURIComponent("Creación de la sede Norte"))
    expect(resolveSuccessMessage("Sede creada.", "success")).toBe("Creación de la sede Norte")
    expect(resolveSuccessMessage("Sede creada.", "success")).toBe("Sede creada.")
  })

  it("no reemplaza errores ni avisos", () => {
    noteServerMessage("Etiqueta")
    expect(resolveSuccessMessage("Falló", "error")).toBe("Falló")
    takeServerMessage()
  })

  it("con varios mensajes distintos (borrado múltiple) usa el texto local", () => {
    noteServerMessage("Eliminación del área A")
    noteServerMessage("Eliminación del área B")
    expect(resolveSuccessMessage("2 áreas eliminadas.", undefined)).toBe("2 áreas eliminadas.")
  })
})
