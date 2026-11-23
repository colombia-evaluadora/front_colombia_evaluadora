import { z } from "zod"

/**
 * `?vista=formulario` era el acceso a la vista previa; hoy el asistente se abre solo cuando
 * algún establecimiento tiene la inscripción en línea habilitada (contexto del backend) y
 * el parámetro se conserva para no romper enlaces viejos.
 */
export const inscribirSearchSchema = z.object({
  vista: z.enum(["formulario"]).optional().catch(undefined),
})
