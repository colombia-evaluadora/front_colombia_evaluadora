import { z } from "zod"

import { invalidSafeText, maxLength, minLength, required } from "@/lib/forms/messages"
import { SAFE_TEXT_PATTERN } from "@/lib/text-input"

/** Search params de la pantalla: búsqueda por nombre, filtros y paginación. */
export const areasOficialesSearchSchema = z.object({
  q: z.string().optional().catch(undefined),
  /** pk de `TNIVEL_ENSENANZA`, como string (viaja en la URL). */
  nivel: z.string().optional().catch(undefined),
  estado: z.enum(["activa", "inactiva"]).optional().catch(undefined),
  page: z.coerce.number().int().nonnegative().catch(0).default(0),
  pageSize: z.coerce.number().int().positive().catch(10).default(10),
  sortBy: z.string().optional().catch(undefined),
  sortDir: z.enum(["asc", "desc"]).optional().catch(undefined),
})

export type AreasOficialesSearch = z.infer<typeof areasOficialesSearchSchema>

// Mismos límites que `fn_areaoficial_validar_nombre` / `_validar_niveles` (V314).
export const areaOficialFormSchema = z.object({
  nombre: z
    .string()
    .trim()
    .min(1, required("El nombre"))
    .min(3, minLength(3, "El nombre"))
    .max(100, maxLength(100, "El nombre"))
    .regex(SAFE_TEXT_PATTERN, invalidSafeText("El nombre")),
  niveles: z.array(z.number()).min(1, "Seleccione al menos un nivel educativo."),
  habilitada: z.boolean(),
})

export type AreaOficialFormValues = z.infer<typeof areaOficialFormSchema>
