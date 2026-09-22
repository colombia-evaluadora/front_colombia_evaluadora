import { z } from "zod"

/**
 * El estado de la pantalla de Informes vive en la URL, no en `useState`: la
 * ruta se desmonta al ir a la planilla y al volver se perdían la cascada, las
 * pestañas abiertas y los períodos marcados. En la URL además sobrevive al
 * refresh y al botón atrás, y la pantalla se puede compartir tal como está.
 */
export const informesSearchSchema = z.object({
  sede: z.coerce.number().optional(),
  anio: z.coerce.number().optional(),
  jornada: z.coerce.number().optional(),
  /** Incluye `PERIODO_FINAL_ID` cuando está marcado el checkbox "Final":
   *  no es un período del calendario, pero se elige y viaja con los demás. */
  periodos: z.array(z.coerce.number()).optional(),
  /** Las pestañas de grado/grupo abiertas, en orden. */
  grupos: z.array(z.coerce.number()).optional(),
  tab: z.coerce.number().optional(),
})

export type InformesSearch = z.infer<typeof informesSearchSchema>

/** La planilla recibe el mismo estado para devolverlo al volver. */
export const planillaInformeSearchSchema = informesSearchSchema
