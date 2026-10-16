import { useQuery } from "@tanstack/react-query"

import { evalCol } from "@/lib/eval-col-client"

import { parametrosEdadKeys } from "@/features/administration/parametros-edad/api/query-keys"
import type { ParametrosEdad } from "@/features/administration/parametros-edad/api/types"
import type { Resultado } from "@/features/administration/listas-valor/api/types/lista-valor"

/** Forma de `fn_parametroedad_listar`: el pk es el de TLISTA_VALOR. */
interface ParametrosEdadRow {
  grados: { pkGrado: number; grado: string; edad: number }[]
  calendarios: { pkCalendario: number; calendario: string; mes: number; dia: number }[]
}

async function fetchParametros(): Promise<ParametrosEdad> {
  const [row] = await evalCol.getRows<Resultado<ParametrosEdadRow>>("/parametros-edad")
  const r = row?.resultado
  return {
    grados: (r?.grados ?? []).map((g) => ({
      grado: String(g.pkGrado),
      nombre: g.grado,
      edad: g.edad,
    })),
    calendarios: (r?.calendarios ?? []).map((c) => ({
      calendario: String(c.pkCalendario),
      nombre: c.calendario,
      mes: c.mes,
      dia: c.dia,
    })),
  }
}

export function useParametrosEdadQuery() {
  return useQuery({ queryKey: parametrosEdadKeys.all, queryFn: fetchParametros })
}
