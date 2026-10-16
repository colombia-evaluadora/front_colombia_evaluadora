import { Button } from "@/components/ui/button"
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { ArrowCounterClockwiseIcon, CloudOffIcon } from "@/components/ui/icons"

/** Copys del plan offline §7.5 / §8 (*[texto SO]*). */
const OFFLINE_EMPTY_COPY = {
  soloEnLinea: {
    title: "Esta sección necesita conexión",
    description: "Vuelve a intentarlo cuando tengas internet. Es una pantalla de administración. Mientras tanto puedes seguir en Planeador, Planilla, Asistencia, Informes, Referentes y Comunicaciones.",
  },
  sinDatosGuardados: {
    title: "Sin datos guardados",
    description:
      'No hay datos guardados de este grupo en este equipo. Conéctate y usa "Preparar para usar sin conexión".',
  },
} as const

interface OfflineEmptyStateProps {
  /** `soloEnLinea`: vista fuera del alcance offline. `sinDatosGuardados`: vista offline sin cache de esta query. */
  kind?: keyof typeof OFFLINE_EMPTY_COPY
  onRetry?: () => void
}

export function OfflineEmptyState({ kind = "soloEnLinea", onRetry }: OfflineEmptyStateProps) {
  const copy = OFFLINE_EMPTY_COPY[kind]
  return (
    <Empty className="grow">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <CloudOffIcon />
        </EmptyMedia>
        <EmptyTitle>{copy.title}</EmptyTitle>
        <EmptyDescription>{copy.description}</EmptyDescription>
      </EmptyHeader>
      {onRetry && (
        <EmptyContent>
          <Button variant="outline" color="neutral" onClick={onRetry}>
            <ArrowCounterClockwiseIcon data-icon="inline-start" />
            Reintentar
          </Button>
        </EmptyContent>
      )}
    </Empty>
  )
}
