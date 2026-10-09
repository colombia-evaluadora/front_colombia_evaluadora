import { z } from "zod"

// `desde` es solo informativo (la ruta que el guard bloqueó): una URL
// inválida nunca debe tirar, así que cualquier cosa rara queda en `undefined`.
export const sinAccesoSearchSchema = z.object({
  desde: z.string().optional().catch(undefined),
})
