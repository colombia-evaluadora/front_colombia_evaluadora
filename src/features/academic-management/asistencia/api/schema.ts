import { z } from "zod"

export const asistenciaSearchSchema = z.object({
  sede: z.coerce.number().optional(),
})
export type AsistenciaSearch = z.infer<typeof asistenciaSearchSchema>

export const asistenciaManualSearchSchema = z.object({
  fecha: z.string(),
  sede: z.coerce.number(),
})
export type AsistenciaManualSearch = z.infer<typeof asistenciaManualSearchSchema>


export const asistenciaSeguimientoSearchSchema = z.object({
  fecha: z.string().optional(),
  sede: z.coerce.number().optional(),
})
export type AsistenciaSeguimientoSearch = z.infer<typeof asistenciaSeguimientoSearchSchema>
