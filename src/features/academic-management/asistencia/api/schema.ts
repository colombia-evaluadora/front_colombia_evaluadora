import { z } from "zod"

export const asistenciaSearchSchema = z.object({
  sede: z.coerce.number().optional().catch(undefined),
  // Día visible del calendario (YYYY-MM-DD): al volver se conserva el mes.
  fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().catch(undefined),
})
export type AsistenciaSearch = z.infer<typeof asistenciaSearchSchema>

// Ambas son necesarias para la pantalla, pero una URL inválida no debe tirar:
// si faltan, `AsistenciaManualPage` redirige al calendario.
export const asistenciaManualSearchSchema = z.object({
  fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().catch(undefined),
  sede: z.coerce.number().optional().catch(undefined),
})
export type AsistenciaManualSearch = z.infer<typeof asistenciaManualSearchSchema>


// Filtros iniciales opcionales: llegan desde el calendario (vista no docente).
export const asistenciaSeguimientoSearchSchema = z.object({
  sede: z.coerce.number().optional().catch(undefined),
  fecha: z.string().optional().catch(undefined),
  jornada: z.string().optional().catch(undefined),
  grado: z.string().optional().catch(undefined),
  grupo: z.coerce.number().optional().catch(undefined),
  asignatura: z.coerce.number().optional().catch(undefined),
})
export type AsistenciaSeguimientoSearch = z.infer<typeof asistenciaSeguimientoSearchSchema>
