import { useQuery } from "@tanstack/react-query"

import { evalCol } from "@/lib/eval-col-client"

import { useSedesGeQuery } from "@/features/gestion-estudiantil/commons/api/use-opciones-ge"

/**
 * `GET /gestion-estudiantil/capacidades?ESTABLECIMIENTO=`: qué acciones de página puede hacer el
 * usuario en el establecimiento. Las decide el backend (sustituye las listas de roles del front);
 * cada pantalla las combina con el permiso de su menú.
 */
export interface CapacidadesGe {
  observador_puede_imprimir: boolean
  observador_puede_cargar_firmado: boolean
  observador_puede_reportar_salud_mental: boolean
  observador_puede_remitir: boolean
  observador_puede_anular: boolean
  observador_puede_ver_mis_reportes: boolean
  observaciones_puede_registrar: boolean
  actividades_puede_crear: boolean
  citaciones_puede_citar: boolean
  citaciones_puede_crear_compromiso: boolean
}

export const capacidadesGeKeys = {
  all: ["gestion-estudiantil", "capacidades"] as const,
  establecimiento: (establecimientoId: number | null) => [...capacidadesGeKeys.all, establecimientoId] as const,
}

export async function fetchCapacidadesGe(establecimientoId: number) {
  return evalCol.getRow<CapacidadesGe>(`/gestion-estudiantil/capacidades?ESTABLECIMIENTO=${establecimientoId}`)
}

/**
 * Capacidades del usuario. El establecimiento sale de la cascada de opciones GE (la sede trae su
 * establecimiento). Mientras carga, o si falla, `data` queda `undefined`: las pantallas deshabilitan.
 */
export function useCapacidadesGe(establecimientoElegido?: number | null) {
  const sedes = useSedesGeQuery()
  // Sin establecimiento elegido (la mayoría de pantallas), el primero de las sedes del usuario.
  const establecimientoId = establecimientoElegido ?? sedes.data?.[0]?.establecimientoId ?? null
  return useQuery({
    queryKey: capacidadesGeKeys.establecimiento(establecimientoId),
    queryFn: () => fetchCapacidadesGe(establecimientoId as number),
    enabled: establecimientoId != null,
    staleTime: 1000 * 60 * 5,
  })
}
