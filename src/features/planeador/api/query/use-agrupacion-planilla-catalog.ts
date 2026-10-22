import { useQuery } from "@tanstack/react-query"

import { selectCategoryQueryOptions, type SelectCategoryRow } from "@/features/establishment/academic-period/api/query/fetch-select-category"

export type AgrupacionPlanillaKey = "actividad" | "unidad"

export interface AgrupacionPlanillaOption {
  key: AgrupacionPlanillaKey
  label: string
}

// Por `valor` ("ACTIVIDAD"/"UNIDAD"): los pks y los labels no son estables.
function toKey(row: SelectCategoryRow): AgrupacionPlanillaKey | null {
  const valor = row.valor.trim().toUpperCase()
  if (valor === "ACTIVIDAD") return "actividad"
  if (valor === "UNIDAD") return "unidad"
  return null
}

// "Ver por" de la Planilla. No confundir con `ELEMENTO_CALCULO_DEF`.
function toAgrupacionPlanillaOptions(rows: SelectCategoryRow[]): AgrupacionPlanillaOption[] {
  const options: AgrupacionPlanillaOption[] = []
  for (const row of rows) {
    const key = toKey(row)
    if (key && !options.some((o) => o.key === key)) {
      options.push({ key, label: row.nombre })
    }
  }
  return options
}

export function useAgrupacionPlanillaOptionsQuery() {
  return useQuery({ ...selectCategoryQueryOptions("AGRUPACION_PLANILLA"), select: toAgrupacionPlanillaOptions })
}
