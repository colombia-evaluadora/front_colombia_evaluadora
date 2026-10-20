import type { ReactNode } from "react"

import { CloudOffIcon } from "@/components/ui/icons"
import { OFFLINE_NO_DATA_MESSAGE, OFFLINE_PREPARE_HINT } from "@/lib/offline/offline-messages"
import { cn } from "@/lib/utils"

interface OfflineDataMessageProps {
  /** `block`: centrado con aire (tablas, paneles); `inline`: en una línea (loaders, selects). */
  variant?: "block" | "inline"
  /** Agrega "Cuando tengas conexión, usa «Preparar sin conexión»…". */
  showHint?: boolean
  message?: ReactNode
  className?: string
}

/**
 * Aviso de "Sin conexión: esta información no está guardada en este equipo"
 * en el lugar donde iría el dato (fila de tabla, panel, loader). Sin `role`
 * propio: el anuncio para lectores de pantalla lo hace el banner global
 * (`OfflineBanner`, `aria-live`), que en ese mismo momento dice que parte de
 * la pantalla no está guardada.
 */
export function OfflineDataMessage({
  variant = "block",
  showHint = variant === "block",
  message = OFFLINE_NO_DATA_MESSAGE,
  className,
}: OfflineDataMessageProps) {
  return (
    <div
      data-slot="offline-data-message"
      className={cn(
        "text-sm text-muted-foreground",
        variant === "block"
          ? "flex flex-col items-center justify-center gap-1 px-4 py-6 text-center"
          : "inline-flex items-center gap-2",
        className,
      )}
    >
      <span className="inline-flex items-center gap-2 font-medium text-foreground">
        <CloudOffIcon aria-hidden className="size-4 shrink-0 text-navy" />
        <span className="whitespace-normal">{message}</span>
      </span>
      {showHint && <span className="text-xs whitespace-normal">{OFFLINE_PREPARE_HINT}</span>}
    </div>
  )
}
