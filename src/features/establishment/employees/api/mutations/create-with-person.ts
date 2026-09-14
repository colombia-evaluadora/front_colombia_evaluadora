import { env } from "@/config/env"
import { api } from "@/lib/api-client"

import type { Person } from "@/features/establishment/employees/api/types/person"

export interface CreateWithPersonResult {
  status: "ok" | "error"
  message: string
  person: Person
}

/**
 * POST /employees/person — **solo existe en el mock (MSW)**.
 *
 * Misma situación que `create.ts`: en el backend real la persona se crea con
 * `/auth/register/cval/funcionario` (o `/auth/register/usuario` cuando solo hace
 * falta el TUSUARIO), no con esta ruta — `/establishments/employees/person` no
 * está registrada ni en `public.query` ni en `public.endpoint`, así que en modo
 * real el gateway devuelve 404 con un mensaje de Spring en inglés.
 *
 * La guarda evita que un 404 del gateway se confunda con un problema de datos:
 * si el flujo llega acá en modo real, es un bug de enrutamiento del front y el
 * mensaje lo dice.
 */
export function createWithPerson(values: Person): Promise<CreateWithPersonResult> {
  if (!env.ENABLE_API_MOCKING) {
    throw new Error(
      "POST /establishments/employees/person solo existe en el mock. En el backend real la " +
        "persona se crea por /auth/register/cval/funcionario (ver registerFuncionario).",
    )
  }

  return api.post("/establishments/employees/person", values)
}
