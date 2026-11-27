import { z } from "zod"

/** Search params de la vista Observador: la paginación que espera `useTablePagination`. */
export const observadorSearchSchema = z.object({
  page: z.coerce.number().catch(0).default(0),
  pageSize: z.coerce.number().catch(10).default(10),
  sortBy: z.string().optional().catch(undefined),
  sortDir: z.enum(["asc", "desc"]).optional().catch(undefined),
  /** Abre el modal de Nueva anotación (enlace directo `observador/nueva`). */
  nueva: z.coerce.boolean().optional().catch(undefined),
  /** Abre el modal de Modificar anotación de ese id (enlace directo `observador/editar/$id`). */
  editar: z.coerce.number().optional().catch(undefined),
})

export type ObservadorSearch = z.infer<typeof observadorSearchSchema>
