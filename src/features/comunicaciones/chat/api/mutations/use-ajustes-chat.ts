import { useMutation, useQueryClient } from "@tanstack/react-query"

import { evalCol } from "@/lib/eval-col-client"
import type { MutationConfig } from "@/lib/react-query"
import { chatKeys } from "@/features/comunicaciones/chat/api/query-keys"
import type { AjustesChat, AlertasConversacion, Conversacion } from "@/features/comunicaciones/chat/api/types"

const sn = (v: boolean) => (v ? "S" : "N")

async function guardarAjustesChat(a: AjustesChat) {
  return evalCol.putRow<AjustesChat>("/comunicaciones/ajustes", {
    CONFIRMACION_LECTURA_PERMITIR: sn(a.confirmacionLecturaPermitir),
    CONFIRMACION_LECTURA_SOLICITAR: sn(a.confirmacionLecturaSolicitar),
    SONIDO: sn(a.sonido),
  })
}

/** Guarda los ajustes del chat; la cache queda con lo que devuelve comms-service. */
export function useGuardarAjustesChat({
  mutationConfig,
}: { mutationConfig?: MutationConfig<typeof guardarAjustesChat> } = {}) {
  const queryClient = useQueryClient()
  const { onSuccess, ...rest } = mutationConfig ?? {}
  return useMutation({
    mutationFn: guardarAjustesChat,
    ...rest,
    onSuccess: (ajustes, ...args) => {
      queryClient.setQueryData(chatKeys.ajustes, ajustes)
      onSuccess?.(ajustes, ...args)
    },
  })
}

async function cambiarAlertas({ id, alertas }: { id: number; alertas: AlertasConversacion }) {
  return evalCol.patchRow<Conversacion>(`/comunicaciones/conversaciones/${id}/alertas`, {
    CAMPANA: sn(alertas.campana),
    SONIDO: sn(alertas.sonido),
    CORREO: sn(alertas.correo),
  })
}

/**
 * Medios por los que avisa una conversación (campana, sonido, correo). La lista se actualiza con
 * lo que devuelve comms-service y luego se revalida.
 */
export function useAlertasConversacion({
  mutationConfig,
}: { mutationConfig?: MutationConfig<typeof cambiarAlertas> } = {}) {
  const queryClient = useQueryClient()
  const { onSuccess, ...rest } = mutationConfig ?? {}
  return useMutation({
    mutationFn: cambiarAlertas,
    ...rest,
    onSuccess: (c, vars, ...args) => {
      queryClient.setQueryData<Conversacion[]>(chatKeys.conversaciones, (prev) =>
        prev?.map((x) =>
          x.id === vars.id
            ? {
                ...x,
                alertaCampana: c?.alertaCampana ?? vars.alertas.campana,
                alertaSonido: c?.alertaSonido ?? vars.alertas.sonido,
                alertaCorreo: c?.alertaCorreo ?? vars.alertas.correo,
              }
            : x,
        ),
      )
      void queryClient.invalidateQueries({ queryKey: chatKeys.conversaciones })
      onSuccess?.(c, vars, ...args)
    },
  })
}
