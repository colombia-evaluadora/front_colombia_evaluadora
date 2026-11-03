import { useState } from "react"

import { Button } from "@/components/ui/button"
import { ArrowCounterClockwiseIcon, LockIcon } from "@/components/ui/icons"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"

import { CloseAcademicPeriodDialog } from "@/features/establishment/academic-period/components/dialogs/dialog-close-academic-period"
import { ReopenAcademicPeriodDialog } from "@/features/establishment/academic-period/components/dialogs/dialog-reopen-academic-period"
import { useMenuPermission } from "@/features/navigation/api/use-menu-permission"

interface PeriodStateActionProps {
  periodId: number
  periodTitle: string
  status: string
  reopenedUntil?: string | null
  // "icon": botón de la fila de la tabla; "button": encabezado del período.
  variant?: "icon" | "button"
}

// Regla 16: Cerrado → Reabrir; reabierto → Cerrar. Solo con Guardar sobre
// PERIODOS_ACADEMICOS (el back hace el mismo gate EDITAR).
export function PeriodStateAction({
  periodId,
  periodTitle,
  status,
  reopenedUntil,
  variant = "icon",
}: PeriodStateActionProps) {
  const { puedeEditar } = useMenuPermission("PERIODOS_ACADEMICOS")
  const [open, setOpen] = useState(false)
  const action = status === "C" ? "reabrir" : reopenedUntil ? "cerrar" : null
  if (!puedeEditar || action == null) return null

  const label = action === "reabrir" ? "Reabrir" : "Cerrar"
  const Icon = action === "reabrir" ? ArrowCounterClockwiseIcon : LockIcon

  return (
    <>
      {variant === "button" ? (
        <Button size="sm" color="primary" onClick={() => setOpen(true)}>
          <Icon data-icon="inline-start" />
          {label}
        </Button>
      ) : (
        <Tooltip>
          <TooltipTrigger
            render={
              <Button variant="ghost" color="neutral" size="icon-sm" onClick={() => setOpen(true)} />
            }
          >
            <span className="sr-only">
              {label} {periodTitle}
            </span>
            <Icon />
          </TooltipTrigger>
          <TooltipContent>{label}</TooltipContent>
        </Tooltip>
      )}
      {action === "reabrir" ? (
        <ReopenAcademicPeriodDialog
          open={open}
          onOpenChange={setOpen}
          periodId={periodId}
          periodTitle={periodTitle}
        />
      ) : (
        <CloseAcademicPeriodDialog
          open={open}
          onOpenChange={setOpen}
          periodId={periodId}
          periodTitle={periodTitle}
        />
      )}
    </>
  )
}
