import { z } from "zod"
import Axios from "axios"

import { getErrorMessage } from "@/lib/api-client"
import { maxLength, required } from "@/lib/forms/messages"
import type { Persona } from "@/features/comunicaciones/chat/api/types"
import { MAX_ASUNTO, MAX_DESTINATARIOS_SEPARADO, MAX_MENSAJE } from "@/features/comunicaciones/chat/lib/asunto"

/**
 * "Nuevo mensaje" (M.2.NUE.1/2/3): un solo diálogo con tres modos.
 * - INDIVIDUAL: un directo nuevo con una persona (un hilo por asunto, SSO #1006).
 * - SEPARADO: el mismo mensaje a cada persona en un directo propio (sin adjuntos).
 * - GRUPAL: un grupo con esas personas; quien lo crea lo gestiona.
 */
export type ModoNuevoMensaje = "INDIVIDUAL" | "SEPARADO" | "GRUPAL"

export const MODOS_NUEVO_MENSAJE: { valor: ModoNuevoMensaje; etiqueta: string }[] = [
  { valor: "INDIVIDUAL", etiqueta: "Individual" },
  { valor: "SEPARADO", etiqueta: "Enviar por separado" },
  { valor: "GRUPAL", etiqueta: "Grupal" },
]

export interface ValoresNuevoMensaje {
  para: Persona[]
  modo: ModoNuevoMensaje
  asunto: string
  mensaje: string
}

/** Textos de comms-service (400) para que el front y el servidor digan lo mismo. */
export const ASUNTO_OBLIGATORIO = "Escriba el asunto de la conversación."
export const ASUNTO_LARGO = `El asunto admite hasta ${MAX_ASUNTO} caracteres.`
export const SOLO_UNO_INDIVIDUAL =
  "En Individual elija una sola persona. Para varias, use Enviar por separado o Grupal."

/** 403 de comms-service para el estudiante menor sin permiso de iniciar (W.17.EST.1). */
export const MENOR_NO_INICIA =
  "Los estudiantes menores de edad no pueden iniciar conversaciones nuevas; pueden responder en las conversaciones donde los incluyeron."

export const nuevoMensajeSchema = z
  .object({
    para: z.array(z.custom<Persona>()),
    modo: z.enum(["INDIVIDUAL", "SEPARADO", "GRUPAL"]),
    asunto: z.string().trim().min(1, ASUNTO_OBLIGATORIO).max(MAX_ASUNTO, ASUNTO_LARGO),
    mensaje: z.string().trim().min(1, required("El mensaje")).max(MAX_MENSAJE, maxLength(MAX_MENSAJE, "El mensaje")),
  })
  .superRefine((v, ctx) => {
    if (v.para.length === 0) {
      ctx.addIssue({ code: "custom", path: ["para"], message: "Elija al menos un destinatario." })
    } else if (v.modo === "INDIVIDUAL" && v.para.length > 1) {
      ctx.addIssue({ code: "custom", path: ["para"], message: SOLO_UNO_INDIVIDUAL })
    } else if (v.modo === "SEPARADO" && v.para.length > MAX_DESTINATARIOS_SEPARADO) {
      ctx.addIssue({
        code: "custom",
        path: ["para"],
        message: `Puede enviar por separado hasta ${MAX_DESTINATARIOS_SEPARADO} personas a la vez.`,
      })
    }
  })

/** Error del envío: el 403 sin frase del servidor es el del estudiante menor. */
export function mensajeErrorNuevo(error: unknown): string {
  if (Axios.isAxiosError(error) && error.response?.status === 403) {
    const data = error.response.data as { message?: unknown } | string | undefined
    const frase = typeof data === "string" ? data.trim() : typeof data?.message === "string" ? data.message.trim() : ""
    if (!frase) return MENOR_NO_INICIA
  }
  return getErrorMessage(error)
}
