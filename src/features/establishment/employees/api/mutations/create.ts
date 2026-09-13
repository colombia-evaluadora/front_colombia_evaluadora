import { env } from "@/config/env"
import { api } from "@/lib/api-client"

import type { Employee } from "@/features/establishment/employees/api/types/employee"

export interface CreateResult {
  status: "ok" | "error"
  message: string
  employee: Employee
}

/**
 * POST /employees — **solo existe en el mock (MSW)**.
 *
 * En el backend real no hay un endpoint equivalente: el alta de funcionario
 * la resuelve `/auth/register/cval/funcionario` (auth-center), que crea
 * TUSUARIO + TFUNCIONARIO de una vez — ver `registerFuncionario` y la rama
 * `!env.ENABLE_API_MOCKING` de `dialog-manage.tsx`. `/establishments/employees`
 * no está registrado ni en `public.query` ni en `public.endpoint`, así que en
 * modo real el gateway responde 404 con un mensaje de Spring en inglés.
 *
 * Esa era justo la mitad visible de un bug real: cuando el GET por PK del
 * autocompletado fallaba, `createdEmployeeId` quedaba en `null` y el diálogo
 * caía acá en vez de ir por `/register/cval/funcionario`, mostrando un 404 en
 * inglés junto al error de permisos. La causa de fondo ya se corrigió en el
 * backend (gate de `fn_usu_empleado_buscar_por_pk`, REV5); esta guarda existe
 * para que, si algún otro camino vuelve a llegar hasta acá en modo real, el
 * fallo diga qué pasó en vez de disfrazarse de 404 del gateway.
 */
export function create(values: Employee): Promise<CreateResult> {
  if (!env.ENABLE_API_MOCKING) {
    throw new Error(
      "POST /establishments/employees solo existe en el mock. En el backend real el alta " +
        "de funcionario va por /auth/register/cval/funcionario (ver registerFuncionario).",
    )
  }

  return api.post("/establishments/employees", values)
}
