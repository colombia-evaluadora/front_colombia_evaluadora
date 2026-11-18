import { useMutation, useQueryClient } from "@tanstack/react-query"

import { evalCol } from "@/lib/eval-col-client"

import { actividadesKeys } from "@/features/gestion-estudiantil/actividades-extracurriculares/api/query-keys"
import { configuracionKeys } from "@/features/gestion-estudiantil/configuracion/api/query-keys"

/** `PUT /prevencion/parametros/causas-reservadas`: las que se agregan a las cuatro fijas (VALOR de CAUSA_INASISTENCIA). */
export function useGuardarCausasReservadas() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (i: { establecimiento: number; causas: string[] }) =>
      evalCol.putRow("/gestion-estudiantil/prevencion/parametros/causas-reservadas", {
        ESTABLECIMIENTO: i.establecimiento,
        CAUSAS: i.causas,
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: configuracionKeys.all }),
  })
}

/** `PUT /servicio-social/parametros`: horas 1-500, grados (pk de GRADOS, al menos uno) y anticipación 1-6 meses. */
export function useGuardarServicioSocial() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (i: { establecimiento: number; horas: number; grados: number[]; anticipacion: number }) =>
      evalCol.putRow("/gestion-estudiantil/servicio-social/parametros", {
        ESTABLECIMIENTO: i.establecimiento,
        HORAS_REQUERIDAS: i.horas,
        GRADOS: i.grados,
        ANTICIPACION_MESES: i.anticipacion,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: configuracionKeys.all })
      queryClient.invalidateQueries({ queryKey: actividadesKeys.servicioSocial.parametros })
    },
  })
}
