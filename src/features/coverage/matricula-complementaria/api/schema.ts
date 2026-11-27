import { z } from "zod"

export const PESTANAS_COMPLEMENTARIA = ["convocatorias", "postulaciones", "convenios"] as const
export type PestanaComplementaria = (typeof PESTANAS_COMPLEMENTARIA)[number]

export const matriculaComplementariaSearchSchema = z.object({
  tab: z.enum(PESTANAS_COMPLEMENTARIA).optional().catch(undefined),
  /** Roles territoriales: establecimiento elegido (común a las 3 pestañas). */
  establecimiento: z.coerce.number().optional().catch(undefined),
  /** Ver postulaciones: la pestaña Postulaciones filtrada por la convocatoria. */
  convocatoria: z.coerce.number().optional().catch(undefined),
  /** Postulaciones: búsqueda por número, nombre o documento y grado de la principal. */
  q: z.string().optional().catch(undefined),
  grado: z.string().optional().catch(undefined),
  /** Convenios: año. */
  anio: z.coerce.number().optional().catch(undefined),
  page: z.coerce.number().catch(0).default(0),
  pageSize: z.coerce.number().catch(10).default(10),
  sortBy: z.string().optional().catch(undefined),
  sortDir: z.enum(["asc", "desc"]).optional().catch(undefined),
})

export const seleccionarSearchSchema = z.object({
  cupo: z.coerce.number().optional().catch(undefined),
})
