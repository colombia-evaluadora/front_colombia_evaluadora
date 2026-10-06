import { z } from "zod"

export const VISTAS_CHAT = ["archivos", "borradores"] as const
export type VistaChat = (typeof VISTAS_CHAT)[number]

export const chatSearchSchema = z.object({
  canal: z.coerce.number().int().positive().optional().catch(undefined),
  vista: z.enum(VISTAS_CHAT).optional().catch(undefined),
})

export type ChatSearch = z.infer<typeof chatSearchSchema>
