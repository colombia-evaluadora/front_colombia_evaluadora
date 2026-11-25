import { describe, expect, it } from "vitest"

import type { CapacidadesGe } from "@/features/gestion-estudiantil/commons/api/use-capacidades-ge"
import { accesoConvivencia, banderasDe, SIN_BANDERAS } from "@/features/gestion-estudiantil/convivencia/utils/access"

const TODO = { puedeVer: true, puedeCrear: true, puedeEditar: true }
const NADA = { puedeVer: false, puedeCrear: false, puedeEditar: false }
const CAP: Partial<CapacidadesGe> = {
  convivencia_puede_crear_caso: true,
  convivencia_puede_exportar_siuce: true,
  convivencia_puede_abrir_proceso: true,
  comite_puede_ver: true,
  comite_puede_gestionar: true,
}

describe("accesoConvivencia", () => {
  it("lee las capacidades del backend, no los roles", () => {
    expect(accesoConvivencia(CAP, TODO)).toEqual({
      puedeCrear: true,
      puedeExportarSiuce: true,
      puedeAbrirProceso: true,
      puedeVerComite: true,
      puedeGestionarComite: true,
    })
  })
  it("el Comité se ve sin gestionarlo", () => {
    const a = accesoConvivencia({ ...CAP, comite_puede_gestionar: false }, TODO)
    expect(a).toMatchObject({ puedeVerComite: true, puedeGestionarComite: false })
  })
  it("sin capacidades (cargando o con error) todo queda deshabilitado", () => {
    expect(Object.values(accesoConvivencia(undefined, TODO)).every((x) => x === false)).toBe(true)
  })
  it("sin permiso del menú, la capacidad no basta", () => {
    expect(Object.values(accesoConvivencia(CAP, NADA)).every((x) => x === false)).toBe(true)
  })
})

describe("banderasDe", () => {
  it("lo que no llega se toma como «no puede»", () => {
    expect(banderasDe(undefined)).toEqual(SIN_BANDERAS)
    expect(banderasDe({ puede_cerrar: true })).toMatchObject({ puede_cerrar: true, puede_anular: false })
  })
})
