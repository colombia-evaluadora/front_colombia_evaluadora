import type { ReactNode } from "react"

import { OfflineDataMessage } from "@/components/offline/offline-data-message"
import { Spinner } from "@/components/ui/spinner"
import { useOfflineStall } from "@/lib/offline/use-offline-stall"

/**
 * Contenido de un loader "spinner + texto" (`<Spinner /> Cargando planilla…`)
 * que nunca queda girando para siempre sin conexión: a los 1,5 s sin red se
 * reemplaza por el aviso de que el dato no está guardado en el equipo
 * (`useOfflineStall`). El contenedor (centrado, padding) lo sigue poniendo
 * quien lo usa.
 */
export function LoadingLabel({ children = "Cargando…", showHint }: { children?: ReactNode; showHint?: boolean }) {
  const stalled = useOfflineStall(true)
  if (stalled) return <OfflineDataMessage variant="inline" showHint={showHint} />
  return (
    <>
      <Spinner /> {children}
    </>
  )
}
