import { coberturaReservaAsignarGrupoRoute } from "@/router"

import { ReservaFichaScreen } from "@/features/coverage/inscripcion-reservas/components/ficha/reserva-ficha"

/** Asignar grupo (Cobertura 3.6): la ficha de la reserva con grupo, especialidad y las secciones revisables. */
export function AsignarGrupoPage() {
  const { reservaId } = coberturaReservaAsignarGrupoRoute.useParams()
  return <ReservaFichaScreen reservaId={reservaId} modo="asignar" />
}
