import { useEffect, useRef } from "react"

import { useNotify } from "@/components/notice/notice-context"
import { getErrorMessage } from "@/lib/api-client"
import {
  useAceptarInvitacion,
  useRechazarInvitacion,
} from "@/features/comunicaciones/chat/api/query/use-invitaciones-query"

/**
 * El push de CHAT_GRUPO_INVITACION trae los botones Aceptar / Rechazar (service worker): abren
 * `/app/comunicaciones/chat?invitacion=<id>&accion=aceptar|rechazar`. La pestaña, que sí tiene
 * sesión, responde una sola vez y limpia `accion` de la URL.
 */
export function useResponderInvitacionEnlazada(
  invitacion: number | undefined,
  accion: "aceptar" | "rechazar" | undefined,
  { onAceptada, onFin }: { onAceptada: (conversacionId: number) => void; onFin: () => void },
) {
  const { notify } = useNotify()
  // Avisos en el hook (ver `useAceptarInvitacion`): sacar la invitación del cache puede
  // desmontar a quien llamó `mutate` antes de sus callbacks.
  const aceptar = useAceptarInvitacion({
    onAceptada: (c) => {
      notify(`Te uniste a ${c.nombre}.`)
      onAceptada(c.id)
    },
  })
  const rechazar = useRechazarInvitacion({
    onRechazada: () => {
      notify("Rechazaste la invitación al grupo.")
      onFin()
    },
  })
  const hecho = useRef<string | null>(null)

  useEffect(() => {
    if (!invitacion || !accion) return
    const clave = `${invitacion}:${accion}`
    if (hecho.current === clave) return
    hecho.current = clave
    const onError = (e: unknown) => {
      notify(getErrorMessage(e), { variant: "error" })
      onFin()
    }
    if (accion === "aceptar") {
      aceptar.mutate(invitacion, { onError })
    } else {
      rechazar.mutate(invitacion, { onError })
    }
  }, [invitacion, accion, aceptar, rechazar, notify, onAceptada, onFin])
}
