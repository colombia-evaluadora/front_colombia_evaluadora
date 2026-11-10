import { useQuery } from "@tanstack/react-query"

import { evalCol } from "@/lib/eval-col-client"
import {
  INSCRIPCIONES_BASE,
  datos,
  fetchCatalogosInscripcion,
  fetchEstablecimientoId,
  fetchGruposAdmisionRows,
  type GrupoAdmisionRow,
} from "@/features/coverage/inscripcion-reservas/api/query/use-inscripciones-query"
import type {
  CatalogosConfiguracion,
  GrupoAdmisionConfig,
  PeriodoInscripcionConfig,
} from "@/features/coverage/inscripcion-reservas/api/types/configuracion"

const all = ["inscripcion-configuracion"] as const

export const configuracionKeys = {
  all,
  grupos: [...all, "grupos"] as const,
  grupo: (id: string) => [...all, "grupos", id] as const,
  periodos: [...all, "periodos"] as const,
  periodo: (id: string) => [...all, "periodos", id] as const,
  catalogos: [...all, "catalogos"] as const,
}

export const nombreGrupo = (g: Pick<GrupoAdmisionConfig, "anio" | "modalidad" | "ciclo">) =>
  `${g.anio} · ${g.modalidad} · Ciclo ${g.ciclo}`

export const nombrePeriodo = (
  p: Pick<PeriodoInscripcionConfig, "establecimiento" | "anio" | "jornada" | "modalidad">,
) => `${p.establecimiento} · ${p.anio} · ${p.jornada} · ${p.modalidad}`

const CONFIG = `${INSCRIPCIONES_BASE}/configuracion`

const toGrupoConfig = (g: GrupoAdmisionRow): GrupoAdmisionConfig => ({
  id: String(g.id),
  anio: Number(g.anio),
  modalidad: g.modalidad,
  ciclo: g.ciclo,
  establecimiento: "",
  periodos: g.periodos.map((p) => p.nombre),
  fechaCierre: g.fechaCierre,
  menorFechaLimiteMatricula: g.menorFechaLimiteMatricula,
  modoAdmision: g.modoAdmision,
  criterios: g.criterios.map(String),
  desempate: g.desempate,
  documentosRequeridos: g.documentosRequeridos.map(String),
  bloqueado: g.bloqueado,
  configurado: g.configurado,
})

/** JSON de `fn_periodo_inscripcion_detalle_interno`: ids numéricos y año como texto. */
export type PeriodoInscripcionRow = Omit<
  PeriodoInscripcionConfig,
  "id" | "grupoAdmisionId" | "anio"
> & {
  id: number
  grupoAdmisionId: number
  anio: string | number
}

const toPeriodoConfig = (p: PeriodoInscripcionRow): PeriodoInscripcionConfig => ({
  ...p,
  id: String(p.id),
  grupoAdmisionId: String(p.grupoAdmisionId),
  anio: Number(p.anio),
})

export function useGruposAdmisionConfigQuery() {
  return useQuery({
    queryKey: configuracionKeys.grupos,
    queryFn: async () => {
      const ee = await fetchEstablecimientoId()
      return ee == null ? [] : (await fetchGruposAdmisionRows(ee)).map(toGrupoConfig)
    },
  })
}

export function useGrupoAdmisionConfigQuery(id: string) {
  return useQuery({
    queryKey: configuracionKeys.grupo(id),
    queryFn: async () =>
      toGrupoConfig(
        datos(await evalCol.getRow<{ datos: GrupoAdmisionRow }>(`${CONFIG}/grupos/${id}`)),
      ),
    enabled: Boolean(id),
  })
}

export function usePeriodosConfigQuery() {
  return useQuery({
    queryKey: configuracionKeys.periodos,
    queryFn: async () => {
      const ee = await fetchEstablecimientoId()
      if (ee == null) return []
      const [row] = await evalCol.getRows<{ datos: PeriodoInscripcionRow[] }>(
        `${CONFIG}/establecimiento/${ee}/periodos`,
      )
      return (row ? datos(row) : []).map(toPeriodoConfig)
    },
  })
}

export function usePeriodoConfigQuery(id: string) {
  return useQuery({
    queryKey: configuracionKeys.periodo(id),
    queryFn: async () =>
      toPeriodoConfig(
        datos(await evalCol.getRow<{ datos: PeriodoInscripcionRow }>(`${CONFIG}/periodos/${id}`)),
      ),
    enabled: Boolean(id),
  })
}

/** Criterios activos y documentos requeribles: el formulario trabaja con ids en texto. */
export function useCatalogosConfiguracionQuery() {
  return useQuery({
    queryKey: configuracionKeys.catalogos,
    queryFn: async (): Promise<CatalogosConfiguracion> => {
      const c = await fetchCatalogosInscripcion()
      const str = (l: { id: number; nombre: string }[]) =>
        l.map((i) => ({ id: String(i.id), nombre: i.nombre }))
      return { criterios: str(c.criterios), documentos: str(c.documentos) }
    },
    staleTime: Infinity,
  })
}
