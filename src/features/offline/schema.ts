import * as z from "zod"

/** `?estado=` de `/app/pendientes`; una URL inválida nunca tira. */
export const pendientesSearchSchema = z.object({
  estado: z.enum(["pendientes", "error", "conflictos", "sincronizados"]).optional().catch(undefined),
})

export type PendientesSearch = z.infer<typeof pendientesSearchSchema>
