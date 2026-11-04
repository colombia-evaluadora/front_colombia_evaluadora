import { useQuery } from "@tanstack/react-query"

import { evalCol } from "@/lib/eval-col-client"

import { listaValorKeys } from "@/features/administration/listas-valor/api/query-keys"
import type { Icono } from "@/features/administration/listas-valor/api/types/icono"
import type { Resultado } from "@/features/administration/listas-valor/api/types/lista-valor"

async function fetchIconos() {
  const [row] = await evalCol.getRows<Resultado<Icono[]>>("/listas-valor/iconos")
  return row?.resultado ?? []
}

export function useIconosQuery() {
  return useQuery({ queryKey: listaValorKeys.iconos, queryFn: fetchIconos })
}
