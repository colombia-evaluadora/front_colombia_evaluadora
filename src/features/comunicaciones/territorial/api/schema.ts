import { z } from "zod"

/**
 * Búsqueda de la consulta territorial de comunicados (Guía M.1.TER.1): título, establecimiento,
 * estado y fecha desde, más orden y página, en la URL. Toda clave con `.catch`: una URL inválida
 * nunca tira. Cancelado no está: comms-service no lo devuelve en esta consulta.
 */
export const comunicadosTerritorialSearchSchema = z.object({
  q: z.string().max(100).optional().catch(undefined),
  // pk del establecimiento; comms-service solo acepta los que el usuario tiene a cargo.
  establecimiento: z
    .string()
    .regex(/^\d+$/)
    .optional()
    .catch(undefined),
  estado: z.enum(["PROGRAMADO", "PUBLICADO", "VENCIDO", "ANULADO"]).optional().catch(undefined),
  desde: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .catch(undefined),
  sortBy: z
    .enum(["fecha", "establecimiento", "titulo", "publicadoPor", "destinatarios", "estado"])
    .optional()
    .catch(undefined),
  sortDir: z.enum(["asc", "desc"]).optional().catch(undefined),
  page: z.coerce.number().int().min(0).catch(0).default(0),
  pageSize: z.coerce.number().int().min(1).max(100).catch(10).default(10),
})

export type ComunicadosTerritorialSearch = z.infer<typeof comunicadosTerritorialSearchSchema>
export type OrdenTerritorial = NonNullable<ComunicadosTerritorialSearch["sortBy"]>
