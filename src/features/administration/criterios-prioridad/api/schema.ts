import { z } from "zod"

import { invalidSafeText, maxLength, minLength, required } from "@/lib/forms/messages"
import { SAFE_TEXT_PATTERN } from "@/lib/text-input"

/** Search params de la pantalla: solo paginación y orden (sin búsqueda ni filtros, Sección 5). */
export const criteriosPrioridadSearchSchema = z.object({
  page: z.coerce.number().int().nonnegative().catch(0).default(0),
  pageSize: z.coerce.number().int().positive().catch(10).default(10),
  sortBy: z.string().optional().catch(undefined),
  sortDir: z.enum(["asc", "desc"]).optional().catch(undefined),
})

export interface CriterioFormValues {
  nombre: string
  descripcion: string
  /** Código del bloque ("2.8", "INSCRIPCION"); "" sin elegir. */
  bloque: string
  /** pkCampo; 0 sin elegir. */
  campo: number
  /** pkRegla; 0 sin elegir. */
  regla: number
  valores: number[]
  habilitado: boolean
}

/**
 * Mismos límites que `fn_criterioprio_validar_*` (V318). Los valores solo se
 * exigen con Es uno de: el schema necesita saber el código de la regla elegida.
 */
export function criterioFormSchema(esUnoDe: (pkRegla: number) => boolean) {
  return z
    .object({
      nombre: z
        .string()
        .trim()
        .min(1, required("El nombre"))
        .min(4, minLength(4, "El nombre"))
        .max(80, maxLength(80, "El nombre"))
        .regex(SAFE_TEXT_PATTERN, invalidSafeText("El nombre")),
      descripcion: z
        .string()
        .trim()
        .max(300, maxLength(300, "La descripción"))
        .regex(SAFE_TEXT_PATTERN, invalidSafeText("La descripción"))
        .refine((v) => v === "" || v.length >= 10, minLength(10, "La descripción")),
      bloque: z.string().min(1, required("El bloque")),
      campo: z.number().min(1, required("El campo")),
      regla: z.number().min(1, required("La regla", { femenino: true })),
      valores: z.array(z.number()),
      habilitado: z.boolean(),
    })
    .superRefine((value, ctx) => {
      if (esUnoDe(value.regla) && value.valores.length === 0) {
        ctx.addIssue({
          code: "custom",
          path: ["valores"],
          message: "Seleccione al menos un valor.",
        })
      }
    })
}
