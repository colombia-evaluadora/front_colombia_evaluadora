import { useMutation, useQueryClient } from "@tanstack/react-query"

import { evalCol } from "@/lib/eval-col-client"
import { chatKeys } from "@/features/comunicaciones/chat/api/query-keys"
import type { Borrador } from "@/features/comunicaciones/chat/api/types"

// Enviar un borrador crea un mensaje: se invalida todo el chat.
export function useEnviarBorrador() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => evalCol.patchRow<Borrador>(`/comunicaciones/borradores/${id}/enviar`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: chatKeys.all }),
  })
}

export function useEliminarBorrador() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) =>
      evalCol.patchRow<Borrador>(`/comunicaciones/borradores/${id}/eliminar`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: chatKeys.borradores }),
  })
}

/**
 * Guarda lo que quedó escrito en el editor de un canal (un borrador por canal y
 * persona; texto vacío lo descarta). Se dispara al salir del canal, sin aviso:
 * un fallo solo significa que no quedó el borrador.
 */
export function useGuardarBorrador() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ conversacionId, texto }: { conversacionId: number; texto: string }) =>
      evalCol.put(`/comunicaciones/conversaciones/${conversacionId}/borrador`, {
        TEXTO: texto,
      }),
    onSettled: () => queryClient.invalidateQueries({ queryKey: chatKeys.borradores }),
  })
}

// ── programados ─────────────────────────────────────────────────────────────
// `programadoPara`: `yyyy-MM-ddTHH:mm` en hora de Bogotá (lib/programacion.ts).

/** Programa lo escrito en el editor; el borrador del canal pasa a ser el programado. */
export function useProgramarMensaje() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      conversacionId,
      texto,
      programadoPara,
    }: {
      conversacionId: number
      texto: string
      programadoPara: string
    }) =>
      evalCol.postRow<Borrador>(`/comunicaciones/conversaciones/${conversacionId}/programados`, {
        TEXTO: texto,
        PROGRAMADO_PARA: programadoPara,
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: chatKeys.borradores }),
  })
}

/** Programa un borrador, o cambia el texto y la hora de uno ya programado. */
export function useProgramarBorrador() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, texto, programadoPara }: { id: number; texto?: string; programadoPara: string }) =>
      evalCol.patchRow<Borrador>(`/comunicaciones/borradores/${id}/programar`, {
        ...(texto === undefined ? {} : { TEXTO: texto }),
        PROGRAMADO_PARA: programadoPara,
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: chatKeys.borradores }),
  })
}

/** Cancela el envío programado: vuelve a Borradores (409 si el canal ya tiene uno). */
export function useCancelarProgramado() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => evalCol.patchRow<Borrador>(`/comunicaciones/borradores/${id}/cancelar`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: chatKeys.borradores }),
  })
}
