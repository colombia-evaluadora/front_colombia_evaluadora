import { z } from "zod"

import {
  VALORES_ESTADO,
  VALORES_PERFIL,
  VALORES_TIPO,
} from "@/features/comunicaciones/chat/lib/filtros-chat"

const FECHA_ISO = /^\d{4}-\d{2}-\d{2}$/

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
  // Historial y filtros (lib/filtros-chat.ts): en la URL para compartirlos o guardarlos como
  // marcador. Palabras clave, persona, rol, grupo académico, tipo, fechas y estado.
  q: z.string().max(200).optional().catch(undefined),
  persona: z.string().max(120).optional().catch(undefined),
  roles: z.array(z.enum(VALORES_PERFIL)).optional().catch(undefined),
  grupos: z.array(z.coerce.number().int().positive()).optional().catch(undefined),
  tipos: z.array(z.enum(VALORES_TIPO)).optional().catch(undefined),
  desde: z.string().regex(FECHA_ISO).optional().catch(undefined),
  hasta: z.string().regex(FECHA_ISO).optional().catch(undefined),
  estados: z.array(z.enum(VALORES_ESTADO)).optional().catch(undefined),
})

export type ChatSearch = z.infer<typeof chatSearchSchema>
