import { z } from "zod"

/** Search params de Convivencia: la paginación que espera `useTablePagination` y la pestaña con su período. */
export const convivenciaSearchSchema = z.object({
  page: z.coerce.number().catch(0).default(0),
  pageSize: z.coerce.number().catch(10).default(10),
  sortBy: z.string().optional().catch(undefined),
  sortDir: z.enum(["asc", "desc"]).optional().catch(undefined),
  tab: z.enum(["casos", "comite"]).optional().catch(undefined),
  periodo: z.coerce.number().int().positive().optional().catch(undefined),
})

export type ConvivenciaSearch = z.infer<typeof convivenciaSearchSchema>

/** Search de las pantallas del Comité que solo necesitan el período. */
export const comitePeriodoSearchSchema = z.object({
  periodo: z.coerce.number().int().positive().optional().catch(undefined),
})
