import { describe, expect, it } from "vitest"

import { autoPrepareDue, AUTO_PREPARE_INTERVAL_MS, AUTO_PREPARE_RECONNECT_MIN_MS } from "@/features/offline/lib/auto-prepare"
import { mesesDelRango, periodosPorDefecto } from "@/features/offline/lib/prepare-tasks"
import { fechaResumen, fechasResumenDelMes } from "@/features/academic-management/asistencia/lib/fechas"

describe("meses que prepara el calendario", () => {
  it("cubre de inicio a fin de los periodos elegidos", () => {
    const meses = mesesDelRango([
      { startDate: "2026-07-13", endDate: "2026-09-18" },
      { startDate: "2026-09-21", endDate: "2026-11-27" },
    ])
    expect(meses).toEqual([
      { anio: 2026, mes: 7 },
      { anio: 2026, mes: 8 },
      { anio: 2026, mes: 9 },
      { anio: 2026, mes: 10 },
      { anio: 2026, mes: 11 },
    ])
  })

  it("sin periodos, el mes actual", () => {
    expect(mesesDelRango([], new Date(2026, 9, 19))).toEqual([{ anio: 2026, mes: 10 }])
  })
})

describe("informes: periodos por defecto (igual que la página)", () => {
  const p = (id: number, enCurso: boolean) => ({ id, enCurso }) as never
  it("los en curso, en el orden del backend", () => {
    expect(periodosPorDefecto([p(3, false), p(1, true), p(2, true)])).toEqual([1, 2])
  })
  it("sin ninguno en curso, el primero", () => {
    expect(periodosPorDefecto([p(7, false), p(8, false)])).toEqual([7])
  })
})

describe("asistencia: fecha del resumen semanal", () => {
  it("es el lunes de la semana sin salir del mes", () => {
    expect(fechaResumen(new Date(2026, 9, 21))).toBe("2026-10-19")
    // El 1 de octubre de 2026 es jueves: el lunes cae en septiembre.
    expect(fechaResumen(new Date(2026, 9, 1))).toBe("2026-10-01")
  })
  it("una fecha por semana del mes", () => {
    expect(fechasResumenDelMes(2026, 10)).toEqual(["2026-10-01", "2026-10-05", "2026-10-12", "2026-10-19", "2026-10-26"])
  })
})

describe("autopreparación: cuándo toca", () => {
  const now = Date.UTC(2026, 9, 19, 12)
  it("nunca preparado: toca", () => {
    expect(autoPrepareDue({ lastPrepareAt: null, now, reason: "inicio" })).toBe(true)
  })
  it("cada pocas horas", () => {
    expect(autoPrepareDue({ lastPrepareAt: now - AUTO_PREPARE_INTERVAL_MS + 1, now, reason: "periodico" })).toBe(false)
    expect(autoPrepareDue({ lastPrepareAt: now - AUTO_PREPARE_INTERVAL_MS, now, reason: "periodico" })).toBe(true)
  })
  it("al volver la red (app instalada) alcanza con media hora", () => {
    expect(autoPrepareDue({ lastPrepareAt: now - AUTO_PREPARE_RECONNECT_MIN_MS, now, reason: "reconexion" })).toBe(true)
    expect(autoPrepareDue({ lastPrepareAt: now - AUTO_PREPARE_RECONNECT_MIN_MS, now, reason: "inicio" })).toBe(false)
  })
})
