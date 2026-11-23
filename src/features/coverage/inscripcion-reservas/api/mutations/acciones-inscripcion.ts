import { useMutation, useQueryClient } from "@tanstack/react-query"

import { evalCol } from "@/lib/eval-col-client"

import {
  INSCRIPCIONES_BASE,
  datos,
  inscripcionesKeys,
} from "@/features/coverage/inscripcion-reservas/api/query/use-inscripciones-query"
import { reservasCupoKeys } from "@/features/coverage/inscripcion-reservas/api/query/use-reservas-cupo-query"

export interface ResultadoAdmision {
  admitidas: number
  enListaEspera: number
  /** Opciones saltadas porque el aspirante ya quedó admitido en el establecimiento. */
  omitidas: number
}

// Admitir crea reservas y anular las libera: se invalidan también las de Reservas de cupo.
function useInvalidar() {
  const queryClient = useQueryClient()
  return () => {
    queryClient.invalidateQueries({ queryKey: inscripcionesKeys.all })
    queryClient.invalidateQueries({ queryKey: reservasCupoKeys.all })
  }
}

/** Admite en orden de admisión hasta agotar cupos; el resto queda En lista de espera (Regla 28). */
export function useAdmitirOpciones() {
  const invalidar = useInvalidar()
  return useMutation({
    mutationFn: async (ids: string[]) =>
      datos(
        await evalCol.postRow<{ datos: ResultadoAdmision }>(`${INSCRIPCIONES_BASE}/admitir`, {
          IDS: ids.map(Number),
        }),
      ),
    onSuccess: invalidar,
  })
}

export function useNoAdmitirOpciones() {
  const invalidar = useInvalidar()
  return useMutation({
    // Un solo motivo para todo el lote (Sección 3.3, No admitir); `motivo` es el pk de la Lista de Valores.
    mutationFn: async ({ ids, motivo }: { ids: string[]; motivo: string }) => {
      await evalCol.postRow(`${INSCRIPCIONES_BASE}/no-admitir`, {
        IDS: ids.map(Number),
        FK_TLV_MOTIVO: Number(motivo),
      })
    },
    onSuccess: invalidar,
  })
}

/** Anular: todas las opciones pasan a Descartada y sus reservas se liberan. */
export function useAnularInscripcion() {
  const invalidar = useInvalidar()
  return useMutation({
    mutationFn: async ({ id, motivo }: { id: string; motivo: string }) => {
      await evalCol.postRow(`${INSCRIPCIONES_BASE}/${id}/anular`, { FK_TLV_MOTIVO: Number(motivo) })
    },
    onSuccess: invalidar,
  })
}

/** Ejecuta el sorteo del grupo de admisión (Sección 3.7): una sola vez, no se repite. */
export function useEjecutarSorteo() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (grupoId: string) =>
      evalCol.postRow(`${INSCRIPCIONES_BASE}/configuracion/grupos/${grupoId}/sorteo`, {}),
    // Cambia el encabezado (sorteo ejecutado), los números de sorteo y el orden de la lista.
    onSuccess: () => queryClient.invalidateQueries({ queryKey: inscripcionesKeys.all }),
  })
}
