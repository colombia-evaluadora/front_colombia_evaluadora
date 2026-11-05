import type { ReactNode } from "react"

import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"

export interface RowActionItem {
  label: string
  icon: ReactNode
  onClick: () => void
  disabled?: boolean
}

/**
 * Acciones de una fila como en las demás tablas: botones de ícono con tooltip
 * que la columna `actions` de DataTable muestra al pasar el mouse.
 */
export function RowActions({ items }: { items: RowActionItem[] }) {
  if (items.length === 0) return null
  return (
    <div className="flex items-center justify-end gap-1">
      {items.map((item) => (
        <Tooltip key={item.label}>
          <TooltipTrigger
            render={
              <Button
                variant="ghost"
                color="neutral"
                size="icon-sm"
                disabled={item.disabled}
                onClick={item.onClick}
              />
            }
          >
            <span className="sr-only">{item.label}</span>
            {item.icon}
          </TooltipTrigger>
          <TooltipContent>{item.label}</TooltipContent>
        </Tooltip>
      ))}
    </div>
  )
}
