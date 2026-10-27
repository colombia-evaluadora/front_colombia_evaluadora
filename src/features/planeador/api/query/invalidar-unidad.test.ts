import { QueryClient } from "@tanstack/react-query"
import { describe, expect, it } from "vitest"

import { planeadorKeys } from "@/features/planeador/api/query-keys"
import {
  invalidarListadosActividades,
  invalidarUnidad,
} from "@/features/planeador/api/query/invalidar-listados-actividades"

// Bug de QA: borrar una unidad temática dejaba el calendario, el rail, las
// cards y el detalle de las actividades vinculadas con datos viejos hasta
// recargar. Se siembran las keys TAL CUAL las arman los hooks de lectura
// (con params/alcance), así el test falla si una key invalidada deja de ser
// prefijo real de la de lectura.
const p = { dia: "2026-10-14", funcionario: 7 }
const alcance = { funcionario: 7, sede: 2, periodo: 3 }

function sembrar() {
  const queryClient = new QueryClient()
  const keys = {
    unidadesLista: planeadorKeys.unidades.lista(p),
    unidadesTabs: planeadorKeys.unidades.tabs(alcance),
    unidadesTabsSinAlcance: planeadorKeys.unidades.tabs(),
    unidadDetalle: planeadorKeys.unidad.detalle(1),
    unidadActividades: planeadorKeys.unidad.actividades(1),
    unidadDisponibles: planeadorKeys.unidad.actividadesDisponibles(2, ""),
    unidadCriterios: planeadorKeys.unidad.criterios(1),
    unidadConfig: planeadorKeys.unidad.configuracionActividad(1, true),
    mias: planeadorKeys.actividades.mias(p),
    calendario: planeadorKeys.actividades.calendario(p),
    stats: planeadorKeys.actividades.stats(p),
    listaLegado: planeadorKeys.actividades.lista(),
    programacion: planeadorKeys.actividades.programacion(5, 9, 1),
    actividadesTabs: planeadorKeys.actividades.tabs(alcance),
    actividadDetalle: planeadorKeys.actividad.detalle(602),
    actividadInstrumento: planeadorKeys.actividad.instrumento(602),
    actividadContexto: planeadorKeys.actividad.configuracionContexto(5, 9, true),
    planillaColumnas: planeadorKeys.planilla.columnas({ grupo: 5 }),
    planillaCalificaciones: planeadorKeys.planilla.calificaciones.lista({ grupo: 5 }),
    informes: ["informes", "grupo", 5],
    // No dependen de la unidad:
    filtrosSedes: planeadorKeys.filtros.sedes(),
    docentes: planeadorKeys.docentes(2, 3),
    otroModulo: ["asistencia", "calendario"],
  }
  for (const key of Object.values(keys)) queryClient.setQueryData(key, { ok: true })
  const invalidada = (key: readonly unknown[]) => queryClient.getQueryState(key)?.isInvalidated
  return { queryClient, keys, invalidada }
}

describe("invalidarUnidad", () => {
  it("marca todo lo que muestra la unidad o sus actividades", () => {
    const { queryClient, keys, invalidada } = sembrar()
    invalidarUnidad(queryClient)
    const { filtrosSedes, docentes, otroModulo, ...afectadas } = keys
    for (const [nombre, key] of Object.entries(afectadas)) {
      expect(invalidada(key), nombre).toBe(true)
    }
    expect(invalidada(filtrosSedes)).toBe(false)
    expect(invalidada(docentes)).toBe(false)
    expect(invalidada(otroModulo)).toBe(false)
  })
})

describe("invalidarListadosActividades (eliminar actividad)", () => {
  it("refresca rail, calendario, cards, la unidad y la planilla", () => {
    const { queryClient, keys, invalidada } = sembrar()
    invalidarListadosActividades(queryClient, { detalleId: 602 })
    for (const nombre of [
      "mias",
      "calendario",
      "stats",
      "listaLegado",
      "actividadDetalle",
      "actividadInstrumento",
      "unidadDetalle",
      "unidadActividades",
      "unidadDisponibles",
      "unidadesLista",
      "planillaColumnas",
      "planillaCalificaciones",
      "informes",
    ] as const) {
      expect(invalidada(keys[nombre]), nombre).toBe(true)
    }
    expect(invalidada(keys.filtrosSedes)).toBe(false)
  })
})
