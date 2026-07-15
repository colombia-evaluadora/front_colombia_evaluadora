import * as z from "zod"

const createEnv = () => {
  const EnvSchema = z.object({
    API_URL: z.string().optional().default(""),
    ENABLE_API_MOCKING: z
      .string()
      .refine((s) => s === "true" || s === "false")
      .transform((s) => s === "true")
      .optional()
      .default(true),
    APP_URL: z.string().optional().default("http://localhost:5173"),
  })

  const envVars = Object.entries(import.meta.env).reduce<Record<string, string>>(
    (acc, [key, value]) => {
      if (key.startsWith("VITE_APP_")) {
        acc[key.replace("VITE_APP_", "")] = value as string
      }
      return acc
    },
    {}
  )

  const parsedEnv = EnvSchema.safeParse(envVars)

  if (!parsedEnv.success) {
    throw new Error(
      `Invalid env provided.
The following variables are missing or invalid:
${Object.entries(parsedEnv.error.flatten().fieldErrors)
  .map(([k, v]) => `- ${k}: ${v}`)
  .join("\n")}
`
    )
  }

  return parsedEnv.data
}

export const env = createEnv()
