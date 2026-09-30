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


// Filtros iniciales opcionales: llegan desde el calendario (vista no docente).
export const asistenciaSeguimientoSearchSchema = z.object({
  sede: z.coerce.number().optional(),
  fecha: z.string().optional().catch(undefined),
  jornada: z.string().optional().catch(undefined),
  grado: z.string().optional().catch(undefined),
  grupo: z.coerce.number().optional().catch(undefined),
  asignatura: z.coerce.number().optional().catch(undefined),
})
export type AsistenciaSeguimientoSearch = z.infer<typeof asistenciaSeguimientoSearchSchema>
