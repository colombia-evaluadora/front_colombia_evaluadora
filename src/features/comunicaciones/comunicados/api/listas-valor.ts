import { useQuery } from "@tanstack/react-query"

import {
  selectCategoryQueryOptions,
  type SelectCategoryRow,
} from "@/features/establishment/academic-period/api/query/fetch-select-category"

/**
 * Listas de valor del formulario de comunicados (QA 90 y 92; V562 en sso), administrables en
 * Administración › Listas de valor. Las opciones de los radios salen de acá, nunca quemadas; el
 * `valor` es el código que viaja al backend (que valida contra la misma lista). Los Roles de
 * funcionarios salen de la lista ROL vía la cascada, cruzados con las asignaciones de la sede y jornada.
 */
export const LISTA_POBLACION = "POBLACION_ACADEMICA_COMUNICADO"
export const LISTA_SELECCION_FUNCIONARIOS = "SELECCION_FUNCIONARIOS"
export const LISTA_FORMA_PUBLICACION = "FORMA_PUBLICACION"

/** Población que solo eligen el Administrador del establecimiento y el Gestor administrativo, con Acudientes. */
export const ASPIRANTES = "ASPIRANTES"

/** Rol del SSO del Gestor administrativo del establecimiento (RolEmision en comms-service). */
const GESTOR_ADMINISTRATIVO = "CEVAL-JEFE_SISTEMA_ESTABLECIMIENTO"

/** Roles del SSO que pueden elegir Aspirantes (Administrador del establecimiento, Gestor administrativo). */
const ROLES_ASPIRANTES = ["CEVAL-RECTOR", GESTOR_ADMINISTRATIVO]

export const puedeElegirAspirantes = (roles: string[] | undefined) =>
  (roles ?? []).some((r) => ROLES_ASPIRANTES.includes(r))

/**
 * Roles que publican comunicados por encima del Gestor administrativo (RolEmision en comms-service):
 * con alguno de ellos ya no es "solo gestor".
 */
const ROLES_EMISION_MAYORES = ["CEVAL-SUPER_ADMINISTRADOR", "CEVAL-RECTOR", "CEVAL-COORDINADOR"]

/**
 * Gestor administrativo del establecimiento sin un rol mayor (Guía M.1.AGR.4): solo publica a
 * Aspirantes; Matriculados, Estudiantes y Funcionarios quedan deshabilitados. comms-service lo exige igual.
 */
export const soloPublicaAspirantes = (roles: string[] | undefined) =>
  (roles ?? []).includes(GESTOR_ADMINISTRATIVO) &&
  !(roles ?? []).some((r) => ROLES_EMISION_MAYORES.includes(r))

export interface OpcionLista {
  valor: string
  etiqueta: string
  predeterminado: boolean
}

export const toOpcionesLista = (rows: SelectCategoryRow[]): OpcionLista[] =>
  rows.map((r) => ({ valor: r.valor, etiqueta: r.nombre, predeterminado: !!r.predeterminado }))

/** Valor predeterminado de la lista; si no marca ninguno, el primero. */
export const predeterminadoDe = (opciones: OpcionLista[] | undefined) =>
  opciones?.find((o) => o.predeterminado)?.valor ?? opciones?.[0]?.valor ?? ""

export function useListaComunicado(categoria: string) {
  return useQuery({ ...selectCategoryQueryOptions(categoria), select: toOpcionesLista })
}
