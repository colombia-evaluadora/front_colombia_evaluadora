import type { PersonRemoveIcon } from "@/components/ui/icons"

import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"

/** Disparador de una acción: ícono con tooltip (fila) o botón con texto (detalle, barra de lote). */
export function BotonAccion({
  modo,
  label,
  ariaLabel,
  Icon,
  onClick,
  disabled,
}: {
  modo: "icon" | "button"
  label: string
  ariaLabel?: string
  Icon: typeof PersonRemoveIcon
  onClick: () => void
  disabled?: boolean
}) {
  if (modo === "button") {
    return (
      <Button type="button" variant="outline" color="primary" size="sm" aria-label={ariaLabel} onClick={onClick} disabled={disabled}>
        <Icon data-icon="inline-start" />
        {label}
      </Button>
    )
  }
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            type="button"
            variant="ghost"
            color="neutral"
            size="icon-sm"
            aria-label={ariaLabel ?? label}
            onClick={onClick}
            disabled={disabled}
          />
        }
      >
        <Icon />
      </TooltipTrigger>
      <TooltipContent>{ariaLabel ?? label}</TooltipContent>
    </Tooltip>
  )
}
