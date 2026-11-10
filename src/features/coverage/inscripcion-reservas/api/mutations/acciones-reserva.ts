import { useMutation, useQueryClient } from "@tanstack/react-query"

import { api } from "@/lib/api-client"
import { reservasCupoKeys } from "@/features/coverage/inscripcion-reservas/api/query/use-reservas-cupo-query"
import type {
  AsignarGrupoInput,
  AsignarGrupoLoteInput,
  CambiarJornadaSedeInput,
  LiberarReservaInput,
  RegistrarRetiroInput,
  SolicitarTrasladoInput,
} from "@/features/coverage/inscripcion-reservas/api/types/reserva-cupo"

// Cada acción cambia la fila de la lista, los contadores y el detalle: se
// invalida todo el prefijo de reservas.
function useAccionReserva<T extends { id: string }>(
  path: string,
  toBody: (input: T) => unknown = (i) => i,
) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: T) =>
      api.post<void>(`/coverage/reservas-cupo/${input.id}/${path}`, toBody(input)),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: reservasCupoKeys.all }),
  })
}

export const useAsignarGrupo = () => useAccionReserva<AsignarGrupoInput>("asignar-grupo")
export const useCambiarJornadaSede = () =>
  useAccionReserva<CambiarJornadaSedeInput>("cambiar-jornada-sede")
export const useLiberarReserva = () => useAccionReserva<LiberarReservaInput>("liberar")
export const useRegistrarRetiro = () => useAccionReserva<RegistrarRetiroInput>("registrar-retiro")

// El soporte va como archivo: multipart.
export function useSolicitarTraslado() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ soporte, id, ...datos }: SolicitarTrasladoInput) => {
      const body = new FormData()
      for (const [k, v] of Object.entries(datos)) if (v != null) body.append(k, String(v))
      if (soporte) body.append("soporte", soporte)
      return api.post<void>(`/coverage/reservas-cupo/${id}/solicitar-traslado`, body)
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: reservasCupoKeys.all }),
  })
}

export function useAsignarGrupoLote() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: AsignarGrupoLoteInput) =>
      api.post<{ matriculadas: number }>("/coverage/reservas-cupo/asignar-grupo-lote", input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: reservasCupoKeys.all }),
  })
}
