import type { ReactElement } from "react"

import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"

/**
 * Envuelve un control solo en línea y, si `tooltip` no es `null` (sin
 * conexión, ver `useOnlineOnly`), muestra el motivo al pasar el mouse. Un
 * `<button disabled>` no emite eventos de puntero: por eso el trigger es un
 * `<span>` que lo contiene.
 */
export function OnlineOnlyTooltip({ tooltip, children }: { tooltip: string | null; children: ReactElement }) {
  if (!tooltip) return children
  return (
    <Tooltip>
      <TooltipTrigger render={<span className="inline-flex" tabIndex={0} />}>{children}</TooltipTrigger>
      <TooltipContent>{tooltip}</TooltipContent>
    </Tooltip>
  )
}
