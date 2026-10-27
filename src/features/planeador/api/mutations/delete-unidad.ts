import { useMutation, useQueryClient } from "@tanstack/react-query"

import { api } from "@/lib/api-client"
import { env } from "@/config/env"
import type { MutationConfig } from "@/lib/react-query"
import type { ExportResult } from "@/features/planeador/api/types/actividad"
import { invalidarUnidad } from "@/features/planeador/api/query/invalidar-listados-actividades"

// `PATCH`, no `DELETE` — el motor real no admite ese verbo (soft-delete).
// El mock devuelve `{status, message}` directo; el real envuelve el id
// afectado en `{rows: [{fn_unidad_eliminar: <id>}]}` y no trae mensaje — se
// arma acá. El 409 real ("tiene actividades activas vinculadas") llega
// como error HTTP, no como `status: "error"` en un 200: ese caso lo atrapa
// `onError`, con un mensaje genérico en vez del texto específico del
// backend (pendiente si hace falta mostrarlo tal cual).
//
// Reglas 38/39 (sso V492.2): `eliminarActividades` = eliminar la unidad junto
// con sus actividades sin notas (las que no se pueden borrar quedan sin
// asignar); sin él las actividades solo se desvinculan. Con alguna actividad
// con resultados el backend rechaza ambas opciones (409).
export interface DeleteUnidadVariables {
  id: number
  eliminarActividades?: boolean
}

async function deleteUnidad({ id, eliminarActividades = false }: DeleteUnidadVariables): Promise<ExportResult> {
  const body = { ELIMINAR_ACTIVIDADES: eliminarActividades }
  if (env.ENABLE_API_MOCKING) {
    return api.patch(`/eval-col/planeador/unidades/${id}`, body)
  }
  await api.patch(`/eval-col/planeador/unidades/${id}`, body)
  return { status: "ok", message: "Unidad temática eliminada correctamente." }
}

interface UseDeleteUnidadOptions {
  mutationConfig?: MutationConfig<typeof deleteUnidad>
}

export function useDeleteUnidad({ mutationConfig }: UseDeleteUnidadOptions = {}) {
  const queryClient = useQueryClient()
  const { onSuccess, ...restConfig } = mutationConfig ?? {}

  return useMutation({
    mutationFn: deleteUnidad,
    onSuccess: (...args) => {
      // Invalida el listado para que la unidad desaparezca del rail al
      // volver a la pestaña (mismo criterio que `useDeleteActividad`).
      invalidarUnidad(queryClient)
      onSuccess?.(...args)
    },
    ...restConfig,
  })
}
