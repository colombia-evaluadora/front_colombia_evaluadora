import { describe, expect, it } from "vitest"

import { parsePersisted, stringifyPersisted } from "@/lib/offline/query-persister"

describe("fechas en la copia guardada sin conexión", () => {
  it("restaura los Date como Date, no como texto", () => {
    const original = {
      periodoAcademico: { nombre: "P1", fechaInicio: new Date("2026-09-12T00:00:00.000Z"), fechaFin: null },
      lista: [{ dia: new Date("2026-10-01T05:00:00.000Z") }],
      texto: "2026-09-12",
    }
    const restaurado = parsePersisted(stringifyPersisted(original)) as typeof original
    expect(restaurado.periodoAcademico.fechaInicio).toBeInstanceOf(Date)
    expect(restaurado.periodoAcademico.fechaInicio.toISOString()).toBe("2026-09-12T00:00:00.000Z")
    expect(restaurado.lista[0].dia).toBeInstanceOf(Date)
    expect(restaurado.periodoAcademico.fechaFin).toBeNull()
    // Un texto con forma de fecha sigue siendo texto.
    expect(restaurado.texto).toBe("2026-09-12")
  })

  it("una fecha inválida se restaura como null", () => {
    const restaurado = parsePersisted(stringifyPersisted({ d: new Date("x") })) as { d: unknown }
    expect(restaurado.d).toBeNull()
  })
})
