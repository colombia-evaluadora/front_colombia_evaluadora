import { coberturaReservaDetalleRoute } from "@/router"

import { ReservaFichaScreen } from "@/features/coverage/inscripcion-reservas/components/ficha/reserva-ficha"

/** Ver detalle (Cobertura 3.2 y 3.6): la ficha de la reserva en solo lectura. */
export function ReservaDetallePage() {
  const { reservaId } = coberturaReservaDetalleRoute.useParams()
  return <ReservaFichaScreen reservaId={reservaId} modo="detalle" />
}
