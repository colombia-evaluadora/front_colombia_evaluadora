import { useMutation, useQueryClient } from "@tanstack/react-query"

import { evalCol } from "@/lib/eval-col-client"
import { chatKeys } from "@/features/comunicaciones/chat/api/query-keys"
import { HILOS_ACUDIENTES } from "@/features/comunicaciones/chat/api/query/use-hilos-acudientes-query"
import type {
  Conversacion,
  HiloAcudientes,
  Mensaje,
  OpcionHiloAcudientes,
} from "@/features/comunicaciones/chat/api/types"
import { cuerpoNuevoHilo } from "@/features/comunicaciones/chat/lib/hilo-acudientes"

/** "Nuevo hilo con acudientes" (M.2.HIL.2): crea el hilo con su primer mensaje. */
export function useCrearHiloAcudientes() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ opcion, asunto, mensaje }: { opcion: OpcionHiloAcudientes; asunto: string; mensaje: string }) =>
      evalCol.postRow<Conversacion>(HILOS_ACUDIENTES, cuerpoNuevoHilo(opcion, asunto, mensaje)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: chatKeys.conversaciones })
      queryClient.invalidateQueries({ queryKey: chatKeys.hilosAcudientes })
    },
  })
}

/** El moderador oculta un mensaje ajeno: queda "Mensaje oculto por el moderador". */
export function useOcultarMensajeHilo() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ conversacionId, mensajeId }: { conversacionId: number; mensajeId: number }) =>
      evalCol.patchRow<Mensaje>(`${HILOS_ACUDIENTES}/${conversacionId}/mensajes/${mensajeId}/ocultar`),
    onSuccess: (m) =>
      queryClient.setQueryData<Mensaje[]>(chatKeys.mensajes(m.conversacionId), (prev) =>
        prev?.map((x) => (x.id === m.id ? m : x)),
      ),
  })
}

function useGuardarHilo() {
  const queryClient = useQueryClient()
  return (h: HiloAcudientes) => queryClient.setQueryData(chatKeys.hiloAcudientes(h.conversacionId), h)
}

/** Silenciar a un acudiente (motivo obligatorio): ve el hilo pero no escribe. */
export function useSilenciarAcudiente() {
  const guardar = useGuardarHilo()
  return useMutation({
    mutationFn: ({ conversacionId, usuarioId, motivo }: { conversacionId: number; usuarioId: number; motivo: string }) =>
      evalCol.postRow<HiloAcudientes>(`${HILOS_ACUDIENTES}/${conversacionId}/silencios`, {
        FK_USUARIO: usuarioId,
        MOTIVO: motivo.trim(),
      }),
    onSuccess: guardar,
  })
}

export function useQuitarSilencioAcudiente() {
  const guardar = useGuardarHilo()
  return useMutation({
    mutationFn: ({ conversacionId, usuarioId }: { conversacionId: number; usuarioId: number }) =>
      evalCol.patchRow<HiloAcudientes>(`${HILOS_ACUDIENTES}/${conversacionId}/silencios/${usuarioId}/quitar`),
    onSuccess: guardar,
  })
}
