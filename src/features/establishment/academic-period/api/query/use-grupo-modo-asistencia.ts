import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { api } from "@/lib/api-client"

import { academicPeriodKeys } from "@/features/establishment/academic-period/api/query-keys"
import { asistenciaKeys } from "@/features/academic-management/asistencia/api/query-keys"
import type {
  ModoAsistencia,
  ModoAsistenciaGrupo,
} from "@/features/academic-management/asistencia/api/types/asistencia-diaria"

type Respuesta = ModoAsistenciaGrupo | ModoAsistenciaGrupo[] | { rows: ModoAsistenciaGrupo[] }

function leer(raw: Respuesta): ModoAsistenciaGrupo {
  const fila = Array.isArray(raw) ? raw[0] : "rows" in raw ? raw.rows[0] : raw
  return { ...fila, modo: fila?.modo ?? "POR_CLASE", bloqueado: Boolean(fila?.bloqueado) }
}

/** Regla 117: `GET /grupos/:ID/modo-asistencia` (sso V748). */
export function useGrupoModoAsistenciaQuery(grupoId: number | undefined, enabled = true) {
  return useQuery({
    queryKey: academicPeriodKeys.gradeGroups.modoAsistencia(grupoId ?? "none"),
    queryFn: async () => leer(await api.get<Respuesta>(`/eval-col/grupos/${grupoId}/modo-asistencia`)),
    enabled: enabled && grupoId != null,
  })
}

async function cambiarModoAsistencia({ grupoId, modo }: { grupoId: number; modo: ModoAsistencia }) {
  return leer(await api.patch<Respuesta>(`/eval-col/grupos/${grupoId}/modo-asistencia`, { MODO: modo }))
}

/** `PATCH /grupos/:ID/modo-asistencia`: 422 si el grupo ya tiene asistencia en el período en curso. */
export function useCambiarModoAsistencia() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: cambiarModoAsistencia,
    onSuccess: (data, { grupoId }) => {
      queryClient.setQueryData(academicPeriodKeys.gradeGroups.modoAsistencia(grupoId), data)
      // Cambia qué ve el calendario de asistencia (por clase o diaria).
      queryClient.invalidateQueries({ queryKey: asistenciaKeys.all })
    },
  })
}
