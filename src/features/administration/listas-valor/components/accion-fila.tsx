import type { ReactNode } from "react"

import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"

/** Botón de acción de la fila: solo ícono con tooltip; Eliminar en rojo. */
export function AccionFila({
  label,
  onClick,
  disabled,
  destructivo,
  children,
}: {
  label: string
  onClick: () => void
  disabled?: boolean
  destructivo?: boolean
  children: ReactNode
}) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            variant="ghost"
            color={destructivo ? "destructive" : "neutral"}
            size="icon-sm"
            disabled={disabled}
            aria-label={label}
            onClick={onClick}
          />
        }
      >
        {children}
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  )
}
