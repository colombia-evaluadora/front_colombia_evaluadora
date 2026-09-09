import { useMutation, useQueryClient } from "@tanstack/react-query"

import { api } from "@/lib/api-client"
import { env } from "@/config/env"
import type { MutationConfig } from "@/lib/react-query"

import { actividadesQueryKey } from "@/features/planeador/api/query/use-actividades-query"
import { resolveTipoActividadId } from "@/features/planeador/api/query/use-tipo-actividad-catalog"
import type { Actividad } from "@/features/planeador/api/types/actividad"

/**
 * `POST /planeador/actividades` (confirmado real, colección Postman
 * `planeador-guia-completa`). Obligatorios reales: TITULO, FK_TASIGNATURA,
 * FK_TLV_TIPO_ACTIVIDAD, FK_TLV_JERARQUIA. La UNIDAD es opcional
 * (`FK_TUNIDAD`) — sin ella la actividad nace "huérfana".
 *
 * `FK_TLV_JERARQUIA` queda fijo en 439 ("Actividad"): "Criterio" (440) solo
 * tiene sentido dentro del referente curricular (enunciados/evidencias),
 * que todavía no está cableado en el front — cuando se aborde esa fase, acá
 * se agrega el select de las dos opciones.
 *
 * Fuera de alcance por ahora (necesitan sus propios endpoints — 4.7/4.8/
 * 4.9/4.11 — y el segundo depende del referente): MATERIALES, ADAPTACIONES,
 * RECUPERACION, EVIDENCIAS, CRITERIOS. `ASIGNAR_TODO_EL_GRUPO` queda en
 * `true`: el form no tiene todavía un selector de estudiantes puntuales.
 */
async function createActividad(actividad: Actividad): Promise<unknown> {
  if (env.ENABLE_API_MOCKING) {
    return api.post("/eval-col/planeador/actividades", actividad)
  }
  if (actividad.gradoId == null || actividad.grupoId == null || actividad.asignaturaId == null) {
    throw new Error("Elegí grado, grupo y asignatura antes de guardar.")
  }
  const tipoActividadId = await resolveTipoActividadId(actividad.tipo)
  const body: Record<string, unknown> = {
    TITULO: actividad.nombre,
    FK_TASIGNATURA: actividad.asignaturaId,
    FK_TGRUPO: actividad.grupoId,
    FK_TLV_TIPO_ACTIVIDAD: tipoActividadId,
    // 439 = "Actividad" (TIPO_JERARQUIA_ACTIVIDAD) — ver nota arriba.
    FK_TLV_JERARQUIA: 439,
    ES_EVALUATIVA: actividad.esEvaluativa ? "S" : "N",
    FECHA_INICIO: actividad.fechaInicio,
    FECHA_CIERRE: actividad.fechaCierre,
    ASIGNAR_TODO_EL_GRUPO: true,
  }
  if (actividad.unidad.id !== 0) {
    body.FK_TUNIDAD = actividad.unidad.id
  }
  if (actividad.esEvaluativa && actividad.ponderacion > 0) {
    body.PONDERACION = actividad.ponderacion
  }
  return api.post("/eval-col/planeador/actividades", body)
}

interface UseCreateActividadOptions {
  mutationConfig?: MutationConfig<typeof createActividad>
}

export function useCreateActividad({ mutationConfig }: UseCreateActividadOptions = {}) {
  const queryClient = useQueryClient()
  const { onSuccess, ...restConfig } = mutationConfig ?? {}

  return useMutation({
    mutationFn: createActividad,
    onSuccess: (...args) => {
      // Invalida el listado para que la nueva actividad aparezca al volver
      // al Planeador (mismo criterio que `useCreateReservation`).
      queryClient.invalidateQueries({ queryKey: actividadesQueryKey() })
      onSuccess?.(...args)
    },
    ...restConfig,
  })
}
