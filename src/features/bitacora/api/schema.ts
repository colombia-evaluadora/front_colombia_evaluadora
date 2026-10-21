import { z } from "zod"

import { BITACORA_MODULO_IDS, type BitacoraModulo } from "@/features/bitacora/api/types/bitacora"

/** Search params de la Bitácora. Fechas en `yyyy-MM-dd`; sin ellas, los últimos 30 días. */
export const bitacoraSearchSchema = z.object({
  modulo: z.enum(BITACORA_MODULO_IDS as [BitacoraModulo, ...BitacoraModulo[]]).optional().catch(undefined),
  q: z.string().optional().catch(undefined),
  establecimiento: z.string().optional().catch(undefined),
  sede: z.string().optional().catch(undefined),
  jornada: z.string().optional().catch(undefined),
  entidad: z.string().optional().catch(undefined),
  accion: z.array(z.string()).optional().catch(undefined),
  desde: z.string().optional().catch(undefined),
  hasta: z.string().optional().catch(undefined),
  page: z.coerce.number().int().nonnegative().catch(0).default(0),
  pageSize: z.coerce.number().int().positive().catch(10).default(10),
  sortBy: z.string().optional().catch(undefined),
  sortDir: z.enum(["asc", "desc"]).optional().catch(undefined),
})

export type BitacoraSearch = z.infer<typeof bitacoraSearchSchema>
