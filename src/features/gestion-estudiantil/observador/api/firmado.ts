import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { evalCol } from "@/lib/eval-col-client"
import { postMultipart } from "@/lib/files"
import type { MutationConfig } from "@/lib/react-query"

import { queryString } from "@/features/gestion-estudiantil/commons/api/jsonb"
import { observadorKeys } from "@/features/gestion-estudiantil/observador/api/query-keys"

const BASE = "/gestion-estudiantil/observador"

/** Fila de `GET /observador/firmados?FK_MATRICULA=` (histórico de firmados del estudiante). */
export interface ObservadorFirmadoRow {
  id: number
  fk_tmatricula: number
  fk_tperiodo_evaluacion: number | null
  periodo_nombre: string | null
  fecha_firma: string
  fk_tarchivo: number
  archivo_nombre: string
  cargado_por: string
  cargado_en: string
}

export interface CargarFirmadoInput {
  FK_MATRICULA: number
  FK_PERIODO_EVALUACION: number | null
  FECHA_FIRMA: string
  archivo: File
}

/**
 * Paso 1 (file-service, campo `SOPORTE`): reserva el TARCHIVO y devuelve su pk; paso 2: `POST /observador/firmado`
 * con ese pk en `FK_ARCHIVO`.
 */
async function cargarFirmado({ archivo, ...datos }: CargarFirmadoInput) {
  const raw = await postMultipart<{ rows?: Record<string, unknown>[] } | Record<string, unknown>>(
    `/eval-col${BASE}/firmado/soporte`,
    {},
    { SOPORTE: archivo },
  )
  const fila = (raw && "rows" in raw && Array.isArray(raw.rows) ? raw.rows[0] : raw) as Record<string, unknown>
  const pk = fila?.pk_tarchivo ?? Object.values(fila ?? {}).find((v) => typeof v === "number")
  if (typeof pk !== "number") throw new Error("No se pudo cargar el observador firmado.")
  return evalCol.postRow<{ id: number }>(`${BASE}/firmado`, { ...datos, FK_ARCHIVO: pk })
}

export function useCargarFirmado({ mutationConfig }: { mutationConfig?: MutationConfig<typeof cargarFirmado> } = {}) {
  const queryClient = useQueryClient()
  const { onSuccess, ...rest } = mutationConfig ?? {}
  return useMutation({
    mutationFn: cargarFirmado,
    ...rest,
    onSuccess: (...args) => {
      queryClient.invalidateQueries({ queryKey: [...observadorKeys.all, "firmados"] })
      onSuccess?.(...args)
    },
  })
}

export function useObservadorFirmadosQuery(matricula: number | undefined) {
  return useQuery({
    queryKey: [...observadorKeys.all, "firmados", matricula ?? "none"],
    queryFn: () => evalCol.getRows<ObservadorFirmadoRow>(`${BASE}/firmados${queryString({ FK_MATRICULA: matricula })}`),
    enabled: matricula != null,
    retry: false,
  })
}
