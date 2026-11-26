import { useQuery } from "@tanstack/react-query"

import { evalCol } from "@/lib/eval-col-client"
import { chatKeys } from "@/features/comunicaciones/chat/api/query-keys"
import type {
  HiloAcudientes,
  HiloAcudientesResumen,
  OpcionHiloAcudientes,
} from "@/features/comunicaciones/chat/api/types"

export const HILOS_ACUDIENTES = "/comunicaciones/hilos-acudientes"

export const fetchHilosAcudientes = () => evalCol.getRows<HiloAcudientesResumen>(HILOS_ACUDIENTES)
export const fetchOpcionesHilo = () => evalCol.getRows<OpcionHiloAcudientes>(`${HILOS_ACUDIENTES}/opciones`)

/**
 * Hilos con acudientes en los que participa el usuario (comms-service los sincroniza al leer). La
 * bandeja la usa para la línea "Grupo · N acudientes" y para saber qué conversación es un hilo.
 */
export function useHilosAcudientesQuery() {
  return useQuery({
    queryKey: chatKeys.hilosAcudientes,
    queryFn: fetchHilosAcudientes,
    staleTime: 60_000,
  })
}

/** Resumen del hilo de una conversación; `undefined` si no es un hilo con acudientes. */
export function useResumenHilo(conversacionId: number | undefined) {
  const { data } = useHilosAcudientesQuery()
  return conversacionId == null ? undefined : data?.find((h) => h.conversacionId === conversacionId)
}

/** Grupos y [Ejecuciones] del docente desde los que puede abrir un hilo (vacío: no ve la opción). */
export function useOpcionesHiloQuery() {
  return useQuery({
    queryKey: chatKeys.hilosAcudientesOpciones,
    queryFn: fetchOpcionesHilo,
    staleTime: 5 * 60_000,
  })
}

/** Encabezado y moderación del hilo; solo se pide si la conversación es un hilo. */
export function useHiloAcudientesQuery(conversacionId: number | undefined) {
  return useQuery({
    queryKey: chatKeys.hiloAcudientes(conversacionId ?? "none"),
    queryFn: () => evalCol.getRow<HiloAcudientes>(`${HILOS_ACUDIENTES}/${conversacionId}`),
    enabled: conversacionId != null,
  })
}
