import { describe, expect, it } from "vitest"

import {
  AVISO_MS,
  INACTIVIDAD_MS,
  calcularFase,
  formatearCuentaRegresiva,
} from "@/components/layout/aviso-inactividad-estado"

describe("calcularFase", () => {
  const base = 1_000_000

  it("activo mientras faltan más de 2 minutos", () => {
    expect(calcularFase(base + 10_000, base).fase).toBe("activo")
    expect(calcularFase(base + INACTIVIDAD_MS - AVISO_MS - 1, base).fase).toBe("activo")
  })

  it("aviso en los últimos 2 minutos, con el tiempo restante", () => {
    const r = calcularFase(base + INACTIVIDAD_MS - AVISO_MS, base)
    expect(r).toEqual({ fase: "aviso", restanteMs: AVISO_MS })
    expect(calcularFase(base + INACTIVIDAD_MS - 1, base).fase).toBe("aviso")
  })

  it("expirado al cumplir 30 minutos (o más, p. ej. tras suspender el equipo)", () => {
    expect(calcularFase(base + INACTIVIDAD_MS, base)).toEqual({ fase: "expirado", restanteMs: 0 })
    expect(calcularFase(base + 5 * INACTIVIDAD_MS, base).fase).toBe("expirado")
  })

  it("una actividad en el futuro (reloj de otra pestaña) no da negativo", () => {
    expect(calcularFase(base, base + 5_000)).toEqual({ fase: "activo", restanteMs: INACTIVIDAD_MS })
  })
})

describe("formatearCuentaRegresiva", () => {
  it("formatea m:ss redondeando hacia arriba", () => {
    expect(formatearCuentaRegresiva(AVISO_MS)).toBe("2:00")
    expect(formatearCuentaRegresiva(65_000)).toBe("1:05")
    expect(formatearCuentaRegresiva(400)).toBe("0:01")
    expect(formatearCuentaRegresiva(0)).toBe("0:00")
    expect(formatearCuentaRegresiva(-50)).toBe("0:00")
  })
})

