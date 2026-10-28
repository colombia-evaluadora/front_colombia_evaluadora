import { describe, expect, it } from "vitest"

import type { CalendarEntry } from "@/features/establishment/academic-period/api/types/academic-calendar"
import {
  formatCalendarRange,
  getCalendarSummary,
  getColombianHolidays,
  getNonWorkingDays,
} from "@/features/establishment/academic-period/utils/academic-calendar"

const entry = (partial: Partial<CalendarEntry>): CalendarEntry => ({
  id: 1,
  type: "VACACIONES",
  origin: "REGISTRADO",
  from: "2027-01-04",
  to: "2027-01-04",
  reason: "Motivo",
  ...partial,
})

describe("getColombianHolidays", () => {
  it("corre los festivos Emiliani al lunes y calcula los de Pascua", () => {
    const holidays = new Map(getColombianHolidays(2027).map((h) => [h.name, h.date]))
    expect(holidays.get("Día de San José")).toBe("2027-03-22")
    expect(holidays.get("Jueves Santo")).toBe("2027-03-25")
    expect(holidays.get("Día de la Raza")).toBe("2027-10-18")
    expect(holidays.get("Navidad")).toBe("2027-12-25")
  })
})

describe("formatCalendarRange", () => {
  it("muestra un día o un rango", () => {
    expect(formatCalendarRange("2027-03-22", "2027-03-22")).toBe("22/03/2027")
    expect(formatCalendarRange("2027-06-21", "2027-07-12")).toBe("21/06/2027 – 12/07/2027")
  })
})

describe("getCalendarSummary", () => {
  // Lunes 4 a domingo 17 de enero de 2027: 12 días de lunes a sábado.
  const start = "2027-01-04"
  const end = "2027-01-17"

  it("cuenta lunes a sábado sin entradas", () => {
    expect(getCalendarSummary([], start, end)).toEqual({ workingDays: 12, teachingWeeks: 2 })
  })

  it("quita vacaciones y devuelve las excepciones", () => {
    const entries = [
      entry({ id: 1, from: "2027-01-11", to: "2027-01-17" }),
      entry({ id: 2, type: "HABIL", from: "2027-01-12", to: "2027-01-12" }),
    ]
    expect(getCalendarSummary(entries, start, end)).toEqual({ workingDays: 7, teachingWeeks: 2 })
  })

  it("no cuenta una semana sin días hábiles", () => {
    const entries = [entry({ from: "2027-01-11", to: "2027-01-17" })]
    expect(getCalendarSummary(entries, start, end).teachingWeeks).toBe(1)
  })
})

describe("getNonWorkingDays", () => {
  it("ignora excepciones y la entrada que se edita", () => {
    const entries = [
      entry({ id: 1 }),
      entry({ id: 2, type: "HABIL", from: "2027-01-05", to: "2027-01-05" }),
    ]
    expect([...getNonWorkingDays(entries)]).toEqual(["2027-01-04"])
    expect(getNonWorkingDays(entries, 1).size).toBe(0)
  })
})
