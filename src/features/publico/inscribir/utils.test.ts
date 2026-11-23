import { describe, expect, it } from "vitest"

import { PERIODOS_DEMO } from "@/features/publico/inscribir/datos-demo"
import {
  establecimientosDe,
  gradosDe,
  jornadasDe,
  mismoGrupoAdmision,
  modalidadesDe,
  opcionCompleta,
  pideModalidad,
  resolverOpcionPublica,
  sedesDe,
} from "@/features/publico/inscribir/utils"

const opcion = (establecimiento: string, sede: string, jornada: string, modalidad = "") => ({
  establecimiento,
  sede,
  jornada,
  modalidad,
})

describe("cascada de opciones de la inscripción pública", () => {
  it("deriva grados, establecimientos, sedes y jornadas de los períodos", () => {
    expect(gradosDe(PERIODOS_DEMO)).toContain("Sexto")
    expect(establecimientosDe(PERIODOS_DEMO, "Sexto")).toEqual(["IE Central", "IE Norte", "IE Sur"])
    expect(sedesDe(PERIODOS_DEMO, "Sexto", "IE Norte")).toEqual(["Sede principal", "Sede 2"])
    expect(jornadasDe(PERIODOS_DEMO, "Sexto", "IE Norte", "Sede 2")).toEqual(["Tarde", "Noche"])
    expect(establecimientosDe(PERIODOS_DEMO, "Grado inexistente")).toEqual([])
  })

  it("pide la modalidad solo cuando la sede y jornada tienen el grado en dos períodos", () => {
    const doble = opcion("IE Norte", "Sede 2", "Tarde")
    expect(pideModalidad(PERIODOS_DEMO, "Sexto", doble)).toBe(true)
    expect(modalidadesDe(PERIODOS_DEMO, "Sexto", doble)).toHaveLength(2)
    expect(opcionCompleta(PERIODOS_DEMO, "Sexto", doble)).toBe(false)
    expect(pideModalidad(PERIODOS_DEMO, "Sexto", opcion("IE Sur", "Sede principal", "Única"))).toBe(false)
  })

  it("resuelve {periodo, grado} y exige un solo grupo de admisión (Regla 27)", () => {
    const anual = opcion("IE Central", "IE Central", "Mañana")
    const r = resolverOpcionPublica(PERIODOS_DEMO, "Sexto", anual)!
    const periodo = PERIODOS_DEMO.find((p) => p.periodoId === r.periodo)!
    expect(periodo.grados.find((g) => g.id === r.grado)?.nombre).toBe("Sexto")

    const modalidades = modalidadesDe(PERIODOS_DEMO, "Sexto", opcion("IE Norte", "Sede 2", "Tarde"))
    const semestral = opcion("IE Norte", "Sede 2", "Tarde", modalidades.find((m) => m.includes("Semestral")))
    expect(resolverOpcionPublica(PERIODOS_DEMO, "Sexto", semestral)).not.toBeNull()
    expect(mismoGrupoAdmision(PERIODOS_DEMO, "Sexto", [anual, semestral])).toBe(false)
    expect(mismoGrupoAdmision(PERIODOS_DEMO, "Sexto", [anual, opcion("IE Sur", "Sede principal", "Mañana")])).toBe(true)
    expect(resolverOpcionPublica(PERIODOS_DEMO, "Sexto", opcion("IE Sur", "Sede 9", "Mañana"))).toBeNull()
  })
})
