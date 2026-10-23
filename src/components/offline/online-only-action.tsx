import type { ReactNode } from "react"

import { OnlineOnlyTooltip } from "@/components/offline/online-only-tooltip"
import { useOnlineOnly } from "@/lib/offline/use-online-only"

/**
 * Envuelve una acción solo en línea que trae su propio trigger (un diálogo
 * con su botón, un `Link` a una vista solo en línea) y, sin conexión, la deja
 * visible pero deshabilitada con el tooltip estándar ("Necesitas conexión para
 * esta acción."). Sirve para pantallas de solo consulta offline donde
 * reescribir cada diálogo para recibir `disabled` no vale la pena.
 *
 * `inert` saca a los hijos del foco y de los clics (incluidos sus propios
 * tooltips); el `<span>` exterior es el que recibe el foco del tooltip.
 */
export function OnlineOnlyAction({ children, tooltip }: { children: ReactNode; tooltip?: string }) {
  const soloEnLinea = useOnlineOnly(tooltip)
  if (!soloEnLinea.disabled) return children
  return (
    <OnlineOnlyTooltip tooltip={soloEnLinea.tooltip}>
      <span className="inline-flex cursor-not-allowed" aria-disabled="true" data-online-only="">
        <span className="pointer-events-none inline-flex opacity-50" inert>
          {children}
        </span>
      </span>
    </OnlineOnlyTooltip>
  )
}
