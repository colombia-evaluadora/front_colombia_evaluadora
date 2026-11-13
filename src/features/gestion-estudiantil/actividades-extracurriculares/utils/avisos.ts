import { takeServerMessage } from "@/lib/server-message"
import { queueNotice } from "@/components/notice/notice-context"

type Notificar = (mensaje: string, opciones?: { variant?: "success" }) => void

/**
 * Aviso de éxito con el texto de este módulo. El helper común prefiere la etiqueta de auditoría que da el servidor
 * (`X-Mensaje`); aquí se consume antes para que gane el texto local, que es el de la especificación.
 */
export function avisarExito(notify: Notificar, mensaje: string) {
  takeServerMessage()
  notify(mensaje, { variant: "success" })
}

/** Igual que `avisarExito`, para «guardar y navegar» (el aviso lo muestra la pantalla de destino). */
export function encolarExito(mensaje: string) {
  takeServerMessage()
  queueNotice(mensaje, { variant: "success" })
}
