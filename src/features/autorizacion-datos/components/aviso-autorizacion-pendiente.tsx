import type { ReactNode } from "react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { ShieldCheckIcon, WarningIcon } from "@/components/ui/icons"

/**
 * Aviso de autorización pendiente (U.2.CON.1b, U.3.EST.1b): "Falta la autorización de
 * tratamiento de datos" con "Autorizar ahora". Sin `onAutorizar` no muestra el botón.
 */
export function AvisoAutorizacionPendiente({
  onAutorizar,
  children,
}: {
  onAutorizar?: () => void
  children?: ReactNode
}) {
  return (
    <Alert variant="warning">
      <WarningIcon />
      <AlertTitle>Falta la autorización de tratamiento de datos</AlertTitle>
      <AlertDescription className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <span className="flex-1">
          {children ??
            "Sin ella, los establecimientos solo ven lo no sensible (número, grado y opciones). La inscripción sigue su curso, pero conviene autorizarla."}
        </span>
        {onAutorizar && (
          <Button type="button" size="sm" className="shrink-0" onClick={onAutorizar}>
            <ShieldCheckIcon data-icon="inline-start" />
            Autorizar ahora
          </Button>
        )}
      </AlertDescription>
    </Alert>
  )
}

/** Aviso bajo la casilla opcional de autorización (formularios de inscripción). */
export function AvisoSinAutorizacion() {
  return (
    <Alert variant="warning">
      <WarningIcon />
      <AlertTitle>Sin su autorización, los establecimientos no podrán consultar los datos</AlertTitle>
      <AlertDescription>
        Sin ella, el establecimiento solo ve lo no sensible (número, grado y opciones). La inscripción sigue su
        curso, pero conviene autorizarla.
      </AlertDescription>
    </Alert>
  )
}
