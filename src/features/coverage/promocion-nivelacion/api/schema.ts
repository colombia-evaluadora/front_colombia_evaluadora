import { z } from "zod"

export const PESTANAS_PROMOCION = ["reprobados", "pendientes"] as const
export type PestanaPromocion = (typeof PESTANAS_PROMOCION)[number]

const texto = z.string().optional().catch(undefined)

export const promocionNivelacionSearchSchema = z.object({
  tab: z.enum(PESTANAS_PROMOCION).optional().catch(undefined),
  q: texto,
  anio: z.coerce.number().optional().catch(undefined),
  /** Reprobados. */
  periodo: texto,
  sede: texto,
  jornada: texto,
  grado: texto,
  grupo: texto,
  /** Áreas pendientes. */
  seguimiento: z.enum(["CON_PENDIENTES", "VENCIDO", "NIVELADO"]).optional().catch(undefined),
  page: z.coerce.number().catch(0).default(0),
  pageSize: z.coerce.number().catch(10).default(10),
})

export type PromocionSearch = z.infer<typeof promocionNivelacionSearchSchema>
