import type {
  EstadoReserva,
  EstadoTraslado,
  ReservasCupoContadores,
  ReservasCupoFilters,
} from "@/features/coverage/inscripcion-reservas/api/types/reserva-cupo"

type BadgeColor = "success" | "destructive" | "orange" | "info" | "muted"

export const ESTADO_RESERVA_UI: Record<EstadoReserva, { label: string; color: BadgeColor }> = {
  RESERVADA: { label: "Reservada", color: "success" },
  SIN_CONTINUIDAD: { label: "Sin continuidad", color: "destructive" },
  LIBERADA: { label: "Liberada", color: "muted" },
  MATRICULADA: { label: "Matriculada", color: "info" },
}

export const ESTADO_TRASLADO_LABELS: Record<EstadoTraslado, string> = {
  PENDIENTE: "Pendiente",
  ACEPTADO: "Aceptado",
  RECHAZADO: "Rechazado",
  CANCELADO: "Cancelado",
}

/**
 * Tarjetas de contadores sobre la lista (prototipo). Cada una es además un
 * filtro rápido: aplica `filtro` y se ve activa mientras ese filtro esté puesto.
 */
export const CONTADORES_UI: {
  count: keyof ReservasCupoContadores
  label: string
  /** Color del número (clases literales: Tailwind no ve strings armados). */
  numero: string
  filtro: Partial<ReservasCupoFilters>
}[] = [
  {
    count: "reservadas",
    label: "Reservadas",
    numero: "text-foreground",
    filtro: { estado: "RESERVADA" },
  },
  {
    count: "sinContinuidad",
    label: "Sin continuidad",
    numero: "text-red",
    filtro: { estado: "SIN_CONTINUIDAD" },
  },
  {
    count: "porConfirmar",
    label: "Por confirmar",
    numero: "text-foreground",
    filtro: { porConfirmar: true },
  },
  {
    count: "trasladosPorResponder",
    label: "Traslados por responder",
    numero: "text-orange",
    filtro: { entrantes: true },
  },
]
