import * as z from "zod"

import { loginInputSchema, type LoginInput } from "@/lib/auth"

export const loginFormSchema = loginInputSchema
export type LoginFormValues = LoginInput

export const loginSearchSchema = z.object({
  redirectTo: z.string().optional(),
})
export type LoginSearch = z.infer<typeof loginSearchSchema>

export const forgotPasswordFormSchema = z.object({
  email: z.email("Email inválido"),
})
export type ForgotPasswordFormValues = z.infer<typeof forgotPasswordFormSchema>

export const forgotUsernameFormSchema = z.object({
  email: z.email("Email inválido"),
})
export type ForgotUsernameFormValues = z.infer<typeof forgotUsernameFormSchema>

/**
 * Política de contraseñas: misma que la API mockeada en
 * `mocks/handlers/auth.ts::consumePasswordResetToken`.
 *
 * Fuente única: cada regla es un objeto con un `test` (booleano, recibe
 * el valor crudo) y un `message` (lo que muestra el `<FieldError>`).
 *
 * El schema Zod se arma iterando este array y agregando una issue por
 * regla fallida; el `<RestorePasswordForm>` reutiliza el mismo array
 * para dibujar el checklist de feedback antes del submit. Cambiar una
 * regla acá cambia validación y UI al mismo tiempo.
 */
export interface PasswordRule {
  /** Etiqueta visible en el checklist del form. */
  label: string
  /** Mensaje que muestra `<FieldError>` si el `test` devuelve false. */
  message: string
  /** Test puro sobre el valor del campo. */
  test: (value: string) => boolean
}

export const passwordRules: readonly PasswordRule[] = [
  {
    label: "Al menos 8 caracteres",
    message: "Debe tener al menos 8 caracteres.",
    test: (v) => v.length >= 8,
  },
  {
    label: "Una minúscula (a–z)",
    message: "Debe incluir al menos una minúscula.",
    test: (v) => /[a-z]/.test(v),
  },
  {
    label: "Una mayúscula (A–Z)",
    message: "Debe incluir al menos una mayúscula.",
    test: (v) => /[A-Z]/.test(v),
  },
  {
    label: "Un número (0–9)",
    message: "Debe incluir al menos un número.",
    test: (v) => /\d/.test(v),
  },
  {
    label: "Un caracter especial (símbolo)",
    message: "Debe incluir al menos un caracter especial.",
    test: (v) => /[^A-Za-z0-9]/.test(v),
  },
] as const

// La pantalla de confirmación se identifica solo con el token: de él salen
// el email destino, cuándo se envió y cuánto le queda. Nada de eso viaja en
// la URL, así la página es recargable/compartible sin exponer el correo.
export const checkEmailSearchSchema = z.object({
  token: z.string().optional(),
})
export type CheckEmailSearch = z.infer<typeof checkEmailSearchSchema>

export const restorePasswordFormSchema = z
  .object({
    password: z.string().min(1, "Requerido").superRefine((value, ctx) => {
      for (const rule of passwordRules) {
        if (!rule.test(value)) {
          ctx.addIssue({
            code: "custom",
            message: rule.message,
          })
        }
      }
    }),
    confirmPassword: z.string().min(1, "Requerido"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Las contraseñas no coinciden.",
    path: ["confirmPassword"],
  })

export type RestorePasswordFormValues = z.infer<
  typeof restorePasswordFormSchema
>

export const restorePasswordSearchSchema = z.object({
  token: z.string().optional(),
})
export type RestorePasswordSearch = z.infer<typeof restorePasswordSearchSchema>

