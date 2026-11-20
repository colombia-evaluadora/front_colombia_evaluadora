import type { ReactNode } from "react"

import { InfoIcon } from "@/components/ui/icons"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"

/**
 * Título (de columna o de campo) con ⓘ y tooltip que lo explica. `pointer-events-auto`: dentro de un label
 * flotante (que es `pointer-events-none`) el ⓘ igual recibe el mouse.
 */
export function TituloConAyuda({ titulo, ayuda, children }: { titulo: string; ayuda: string; children?: ReactNode }) {
  return (
    <span className="flex items-center gap-1">
      {children ?? titulo}
      <Tooltip>
        <TooltipTrigger
          render={
            <button
              type="button"
              aria-label={`Qué es ${titulo}`}
              className="pointer-events-auto inline-flex rounded-full text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50"
            />
          }
        >
          <InfoIcon className="size-4" />
        </TooltipTrigger>
        <TooltipContent className="max-w-64">{ayuda}</TooltipContent>
      </Tooltip>
    </span>
  )
}
