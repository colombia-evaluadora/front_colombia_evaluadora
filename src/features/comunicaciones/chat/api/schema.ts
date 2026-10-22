import { z } from "zod"

export const VISTAS_CHAT = ["archivos", "borradores"] as const
export type VistaChat = (typeof VISTAS_CHAT)[number]

export const chatSearchSchema = z.object({
  canal: z.coerce.number().int().positive().optional().catch(undefined),
  vista: z.enum(VISTAS_CHAT).optional().catch(undefined),
  // Deep link de notificaciones (canal + mensaje): salta al mensaje y lo resalta.
  mensaje: z.coerce.number().int().positive().optional().catch(undefined),
  // Invitación a un grupo (CHAT_GRUPO_INVITACION): se resalta en "Invitaciones"; con `accion`
  // (botón Aceptar / Rechazar del push) se responde al abrir.
  invitacion: z.coerce.number().int().positive().optional().catch(undefined),
  accion: z.enum(["aceptar", "rechazar"]).optional().catch(undefined),
})

export type ChatSearch = z.infer<typeof chatSearchSchema>
