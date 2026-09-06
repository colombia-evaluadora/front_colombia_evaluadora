import { useQuery } from "@tanstack/react-query"

import { fetchSelectCategory } from "@/features/establishment/academic-period/api/query/fetch-select-category"

import type { TipoAsistencia } from "@/features/academic-management/asistencia/api/types/asistencia"

export interface TipoAsistenciaOption {
  value: TipoAsistencia
  label: string
}

const VALORES_VALIDOS: TipoAsistencia[] = [1, 2, 3, 5, 6]

async function fetchTipoAsistenciaOptions(): Promise<TipoAsistenciaOption[]> {
  const rows = await fetchSelectCategory("TIPO_ASISTENCIA")
  return rows
    .map((row) => ({ value: Number(row.valor) as TipoAsistencia, label: row.nombre }))
    .filter((opt): opt is TipoAsistenciaOption => VALORES_VALIDOS.includes(opt.value))
    .sort((a, b) => a.value - b.value)
}

export function useTipoAsistenciaCatalogQuery() {
  return useQuery({
    queryKey: ["tipo-asistencia", "catalogo"],
    queryFn: fetchTipoAsistenciaOptions,
    staleTime: Infinity,
  })
}
