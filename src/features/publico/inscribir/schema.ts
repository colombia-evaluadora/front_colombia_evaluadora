import { z } from "zod"

/**
 * `?vista=formulario` muestra el asistente de vista previa; sin él, el estado real:
 * sin inscripciones abiertas. Vive fuera de `datos-demo.ts` para que el router no
 * arrastre los datos de ejemplo al bundle principal.
 */
export const inscribirSearchSchema = z.object({
  vista: z.enum(["formulario"]).optional().catch(undefined),
})
