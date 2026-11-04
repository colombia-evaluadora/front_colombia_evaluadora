import { z } from "zod"

export const asistenciaSearchSchema = z.object({
  sede: z.coerce.number().optional().catch(undefined),
  // Día visible del calendario (YYYY-MM-DD): al volver se conserva el mes.
  fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().catch(undefined),
  // Pestaña "Asistencia por grupo" y sus filtros (Sección 7).
  vista: z.enum(["calendario", "grupo"]).optional().catch(undefined),
  grupo: z.coerce.number().optional().catch(undefined),
  // Id de la asignatura o "todas".
  asignatura: z.union([z.literal("todas"), z.coerce.number()]).optional().catch(undefined),
  periodo: z.coerce.number().optional().catch(undefined),
})
export type AsistenciaSearch = z.infer<typeof asistenciaSearchSchema>

// Ambas son necesarias para la pantalla, pero una URL inválida no debe tirar:
// si faltan, `AsistenciaManualPage` redirige al calendario.
export const asistenciaManualSearchSchema = z.object({
  fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().catch(undefined),
  sede: z.coerce.number().optional().catch(undefined),
  // "Registrar sesión": la clase que se abre primero.
  grupo: z.coerce.number().optional().catch(undefined),
  asignatura: z.coerce.number().optional().catch(undefined),
  // Sección 7: Volver regresa a la pestaña desde la que se abrió la planilla.
  desde: z.enum(["calendario", "grupo"]).optional().catch(undefined),
  periodo: z.coerce.number().optional().catch(undefined),
})
export type AsistenciaManualSearch = z.infer<typeof asistenciaManualSearchSchema>


