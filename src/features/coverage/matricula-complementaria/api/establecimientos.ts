import { useQuery } from "@tanstack/react-query"

import { evalCol } from "@/lib/eval-col-client"

import type { EstablecimientoComplementaria } from "@/features/coverage/matricula-complementaria/api/types"

// Establecimientos que el usuario puede ver en la vista: más de uno = rol
// territorial (solo lectura), que elige cuál consultar.

export const establecimientosComplementariaKey = ["matricula-complementaria", "establecimientos"] as const

export async function fetchEstablecimientosComplementaria() {
  return evalCol.getRows<EstablecimientoComplementaria>("/cobertura-academica/matricula-complementaria/establecimientos")
}

export function useEstablecimientosComplementariaQuery() {
  return useQuery({
    queryKey: establecimientosComplementariaKey,
    queryFn: fetchEstablecimientosComplementaria,
    staleTime: Infinity,
  })
}
