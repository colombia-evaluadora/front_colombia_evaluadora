import * as z from "zod"

import { loginInputSchema } from "@/lib/auth"

// El schema de la API solo exige que la contraseña venga; el del formulario
// además avisa del largo mínimo antes de gastar un intento contra el
// servidor. La política completa vive en `passwordRules`, que solo aplica
// donde se *crea* una contraseña.
export const loginFormSchema = loginInputSchema.extend({
  // `z.string({ message: ... })` deja a Zod pintar el "Requerido" cuando el
  // string es `undefined`; después `.min(8)` corre solo si hay valor. Encadenar
  // dos `.min` dejaba al segundo mensaje tapando al primero en el caso vacío.
  password: z
    .string({ message: "Requerido" })
    .min(8, "Debe tener al menos 8 caracteres."),
  // Sin marcar: la sesión dura lo que indique el backend (unos minutos).
  // Marcada: el backend devuelve un token de larga duración — la sesión
  // sobrevive a cerrar y reabrir el navegador.
  rememberMe: z.boolean(),
  // "Este es un equipo compartido": marcado por defecto mientras la política
  // de datos de menores (P6) siga pendiente. No viaja al backend: decide si
  // este navegador persiste algo (`lib/offline/query-persister.ts`).
  sharedDevice: z.boolean(),
})
export type LoginFormValues = z.infer<typeof loginFormSchema>

export const loginSearchSchema = z.object({
  redirectTo: z.string().optional().catch(undefined),
})
export type LoginSearch = z.infer<typeof loginSearchSchema>

export const forgotPasswordFormSchema = z.object({
  // Limpia caracteres invisibles (word joiner, zero-width, BOM, NBSP) antes
  // de validar: `.trim()` no los quita y llegan al pegar el correo.
  // Correo o número de documento, con la misma regla que el login.
  email: loginInputSchema.shape.email,
})
export type ForgotPasswordFormValues = z.infer<typeof forgotPasswordFormSchema>

// El usuario es el correo, así que pedirlo por correo sería circular: la
// identidad se prueba con el documento.
export const forgotUsernameFormSchema = z.object({
  document: z
    .string()
    .trim()
    .min(1, "Requerido")
    .regex(/^\d+$/, "Debe contener solo números, sin puntos ni espacios.")
    .min(6, "Debe tener al menos 6 dígitos.")
    .max(15, "Debe tener máximo 15 dígitos."),
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

/**
 * Política de Colombia Evaluadora ("[admin] Acceso y sesiones"), espejo de
 * sso `PasswordPolicy.checkPersonal`: 10 a 64 caracteres, al menos una letra
 * y un número. Lo que el front no puede saber (que no contenga el documento ni
 * los nombres, y que sea distinta de las últimas 3) lo valida el servidor y
 * llega en el mensaje de error; `PASSWORD_SERVER_RULES` lo anuncia.
 */
export const PASSWORD_MIN_LENGTH = 10
export const PASSWORD_MAX_LENGTH = 64

export const passwordRules: readonly PasswordRule[] = [
  {
    label: `Entre ${PASSWORD_MIN_LENGTH} y ${PASSWORD_MAX_LENGTH} caracteres`,
    message: `Debe tener entre ${PASSWORD_MIN_LENGTH} y ${PASSWORD_MAX_LENGTH} caracteres.`,
    test: (v) => v.length >= PASSWORD_MIN_LENGTH && v.length <= PASSWORD_MAX_LENGTH,
  },
  {
    label: "Al menos una letra",
    message: "Debe incluir al menos una letra.",
    test: (v) => /\p{L}/u.test(v),
  },
  {
    label: "Al menos un número",
    message: "Debe incluir al menos un número.",
    test: (v) => /\d/.test(v),
  },
] as const

export const PASSWORD_SERVER_RULES =
  "Sin su número de documento ni sus nombres, y distinta de las últimas 3 que usó."

// La pantalla de confirmación se identifica solo con el token: de él salen
// el email destino, cuándo se envió y cuánto le queda. Nada de eso viaja en
// la URL, así la página es recargable/compartible sin exponer el correo.
export const checkEmailSearchSchema = z.object({
  token: z.string().optional().catch(undefined),
})
export type CheckEmailSearch = z.infer<typeof checkEmailSearchSchema>

export const restorePasswordFormSchema = z
  .object({
    password: z
      .string()
      .min(1, "Requerido")
      .superRefine((value, ctx) => {
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

export type RestorePasswordFormValues = z.infer<typeof restorePasswordFormSchema>

export const restorePasswordSearchSchema = z.object({
  token: z.string().optional().catch(undefined),
})
export type RestorePasswordSearch = z.infer<typeof restorePasswordSearchSchema>

// Activación de cuenta: mismas reglas de contraseña que restaurar, así que
// reutiliza restorePasswordFormSchema tal cual (el form también es el
// mismo componente) — solo cambia a qué endpoint se postea el valor.
export const activateSearchSchema = z.object({
  token: z.string().optional().catch(undefined),
})
export type ActivateSearch = z.infer<typeof activateSearchSchema>
