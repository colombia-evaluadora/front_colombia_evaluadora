import { z } from "zod"

/** Search params de la vista Observador: la paginación que espera `useTablePagination`. */
export const observadorSearchSchema = z.object({
  page: z.coerce.number().catch(0).default(0),
  pageSize: z.coerce.number().catch(10).default(10),
  sortBy: z.string().optional().catch(undefined),
  sortDir: z.enum(["asc", "desc"]).optional().catch(undefined),
})

export type ObservadorSearch = z.infer<typeof observadorSearchSchema>
