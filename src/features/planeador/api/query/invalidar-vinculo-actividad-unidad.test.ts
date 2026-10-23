import { QueryClient } from "@tanstack/react-query"
import { describe, expect, it } from "vitest"

import { planeadorKeys } from "@/features/planeador/api/query-keys"
import { invalidarVinculoActividadUnidad } from "@/features/planeador/api/query/invalidar-listados-actividades"

// Bug de QA: vincular/desvincular una actividad desde la tabla de la unidad no
// se veía en el detalle de la actividad hasta recargar (solo se invalidaba
// `unidad.detalle(unidadId)`).
describe("invalidarVinculoActividadUnidad", () => {
  const p = { dia: "2026-10-14" }

  function sembrar() {
    const queryClient = new QueryClient()
    const keys = {
      detalle: planeadorKeys.actividad.detalle(602),
      instrumento: planeadorKeys.actividad.instrumento(602),
      otroDetalle: planeadorKeys.actividad.detalle(603),
      mias: planeadorKeys.actividades.mias(p),
      calendario: planeadorKeys.actividades.calendario(p),
      stats: planeadorKeys.actividades.stats(p),
      unidad: planeadorKeys.unidad.detalle(1),
      vinculadas: planeadorKeys.unidad.actividades(1),
      disponiblesOtraUnidad: planeadorKeys.unidad.actividadesDisponibles(2, ""),
      unidades: planeadorKeys.unidades.lista({ page: 0 }),
      informes: ["informes", "grupo", 5],
      // No dependen del vínculo:
      tabs: planeadorKeys.actividades.tabs(),
      planilla: planeadorKeys.planilla.columnas({ grupo: 1 }),
    }
    for (const key of Object.values(keys)) queryClient.setQueryData(key, { ok: true })
    return { queryClient, keys }
  }

  it("marca el detalle de la actividad, los listados del planeador y todo lo de unidades", () => {
    const { queryClient, keys } = sembrar()
    invalidarVinculoActividadUnidad(queryClient, 602)
    const invalidada = (key: readonly unknown[]) => queryClient.getQueryState(key)?.isInvalidated
    for (const nombre of [
      "detalle",
      "instrumento",
      "otroDetalle",
      "mias",
      "calendario",
      "stats",
      "unidad",
      "vinculadas",
      "disponiblesOtraUnidad",
      "unidades",
      "informes",
    ] as const) {
      expect(invalidada(keys[nombre]), nombre).toBe(true)
    }
    expect(invalidada(keys.tabs)).toBe(false)
    expect(invalidada(keys.planilla)).toBe(false)
  })
})
