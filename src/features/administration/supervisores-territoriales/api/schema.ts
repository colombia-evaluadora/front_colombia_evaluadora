import { z } from "zod"

import { maxLength, minLength } from "@/lib/forms/messages"
import { superadministradorFormSchema } from "@/features/administration/superadministradores/api/schema"

/** Search params del listado: búsqueda (nombre, documento, correo o dependencia), estado, página y orden. */
export const supervisoresSearchSchema = z.object({
  q: z.string().optional().catch(undefined),
  estado: z.enum(["activo", "inactivo"]).optional().catch(undefined),
  page: z.coerce.number().int().nonnegative().catch(0).default(0),
  pageSize: z.coerce.number().int().positive().catch(10).default(10),
  sortBy: z.string().optional().catch(undefined),
  sortDir: z.enum(["asc", "desc"]).optional().catch(undefined),
})

export interface SupervisorFormValues {
  /** pk del tipo de documento XL; 0 sin elegir. */
  tipoDocumento: number
  numeroDocumento: string
  primerNombre: string
  segundoNombre: string
  primerApellido: string
  segundoApellido: string
  correo: string
  dependencia: string
  todosEstablecimientos: boolean
  establecimientos: number[]
  activo: boolean
}

/**
 * Identidad con las mismas reglas que el Superadministrador (`fn_superadmin_validar_*`,
 * que el back reutiliza en V328.2); se suman Dependencia y el alcance de la Sección 7.2.
 */
export function supervisorFormSchema(esNumerico: (pkTipo: number) => boolean) {
  return superadministradorFormSchema(esNumerico)
    .and(
      z.object({
        dependencia: z
          .string()
          .trim()
          .refine((v) => v === "" || v.length >= 3, minLength(3, "La dependencia"))
          .refine((v) => v.length <= 150, maxLength(150, "La dependencia")),
        todosEstablecimientos: z.boolean(),
        establecimientos: z.array(z.number()),
      }),
    )
    .superRefine((value, ctx) => {
      if (!value.todosEstablecimientos && value.establecimientos.length === 0) {
        ctx.addIssue({
          code: "custom",
          path: ["establecimientos"],
          message: "Seleccione al menos un establecimiento, o active Todos los establecimientos.",
        })
      }
    })
}
