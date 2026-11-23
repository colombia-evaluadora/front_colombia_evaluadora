import { useMutation, useQueryClient } from "@tanstack/react-query"

import { evalCol } from "@/lib/eval-col-client"
import { fetchEstablecimientoId } from "@/features/coverage/inscripcion-reservas/api/query/use-inscripciones-query"
import {
  RESERVAS_BASE,
  reservasCupoKeys,
} from "@/features/coverage/inscripcion-reservas/api/query/use-reservas-cupo-query"
import type {
  ReservarCuposInput,
  ReservarCuposResumen,
} from "@/features/coverage/inscripcion-reservas/api/types/reserva-cupo"

/** JSON de `fn_reserva_reservar_cupos_interno`: los omitidos vienen por motivo, sin total. */
interface ResumenRow {
  datos: {
    creadas: number
    sinContinuidad: number
    omitidos: Omit<ReservarCuposResumen["omitidos"], "total">
  }
}

async function reservarCupos({ periodoIds }: ReservarCuposInput): Promise<ReservarCuposResumen> {
  const ee = await fetchEstablecimientoId()
  const { datos } = await evalCol.postRow<ResumenRow>(`${RESERVAS_BASE}/reservar-cupos`, {
    FK_TESTABLECIMIENTO: ee,
    PERIODOS: periodoIds.map(Number),
  })
  const o = datos.omitidos
  return {
    creadas: datos.creadas,
    sinContinuidad: datos.sinContinuidad,
    omitidos: {
      ...o,
      total: o.conReserva + o.sinGradoSiguiente + o.sinPeriodoContinuidad + o.noRenovacion,
    },
  }
}

// Regla 35: re-ejecutable, solo procesa a quienes faltan.
export function useReservarCupos() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: reservarCupos,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: reservasCupoKeys.all }),
  })
}
