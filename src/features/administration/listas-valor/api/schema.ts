import { z } from "zod"

/** Search params de la pantalla: lista elegida, búsqueda de valores y paginación. */
export const listasValorSearchSchema = z.object({
  lista: z.string().optional().catch(undefined),
  q: z.string().optional().catch(undefined),
  page: z.coerce.number().int().nonnegative().catch(0).default(0),
  pageSize: z.coerce.number().int().positive().catch(10).default(10),
  sortBy: z.string().optional().catch(undefined),
  sortDir: z.enum(["asc", "desc"]).optional().catch(undefined),
})

export type ListasValorSearch = z.infer<typeof listasValorSearchSchema>
