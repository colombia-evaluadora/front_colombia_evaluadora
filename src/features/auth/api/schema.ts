import * as z from "zod"

import { loginInputSchema, type LoginInput } from "@/lib/auth"

export const loginFormSchema = loginInputSchema
export type LoginFormValues = LoginInput

export const loginSearchSchema = z.object({
  redirectTo: z.string().optional(),
})
export type LoginSearch = z.infer<typeof loginSearchSchema>
