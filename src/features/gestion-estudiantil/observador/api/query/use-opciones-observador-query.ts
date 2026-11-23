import { useEffect, useState } from "react"
import { useQuery } from "@tanstack/react-query"

import { evalCol } from "@/lib/eval-col-client"

import { observadorKeys } from "@/features/gestion-estudiantil/observador/api/query-keys"
import type { EstudianteObservador, GrupoObservador, ResponsableObservador } from "@/features/gestion-estudiantil/observador/api/types"

const BASE = "/gestion-estudiantil/observador/opciones"

/** REGISTRAR: estudiantes que el usuario puede anotar; IMPRIMIR: los de su alcance para imprimir o cargar el firmado. */
export type PropositoEstudiantes = "REGISTRAR" | "IMPRIMIR"

export interface EstudiantesObservadorParams {
  proposito: PropositoEstudiantes
  search?: string
  establecimiento?: number
  sede?: number
  jornada?: number
  grupo?: number
  limite?: number
}

/** Query string con solo los parámetros presentes (los nombres van en mayúsculas, como los binds del endpoint). */
export function toQueryString(params: Record<string, string | number | undefined | null>) {
  const q = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) if (v != null && v !== "") q.set(k, String(v))
  return q.toString()
}

/** Valor que se actualiza tras una pausa: evita una consulta por cada tecla del buscador. */
export function useValorDiferido<T>(valor: T, ms = 300): T {
  const [v, setV] = useState(valor)
  useEffect(() => {
    const t = setTimeout(() => setV(valor), ms)
    return () => clearTimeout(t)
  }, [valor, ms])
  return v
}

/** `GET /gestion-estudiantil/observador/opciones/estudiantes`: búsqueda por nombre o documento, con alcance del backend. */
export function useEstudiantesObservadorQuery(params: EstudiantesObservadorParams, enabled = true) {
  const search = useValorDiferido(params.search?.trim() ?? "")
  const qs = toQueryString({
    PROPOSITO: params.proposito,
    SEARCH: search,
    ESTABLECIMIENTO: params.establecimiento,
    SEDE: params.sede,
    JORNADA: params.jornada,
    GRUPO: params.grupo,
    LIMITE: params.limite,
  })
  return useQuery({
    queryKey: observadorKeys.opciones("estudiantes", qs),
    queryFn: () => evalCol.getRows<EstudianteObservador>(`${BASE}/estudiantes?${qs}`),
    enabled,
    staleTime: 1000 * 30,
    placeholderData: (prev) => prev,
  })
}

/** `GET /gestion-estudiantil/observador/opciones/grupos`: grupos del mismo alcance que los estudiantes del propósito. */
export function useGruposObservadorQuery(
  params: { proposito: PropositoEstudiantes; establecimiento?: number; sede?: number; jornada?: number },
  enabled = true,
) {
  const qs = toQueryString({
    PROPOSITO: params.proposito,
    ESTABLECIMIENTO: params.establecimiento,
    SEDE: params.sede,
    JORNADA: params.jornada,
  })
  return useQuery({
    queryKey: observadorKeys.opciones("grupos", qs),
    queryFn: () => evalCol.getRows<GrupoObservador>(`${BASE}/grupos?${qs}`),
    enabled,
    staleTime: 1000 * 30,
  })
}

/** `GET /gestion-estudiantil/observador/opciones/responsables`: funcionarios del alcance para el filtro. */
export function useResponsablesObservadorQuery(params: { establecimiento?: number; sede?: number; search?: string }) {
  const qs = toQueryString({ SEARCH: params.search, ESTABLECIMIENTO: params.establecimiento, SEDE: params.sede })
  return useQuery({
    queryKey: observadorKeys.opciones("responsables", qs),
    queryFn: () => evalCol.getRows<ResponsableObservador>(`${BASE}/responsables?${qs}`),
    staleTime: 1000 * 60,
  })
}
