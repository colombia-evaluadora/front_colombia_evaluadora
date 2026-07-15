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

export const restorePasswordFormSchema = z
  .object({
    password: z.string().min(6, "Debe tener al menos 6 caracteres."),
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
