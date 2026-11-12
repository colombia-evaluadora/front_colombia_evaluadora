import { describe, expect, it } from "vitest"

import type { ParametrosRiesgo } from "@/features/gestion-estudiantil/prevencion/api/types"
import {
  hayErroresParametros,
  limpiarDecimal,
  parametrosParaBackend,
  validarParametros,
  valoresIniciales,
} from "@/features/gestion-estudiantil/prevencion/utils/parametros"

const base: ParametrosRiesgo = {
  fk_testablecimiento: 1,
  inasist_consec_alerta: 3,
  caida_ra_alerta: null,
  caida_ra_referencia: 3.8,
  areas_reprobadas_alerta: 2,
  inasist_consec_intervencion: 5,
  inasist_consec_reintegracion: 10,
  inasist_alternadas_reintegracion: 15,
  plazo_incumplimiento_semanas: 2,
  plazo_contacto_dias: 2,
  plazo_intervencion_dias: 3,
  anotaciones_negativas_alerta: 3,
  compromisos_incumplidos_alerta: 1,
  condiciones_alerta: ["VICTIMA_CONFLICTO"],
  es_predeterminado: true,
}

describe("parámetros de riesgo", () => {
  it("los predeterminados son válidos y la caída vacía viaja null", () => {
    const v = valoresIniciales(base)
    expect(hayErroresParametros(validarParametros(v))).toBe(false)
    expect(parametrosParaBackend(1, v).CAIDA_RA_ALERTA).toBeNull()
  })

  it("exige el orden alerta < intervención < reintegración ≤ alternadas", () => {
    const v = valoresIniciales(base)
    const e = validarParametros({ ...v, intervencion: "3", reintConsec: "3", reintAlt: "2" })
    expect(e.intervencion).toBeDefined()
    expect(e.reintConsec).toBeDefined()
    expect(validarParametros({ ...v, reintConsec: "10", reintAlt: "9" }).reintAlt).toBeDefined()
    expect(validarParametros({ ...v, reintConsec: "6", reintAlt: "6" })).toEqual({})
  })

  it("valida rangos y la caída del RA", () => {
    const v = valoresIniciales(base)
    expect(validarParametros({ ...v, inasistAlerta: "1" }).inasistAlerta).toBeDefined()
    expect(validarParametros({ ...v, compromisos: "" }).compromisos).toBeDefined()
    expect(validarParametros({ ...v, caidaRa: "0,05" }).caidaRa).toBeDefined()
    expect(parametrosParaBackend(1, { ...v, caidaRa: "1,5" }).CAIDA_RA_ALERTA).toBe(1.5)
  })

  it("limpia lo tecleado en la caída del RA", () => {
    expect(limpiarDecimal("1.55a")).toBe("1,5")
    expect(limpiarDecimal("12")).toBe("12")
  })
})
