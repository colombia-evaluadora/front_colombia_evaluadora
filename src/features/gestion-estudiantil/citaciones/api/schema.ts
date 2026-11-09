import { z } from "zod"

/** Search params de Citaciones y compromisos: la paginación que espera `useTablePagination` y la pestaña. */
export const citacionesSearchSchema = z.object({
  page: z.coerce.number().catch(0).default(0),
  pageSize: z.coerce.number().catch(10).default(10),
  sortBy: z.string().optional().catch(undefined),
  sortDir: z.enum(["asc", "desc"]).optional().catch(undefined),
  tab: z.enum(["citaciones", "compromisos"]).optional().catch(undefined),
})

export type CitacionesSearch = z.infer<typeof citacionesSearchSchema>
