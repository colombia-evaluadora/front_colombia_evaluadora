import { z } from "zod"

import { maxLength, minLength } from "@/lib/forms/messages"
import { superadministradorFormSchema } from "@/features/administration/superadministradores/api/schema"

/** Search params del listado: búsqueda (nombre, documento, correo o dependencia), estado, página y orden. */
export const administradoresSearchSchema = z.object({
  q: z.string().optional().catch(undefined),
  estado: z.enum(["activo", "inactivo"]).optional().catch(undefined),
  page: z.coerce.number().int().nonnegative().catch(0).default(0),
  pageSize: z.coerce.number().int().positive().catch(10).default(10),
  sortBy: z.string().optional().catch(undefined),
  sortDir: z.enum(["asc", "desc"]).optional().catch(undefined),
})

export interface AdministradorFormValues {
  /** pk del tipo de documento XL; 0 sin elegir. */
  tipoDocumento: number
  numeroDocumento: string
  primerNombre: string
  segundoNombre: string
  primerApellido: string
  segundoApellido: string
  correo: string
  dependencia: string
  activo: boolean
}

/**
 * Identidad con las mismas reglas que el Superadministrador (`fn_superadmin_validar_*`,
 * que el back reutiliza en V344); se suma Dependencia (Sección 7.3).
 */
export function administradorFormSchema(esNumerico: (pkTipo: number) => boolean) {
  return superadministradorFormSchema(esNumerico).and(
    z.object({
      dependencia: z
        .string()
        .trim()
        .refine((v) => v === "" || v.length >= 3, minLength(3, "La dependencia"))
        .refine((v) => v.length <= 150, maxLength(150, "La dependencia")),
    }),
  )
}
