import { describe, expect, it } from "vitest"
import { getClassMinutes, getRecesoTimes, getScheduleSlots, toRecesosBody } from "./recesos"

// Ejemplos de la Regla 32 del documento de Establecimiento.
describe("recesos", () => {
  it("calcula la hora de clase descontando los recesos", () => {
    const breaks = [{ label: "Recreo", location: "3", durationMinutes: 30 }]
    expect(getClassMinutes("06:00", "12:00", 6, breaks)).toBe(55)
  })

  it("ubica el receso después del bloque indicado", () => {
    const breaks = [{ label: "Recreo", location: "3", durationMinutes: 30 }]
    expect(getRecesoTimes("06:00", "12:00", 6, breaks)).toEqual([
      { startTime: "08:45", endTime: "09:15" },
    ])
  })

  it("un receso al inicio empieza con la jornada y corre los bloques", () => {
    const breaks = [
      { label: "Formación", location: "INICIO", durationMinutes: 15 },
      { label: "Recreo", location: "2", durationMinutes: 30 },
    ]
    expect(getRecesoTimes("07:00", "12:45", 6, breaks)).toEqual([
      { startTime: "07:00", endTime: "07:15" },
      { startTime: "08:55", endTime: "09:25" },
    ])
  })

  it("no ubica un receso tras un bloque que no existe", () => {
    const breaks = [{ label: "Recreo", location: "8", durationMinutes: 30 }]
    expect(getRecesoTimes("06:00", "12:00", 6, breaks)).toEqual([null])
  })

  it("arma el body con la ubicación separada del bloque", () => {
    expect(
      toRecesosBody([
        { label: " Recreo ", location: "3", durationMinutes: 30 },
        { label: "Salida", location: "FINAL", durationMinutes: 10 },
      ]),
    ).toEqual([
      { label: "Recreo", location: "BLOQUE", afterBlock: 3, durationMinutes: 30 },
      { label: "Salida", location: "FINAL", afterBlock: null, durationMinutes: 10 },
    ])
  })
})

describe("getScheduleSlots", () => {
  it("intercala el receso después del bloque indicado", () => {
    const slots = getScheduleSlots("06:00", "12:00", 6, [
      { label: "Recreo", location: "3", durationMinutes: 30 },
    ])
    expect(slots.map((s) => (s.kind === "block" ? `${s.block} ${s.startTime}` : `${s.label} ${s.startTime}-${s.endTime}`))).toEqual([
      "1 06:00",
      "2 06:55",
      "3 07:50",
      "Recreo 08:45-09:15",
      "4 09:15",
      "5 10:10",
      "6 11:05",
    ])
  })
})
