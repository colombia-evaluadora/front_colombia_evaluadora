import { z } from "zod"

/**
 * Búsqueda de "Comunicados institucionales" (M.1.LIS.1): pestaña, título, estado y fecha desde en la
 * URL. Toda clave con `.catch`: una URL inválida nunca tira.
 */
export const comunicadosSearchSchema = z.object({
  pestana: z.enum(["PUBLICADOS", "RECIBIDOS", "ANTERIORES"]).optional().catch(undefined),
  q: z.string().max(100).optional().catch(undefined),
  estado: z.enum(["PUBLICADO", "PROGRAMADO", "VENCIDO", "CANCELADO", "ANULADO"]).optional().catch(undefined),
  desde: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .catch(undefined),
  page: z.coerce.number().int().min(0).catch(0).default(0),
  pageSize: z.coerce.number().int().min(1).max(100).catch(10).default(10),
})

export type ComunicadosSearch = z.infer<typeof comunicadosSearchSchema>
