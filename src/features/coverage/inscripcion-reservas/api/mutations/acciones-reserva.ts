import { useMutation, useQueryClient } from "@tanstack/react-query"

import { evalCol } from "@/lib/eval-col-client"
import { postMultipart } from "@/lib/files"
import {
  RESERVAS_BASE,
  reservasCupoKeys,
} from "@/features/coverage/inscripcion-reservas/api/query/use-reservas-cupo-query"
import type {
  CambiarJornadaSedeInput,
  LiberarReservaInput,
  RegistrarRetiroInput,
  SolicitarTrasladoInput,
} from "@/features/coverage/inscripcion-reservas/api/types/reserva-cupo"

// Cada acción cambia la fila, los contadores y el detalle (y la del destino de
// un traslado): se invalida todo el prefijo de reservas.
function useAccionReserva<T>(accion: (input: T) => Promise<unknown>) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: accion,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: reservasCupoKeys.all }),
  })
}

// --- Back real (V510) --------------------------------------------------------

/** Cambiar jornada o sede: el grado elegido en las ubicaciones lleva su sede y jornada. */
export const useCambiarJornadaSede = () =>
  useAccionReserva(({ id, fkTgrado }: CambiarJornadaSedeInput) =>
    evalCol.postRow(`${RESERVAS_BASE}/${id}/cambiar-ubicacion`, { FK_TGRADO: fkTgrado }),
  )

/** Reservar cupo de una Sin continuidad: pasa a Reservada en el grado (sede y jornada) con cupo. */
export const useReservarCupo = () =>
  useAccionReserva(({ id, fkTgrado }: CambiarJornadaSedeInput) =>
    evalCol.postRow(`${RESERVAS_BASE}/${id}/reservar-cupo`, { FK_TGRADO: fkTgrado }),
  )

/**
 * Restituir una Liberada a Reservada en su misma ubicación. El back responde 409 si ya no hay cupo,
 * venció la fecha límite de matrícula, el estudiante tiene otra vigente o la liberó la entidad territorial.
 */
export const useRestituirReserva = () =>
  useAccionReserva((id: string) => evalCol.postRow(`${RESERVAS_BASE}/${id}/restituir`, {}))

/**
 * Aceptar traslado (destino): crea la reserva aquí en el grado elegido y libera la del origen.
 * `id` es la reserva del origen (la fila del traslado entrante).
 */
export const useAceptarTraslado = () =>
  useAccionReserva(({ id, fkTgrado }: CambiarJornadaSedeInput) =>
    evalCol.postRow(`${RESERVAS_BASE}/${id}/traslado/aceptar`, { FK_TGRADO: fkTgrado }),
  )

/** Rechazar traslado (destino) con un motivo de rechazo; la reserva del origen sigue Reservada. */
export const useRechazarTraslado = () =>
  useAccionReserva(({ id, motivoId }: LiberarReservaInput) =>
    evalCol.postRow(`${RESERVAS_BASE}/${id}/traslado/rechazar`, { FK_TLV_MOTIVO: motivoId }),
  )

/** Cancelar un traslado Pendiente (origen); la reserva sigue Reservada. */
export const useCancelarTraslado = () =>
  useAccionReserva((id: string) => evalCol.postRow(`${RESERVAS_BASE}/${id}/traslado/cancelar`, {}))

/** Liberar manualmente (solo La familia desiste, Matriculado en otro EE o Error de registro). */
export const useLiberarReserva = () =>
  useAccionReserva(({ id, motivoId }: LiberarReservaInput) =>
    evalCol.postRow(`${RESERVAS_BASE}/${id}/liberar`, { FK_TLV_MOTIVO: motivoId }),
  )

/** Registrar retiro: decisión Se retira con el motivo; la reserva queda Liberada. */
export const useRegistrarRetiro = () =>
  useAccionReserva(({ id, motivoId }: RegistrarRetiroInput) =>
    evalCol.postRow(`${RESERVAS_BASE}/${id}/registrar-retiro`, {
      FK_TLV_MOTIVO_RETIRO: motivoId,
    }),
  )

/**
 * Solicitar traslado. Multipart por el soporte: file-service lo guarda y pasa
 * su `pk_tarchivo` en `SOPORTE_TRASLADO`, que el endpoint une al JSON. El
 * JSONB `TRASLADO` viaja como texto JSON; lo vacío se omite.
 */
export const useSolicitarTraslado = () =>
  useAccionReserva(({ id, soporte, ...t }: SolicitarTrasladoInput) => {
    const traslado = {
      FK_TESTABLECIMIENTO_DESTINO: t.destinoId ?? undefined,
      NOMBRE_ESTABLECIMIENTO_DESTINO: t.destinoId == null ? t.nombreDestino : undefined,
      FK_TLV_MOTIVO_TRASLADO: t.motivoId,
      FK_TSEDE_PREFERIDA: t.sedePreferidaId ?? undefined,
      FK_TLV_JORNADA_PREFERIDA: t.jornadaPreferidaId ?? undefined,
      TIENE_HERMANO: t.tieneHermano,
      DOCUMENTO_HERMANO: t.tieneHermano ? t.documentoHermano : undefined,
      COMPARTIR_SOPORTES: t.compartirSoportes,
      OBSERVACION: t.observacion ?? undefined,
      AUTORIZA_DATOS: t.autorizaDatos,
    }
    return postMultipart(
      `/eval-col${RESERVAS_BASE}/${id}/traslado/solicitar`,
      { TRASLADO: JSON.stringify(traslado) },
      { SOPORTE_TRASLADO: soporte },
    )
  })
