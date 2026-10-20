import { QueryClient } from "@tanstack/react-query"
import { describe, expect, it } from "vitest"

import {
  invalidarCalificacionesActividad,
  refrescarBloqueoEdicion,
} from "@/features/planeador/api/mutations/invalidar-calificaciones"
import { esCalificacionesDeActividad, planeadorKeys } from "@/features/planeador/api/query-keys"

/** Mismo criterio que TanStack Query (`partialMatchKey` sobre arrays). */
const esPrefijo = (prefijo: readonly unknown[], key: readonly unknown[]) =>
  prefijo.every((v, i) => JSON.stringify(v) === JSON.stringify(key[i]))

const alcance = { funcionario: 7, sede: 2, periodo: 9 }

describe("planeadorKeys: las keys invalidadas prefijan las de lectura (CLAUDE.md §11)", () => {
  it("X1: unidades.tabs() prefija las pestañas con y sin alcance", () => {
    expect(esPrefijo(planeadorKeys.unidades.tabs(), planeadorKeys.unidades.tabs())).toBe(true)
    expect(esPrefijo(planeadorKeys.unidades.tabs(), planeadorKeys.unidades.tabs(alcance))).toBe(true)
    // y no queda cubierto por unidades.all: por eso hace falta invalidarlo aparte
    expect(esPrefijo(planeadorKeys.unidades.all, planeadorKeys.unidades.tabs(alcance))).toBe(false)
  })

  it("unidades.all prefija los listados de unidades", () => {
    expect(esPrefijo(planeadorKeys.unidades.all, planeadorKeys.unidades.lista({ page: 0 }))).toBe(true)
  })

  it("actividades.all prefija rail, calendario, stats, lista y programación", () => {
    const p = { dia: "2026-10-14" }
    for (const key of [
      planeadorKeys.actividades.mias(p),
      planeadorKeys.actividades.calendario(p),
      planeadorKeys.actividades.stats(p),
      planeadorKeys.actividades.lista(),
      planeadorKeys.actividades.programacion(1, 2, 3),
    ]) {
      expect(esPrefijo(planeadorKeys.actividades.all, key)).toBe(true)
    }
  })

  it("actividades.tabs() prefija las pestañas con alcance", () => {
    expect(esPrefijo(planeadorKeys.actividades.tabs(), planeadorKeys.actividades.tabs(alcance))).toBe(true)
  })

  it("X2: actividad.calificaciones(id) prefija todas las fechas y el detalle la prefija", () => {
    const key = planeadorKeys.actividad.calificaciones(5, "2026-10-14")
    expect(esPrefijo(planeadorKeys.actividad.calificaciones(5), key)).toBe(true)
    expect(esPrefijo(planeadorKeys.actividad.detalle(5), key)).toBe(true)
    expect(esPrefijo(planeadorKeys.actividad.calificaciones(6), key)).toBe(false)
    expect(esCalificacionesDeActividad(key)).toBe(true)
    expect(esCalificacionesDeActividad(planeadorKeys.actividad.detalle(5))).toBe(false)
  })

  it("planilla.calificaciones.all prefija sus listados", () => {
    expect(
      esPrefijo(planeadorKeys.planilla.calificaciones.all, planeadorKeys.planilla.calificaciones.lista({ grupo: 1 })),
    ).toBe(true)
  })

  it("actividadEstudiante.nota es estable por pk", () => {
    expect(esPrefijo(planeadorKeys.actividadEstudiante.nota(3), planeadorKeys.actividadEstudiante.nota(3))).toBe(true)
  })
})

describe("invalidarCalificacionesActividad", () => {
  const sembrar = () => {
    const qc = new QueryClient()
    const keys = [
      planeadorKeys.actividad.calificaciones(5, "2026-10-14"),
      planeadorKeys.actividad.calificaciones(6, "2026-10-14"),
      planeadorKeys.actividad.detalle(5),
    ]
    for (const k of keys) qc.setQueryData(k, 1)
    const invalida = (k: readonly unknown[]) => qc.getQueryState(k)?.isInvalidated
    return { qc, keys, invalida }
  }

  it("con id invalida solo esa actividad", async () => {
    const { qc, keys, invalida } = sembrar()
    await invalidarCalificacionesActividad(qc, 5)
    expect(keys.map(invalida)).toEqual([true, false, false])
  })

  it("sin id invalida las calificaciones de todas, no el detalle", async () => {
    const { qc, keys, invalida } = sembrar()
    await invalidarCalificacionesActividad(qc)
    expect(keys.map(invalida)).toEqual([true, true, false])
  })
})

describe("refrescarBloqueoEdicion (Regla 37)", () => {
  const sembrar = (detalle: { motivoNoEditable?: string }) => {
    const qc = new QueryClient()
    const keys = [
      planeadorKeys.actividad.detalle(5),
      planeadorKeys.actividad.calificaciones(5, "2026-10-14"),
      planeadorKeys.actividad.detalle(6),
      planeadorKeys.actividades.mias({ dia: "2026-10-14" }),
    ]
    for (const k of keys) qc.setQueryData(k, k === keys[0] ? detalle : 1)
    const invalida = (k: readonly unknown[]) => qc.getQueryState(k)?.isInvalidated
    return { qc, keys, invalida }
  }

  it("con la actividad todavía editable refresca su detalle (solo él) y los listados", async () => {
    const { qc, keys, invalida } = sembrar({})
    await refrescarBloqueoEdicion(qc, 5)
    expect(keys.map(invalida)).toEqual([true, false, false, true])
  })

  it("ya bloqueada no vuelve a pedir nada en cada celda", async () => {
    const { qc, keys, invalida } = sembrar({ motivoNoEditable: "No puedes editar esta actividad…" })
    await refrescarBloqueoEdicion(qc, 5)
    expect(keys.map(invalida)).toEqual([false, false, false, false])
  })

  it("sin id marca todos los detalles (no lo que cuelga de ellos) y los listados", async () => {
    const { qc, keys, invalida } = sembrar({})
    await refrescarBloqueoEdicion(qc)
    expect(keys.map(invalida)).toEqual([true, false, true, true])
  })
})
