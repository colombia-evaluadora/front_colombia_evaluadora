import { useQuery } from "@tanstack/react-query"

import { api } from "@/lib/api-client"
import { apiPath } from "@/lib/api-routes"

import type { EstablishmentOption } from "@/features/establishment/campuses/api/types/campus"

interface EstablishmentsOptionsResult {
  rows: EstablishmentOption[]
}

// Nota: esta respuesta ya coincide sin parseo extra entre mock y real. El
// motor de queries del SSO envuelve TODO select en `{ rows: [...] }`
// (ver src/lib/response-envelope.ts) y acá el SELECT registrado
// (`fn_est_listar_todos`) es justo un listado de N filas — la misma forma
// que ya devuelve el mock. Por eso no usa `unwrapRows` explícito.
function fetchEstablishmentsOptions(): Promise<EstablishmentsOptionsResult> {
  return api.get(apiPath("/establishments/options", "/establecimientos/opciones"))
}

/**
 * Lista liviana (id + nombre) de TODOS los establecimientos activos, sin
 * paginar — para el selector de EE del alta de sedes (solo super admin).
 * No reusa `useEstablishmentsQuery` (que pega a `/establishments/query`,
 * la versión paginada pensada para la tabla): con muchos EE, pedir la
 * página 0 de esa no trae el universo completo. Ver `fn_est_listar_todos`
 * en el SSO (V53) — todavía sin aplicar, el endpoint real vive en
 * postgres/pending/step3_new_endpoints.sql.
 */
export function useEstablishmentsOptionsQuery(enabled = true) {
  return useQuery({
    queryKey: ["establishments", "options"],
    queryFn: fetchEstablishmentsOptions,
    select: (result) => result.rows,
    enabled,
  })
}
