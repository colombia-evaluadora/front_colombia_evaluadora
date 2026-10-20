import { z } from "zod"

import { invalidEmail, maxLength, minLength, required } from "@/lib/forms/messages"

/**
 * Search params de la pantalla: búsqueda (nombre, documento o correo), estado,
 * paginación y orden. La Sección 7 no pide buscador, pero la lista crece con
 * cada Superadministrador y es la forma rápida de ubicar a uno.
 */
export const superadministradoresSearchSchema = z.object({
  q: z.string().optional().catch(undefined),
  estado: z.enum(["activo", "inactivo"]).optional().catch(undefined),
  page: z.coerce.number().int().nonnegative().catch(0).default(0),
  pageSize: z.coerce.number().int().positive().catch(10).default(10),
  sortBy: z.string().optional().catch(undefined),
  sortDir: z.enum(["asc", "desc"]).optional().catch(undefined),
})

export interface SuperadministradorFormValues {
  /** pk del tipo de documento XL; 0 sin elegir. */
  tipoDocumento: number
  numeroDocumento: string
  primerNombre: string
  segundoNombre: string
  primerApellido: string
  segundoApellido: string
  correo: string
  activo: boolean
}

const LETRAS = /^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ ]+$/

// 3 a 40 y no 50 como dice la Sección 7: es el largo de las columnas de
// TUSUARIO (una vista las fija); el back valida lo mismo (V322).
const nombre = (sujeto: string, obligatorio: boolean) =>
  z
    .string()
    .trim()
    .refine((v) => !obligatorio || v !== "", required(sujeto))
    .refine((v) => v === "" || v.length >= 3, minLength(3, sujeto))
    .refine((v) => v.length <= 40, maxLength(40, sujeto))
    .refine((v) => v === "" || LETRAS.test(v), `${sujeto} solo admite letras y espacios.`)

/** Mismas reglas que `fn_superadmin_validar_*` (V322). `esNumerico(pkTipo)`: solo dígitos (CC). */
export function superadministradorFormSchema(esNumerico: (pkTipo: number) => boolean) {
  return z
    .object({
      tipoDocumento: z.number().min(1, required("El tipo de documento")),
      numeroDocumento: z
        .string()
        .trim()
        .min(1, required("El número de documento"))
        .min(5, minLength(5, "El número de documento"))
        .max(20, maxLength(20, "El número de documento")),
      primerNombre: nombre("El primer nombre", true),
      segundoNombre: nombre("El segundo nombre", false),
      primerApellido: nombre("El primer apellido", true),
      segundoApellido: nombre("El segundo apellido", false),
      correo: z
        .string()
        .trim()
        .min(1, required("El correo electrónico"))
        // 8 a 120: 120 es TUSUARIO.CORREO_ELECTRONICO (no los 254 de la Sección 7); V327 valida lo mismo.
        .min(8, minLength(8, "El correo electrónico"))
        .max(120, maxLength(120, "El correo electrónico"))
        .email(invalidEmail()),
      activo: z.boolean(),
    })
    .superRefine((value, ctx) => {
      const numero = value.numeroDocumento.trim()
      if (!numero) return
      const ok = esNumerico(value.tipoDocumento)
        ? /^[0-9]+$/.test(numero)
        : /^[A-Za-z0-9]+$/.test(numero)
      if (!ok) {
        ctx.addIssue({
          code: "custom",
          path: ["numeroDocumento"],
          message: esNumerico(value.tipoDocumento)
            ? "Este documento solo admite dígitos, sin puntos ni espacios."
            : "Solo letras y dígitos, sin puntos ni espacios.",
        })
      }
    })
}
