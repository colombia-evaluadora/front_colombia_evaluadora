import { useQuery } from "@tanstack/react-query"

import { evalCol } from "@/lib/eval-col-client"

import { queryString } from "@/features/gestion-estudiantil/commons/api/jsonb"
import { reintegracionKeys } from "@/features/gestion-estudiantil/reintegracion/api/query-keys"
import { BASE_REINTEGRACION } from "@/features/gestion-estudiantil/reintegracion/api/query/use-casos-query"
import type {
  ListaReintegracion,
  OpcionFuncionario,
  OpcionLista,
  OpcionMatricula,
  OpcionProfesional,
  OpcionRazon,
} from "@/features/gestion-estudiantil/reintegracion/api/types"

export interface OpcionesMatriculasParams {
  establecimiento: number | null
  sede?: number | null
  jornada?: number | null
  search?: string
}

/** `GET /opciones/matriculas`: solo matrículas Cursando sin caso abierto (hasta 50; el texto va al servidor). */
export function useOpcionesMatriculasQuery(params: OpcionesMatriculasParams, enabled = true) {
  return useQuery({
    queryKey: reintegracionKeys.opciones.matriculas(params),
    queryFn: () =>
      evalCol.getRows<OpcionMatricula>(
        `${BASE_REINTEGRACION}/opciones/matriculas${queryString({
          ESTABLECIMIENTO: params.establecimiento,
          SEDE: params.sede,
          JORNADA: params.jornada,
          SEARCH: params.search?.trim() || null,
          PAGESIZE: 50,
        })}`,
      ),
    enabled: enabled && params.establecimiento != null,
    staleTime: 60_000,
    placeholderData: (prev) => prev,
  })
}

/** `GET /opciones/profesionales`: con rol de trabajo social activo en la sede y jornada (403 fuera de alcance). */
export function useOpcionesProfesionalesQuery(sede: number | null, jornada: number | null, enabled = true) {
  return useQuery({
    queryKey: reintegracionKeys.opciones.profesionales(sede ?? "none", jornada ?? "none"),
    queryFn: () =>
      evalCol.getRows<OpcionProfesional>(
        `${BASE_REINTEGRACION}/opciones/profesionales${queryString({ SEDE: sede, JORNADA: jornada })}`,
      ),
    enabled: enabled && sede != null && jornada != null,
    retry: false,
    staleTime: 60_000,
  })
}

/** `GET /opciones/listas/:LISTA`: ORIGEN, MOTIVO_CIERRE, TIPO_INTERVENCION o RESULTADO_INTERVENCION. */
export function useOpcionesListaQuery(lista: ListaReintegracion, enabled = true) {
  return useQuery({
    queryKey: reintegracionKeys.opciones.lista(lista),
    queryFn: () => evalCol.getRows<OpcionLista>(`${BASE_REINTEGRACION}/opciones/listas/${lista}`),
    enabled,
    staleTime: 5 * 60_000,
  })
}

export interface OpcionesFuncionariosParams {
  establecimiento: number | null
  search?: string
}

/** `GET /opciones/funcionarios`: quien digita en el SIMPADE (sin Orientación). */
export function useOpcionesFuncionariosQuery(params: OpcionesFuncionariosParams, enabled = true) {
  return useQuery({
    queryKey: reintegracionKeys.opciones.funcionarios(params),
    queryFn: () =>
      evalCol.getRows<OpcionFuncionario>(
        `${BASE_REINTEGRACION}/opciones/funcionarios${queryString({
          ESTABLECIMIENTO: params.establecimiento,
          SEARCH: params.search?.trim() || null,
          PAGESIZE: 100,
        })}`,
      ),
    enabled: enabled && params.establecimiento != null,
    staleTime: 60_000,
    placeholderData: (prev) => prev,
  })
}

/** `GET /opciones/razones`: las 54 razones del abandono con su dimensión (Anexo A). */
export function useOpcionesRazonesQuery(enabled = true) {
  return useQuery({
    queryKey: reintegracionKeys.opciones.razones,
    queryFn: () => evalCol.getRows<OpcionRazon>(`${BASE_REINTEGRACION}/opciones/razones`),
    enabled,
    staleTime: 5 * 60_000,
  })
}
