import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { evalCol } from "@/lib/eval-col-client"
import { toPaginated } from "@/lib/pagination"
import { camelizar } from "@/features/coverage/matricula-complementaria/api/convocatorias"
import { informesKeys } from "@/features/coverage/informes-reportes/api/informes"
import type { InformesSearch } from "@/features/coverage/informes-reportes/api/schema"

// Calidad de la información de matrícula (C.4.CAL; Sección 3.9, Regla 77).

const BASE = "/informes-reportes/calidad"
const calidadKeys = {
  all: [...informesKeys.all, "calidad"] as const,
  lista: (body: unknown) => [...informesKeys.all, "calidad", "lista", body] as const,
  historial: (id: number) => [...informesKeys.all, "calidad", "historial", id] as const,
}

export const CONTROLES: Record<string, string> = {
  C1: "C1 Posibles duplicados",
  C2: "C2 Identidad corregida",
  C3: "C3 Tipo de documento",
  C4: "C4 Edad atípica",
  C5: "C5 Grado entre vigencias",
  C6: "C6 Ciclos de adultos",
  C7: "C7 Residencia y dirección",
  C8: "C8 Etnia cambiada",
  C9: "C9 Completitud",
  C10: "C10 Soporte",
  C11: "C11 Nuevos e internados",
}

export const ESTADOS_HALLAZGO = [
  { value: "PENDIENTE", label: "Pendiente" },
  { value: "AJUSTADO", label: "Ajustado" },
  { value: "JUSTIFICADO", label: "Justificado" },
]

export interface Hallazgo {
  hallazgoId: number
  control: string
  estudiante: string
  establecimiento: string
  dato: string
  estado: "PENDIENTE" | "AJUSTADO" | "JUSTIFICADO"
  justificacion: string | null
  corte: string | null
  matriculaId: number
  porControl: Record<string, number> | null
}

/** Filtros de la lista; los reusa el export. */
export const filtrosCalidad = (s: InformesSearch) => ({
  PERIODO: s.periodo ?? null,
  SEDE: s.sede || null,
  JORNADA: s.jornada || null,
  GRADO: s.grado ?? null,
  CONTROL: s.control ?? null,
  ESTADO: s.estadoHallazgo ?? null,
  BUSCAR: s.q || null,
})

export function useHallazgosQuery(s: InformesSearch, p: { pageIndex: number; pageSize: number }) {
  const body = { ...filtrosCalidad(s), PAGEINDEX: p.pageIndex, PAGESIZE: p.pageSize }
  return useQuery({
    queryKey: calidadKeys.lista(body),
    queryFn: async () => {
      const rows = await evalCol.postRows<Record<string, unknown> & { total_count: number }>(`${BASE}/query`, body)
      const pagina = toPaginated(rows, { pageSize: p.pageSize, map: (r) => camelizar<Hallazgo>(r) })
      return { ...pagina, porControl: pagina.rows[0]?.porControl ?? {} }
    },
    placeholderData: keepPreviousData,
  })
}

export function useHistorialHallazgoQuery(id: number) {
  return useQuery({
    queryKey: calidadKeys.historial(id),
    queryFn: async () =>
      camelizar<{ fecha: string; actor: string; estado: string; texto: string }[]>(await evalCol.getRows(`${BASE}/${id}/historial`)),
  })
}

export function useGenerarCalidad() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (v: { periodo: number; corte: string }) => evalCol.postRow(`${BASE}/generar`, { PERIODO: v.periodo, CORTE: v.corte }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: calidadKeys.all }),
  })
}

export function useCambiarEstadoHallazgo() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (v: { id: number; accion: "JUSTIFICAR" | "MODIFICAR" | "DEVOLVER"; texto: string }) =>
      evalCol.put(`${BASE}/${v.id}/estado`, { ACCION: v.accion, TEXTO: v.texto }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: calidadKeys.all }),
  })
}
