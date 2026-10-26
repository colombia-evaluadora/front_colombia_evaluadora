import { format } from "date-fns"
import { es } from "date-fns/locale"
import { describe, expect, it } from "vitest"

import { cerrarFrase } from "@/lib/frase"
import { fechaProgramada } from "@/features/comunicaciones/chat/lib/programacion"

describe("cerrarFrase", () => {
  it("no duplica el punto de a. m. / p. m.", () => {
    const hora = fechaProgramada("2026-10-22T12:30:00.000Z")
    expect(hora).toMatch(/m\.$/)
    expect(cerrarFrase(`Mensaje programado para el ${hora}`)).not.toContain("..")
    const df = format(new Date(2026, 9, 22, 19, 5), "d 'de' MMMM 'a las' h:mm a", { locale: es })
    const frase = cerrarFrase(`La votación abre el ${df}`)
    expect(frase).not.toContain("..")
    expect(frase.endsWith(".")).toBe(true)
  })

  it("agrega el punto cuando falta", () => {
    expect(cerrarFrase("Listo")).toBe("Listo.")
    expect(cerrarFrase("¿Listo?")).toBe("¿Listo?")
  })
})
