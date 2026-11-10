import type {
  EstadoReserva,
  EstadoTraslado,
  FiltroRapido,
  ReservasCupoContadores,
} from "@/features/coverage/inscripcion-reservas/api/types/reserva-cupo"

type BadgeColor = "success" | "orange" | "info" | "muted"

export const ESTADO_RESERVA_UI: Record<EstadoReserva, { label: string; color: BadgeColor }> = {
  RESERVADA: { label: "Reservada", color: "success" },
  SIN_CONTINUIDAD: { label: "Sin continuidad", color: "orange" },
  LIBERADA: { label: "Liberada", color: "muted" },
  MATRICULADA: { label: "Matriculada", color: "info" },
}

export const ESTADO_TRASLADO_LABELS: Record<EstadoTraslado, string> = {
  PENDIENTE: "Pendiente",
  ACEPTADO: "Aceptado",
  RECHAZADO: "Rechazado",
  CANCELADO: "Cancelado",
}

export const FILTRO_RAPIDO_UI: {
  value: FiltroRapido
  label: string
  count: keyof ReservasCupoContadores
}[] = [
  { value: "TODAS", label: "Todas", count: "todas" },
  { value: "RESERVADAS", label: "Reservadas", count: "reservadas" },
  { value: "SIN_CONTINUIDAD", label: "Sin continuidad", count: "sinContinuidad" },
  { value: "POR_CONFIRMAR", label: "Por confirmar", count: "porConfirmar" },
  {
    value: "TRASLADOS_POR_RESPONDER",
    label: "Traslados por responder",
    count: "trasladosPorResponder",
  },
]
