import type { ReactNode } from "react"

import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { CaretDownIcon } from "@/components/ui/icons"
import { cn } from "@/lib/utils"

/**
 * Sección plegable con encabezado y flecha, sobre `Collapsible` de Base UI.
 *
 * - Plegada **no se desmonta** (`keepMounted`): los campos siguen registrados y validándose, y los
 *   selects conservan las opciones ya cargadas (los conjuntos de destinatarios de comunicados).
 * - Controlada con `abierto` + `onAlternar`; sin `onAlternar` se pliega sola (`defaultAbierto`).
 * - `variante`:
 *   - `panel`: encabezado gris compacto con slot `accion` a la derecha, separado por bordes
 *     (paneles del prototipo de Nuevo y Modificar comunicado).
 *   - `tarjeta`: tarjeta redondeada con encabezado de título de pantalla (formularios del período
 *     académico, ex `FormSection`).
 */
export function SeccionPlegable({
  titulo,
  abierto,
  onAlternar,
  defaultAbierto = true,
  accion,
  variante = "panel",
  children,
}: {
  titulo: ReactNode
  abierto?: boolean
  onAlternar?: () => void
  defaultAbierto?: boolean
  accion?: ReactNode
  variante?: "panel" | "tarjeta"
  children: ReactNode
}) {
  const controlada = onAlternar !== undefined
  const estado = controlada
    ? { open: !!abierto, onOpenChange: () => onAlternar() }
    : { defaultOpen: defaultAbierto }

  const flecha = (
    <CaretDownIcon
      aria-hidden
      className={cn(
        "shrink-0 -rotate-90 group-data-[open]/seccion:rotate-0",
        variante === "panel"
          ? "size-4"
          : "size-5 text-muted-foreground transition-transform motion-reduce:transition-none",
      )}
    />
  )

  if (variante === "tarjeta") {
    return (
      <Collapsible
        {...estado}
        className="group/seccion overflow-hidden rounded-lg border border-border bg-background"
      >
        <CollapsibleTrigger className="flex w-full items-center gap-2 bg-table-screen-title px-4 py-3 text-left text-base font-medium outline-none focus-visible:ring-2 focus-visible:ring-ring/40">
          {flecha}
          {titulo}
        </CollapsibleTrigger>
        <CollapsibleContent keepMounted className="px-4 pt-5 pb-5 data-[closed]:hidden">
          {children}
        </CollapsibleContent>
      </Collapsible>
    )
  }

  return (
    <Collapsible {...estado} render={<section />} className="group/seccion border-b last:border-b-0">
      <div className="flex items-center gap-2 bg-muted/40 px-3 py-2">
        <CollapsibleTrigger className="flex min-w-0 flex-1 items-center gap-2 py-1 text-left text-sm">
          {flecha}
          <span className="min-w-0 break-words">{titulo}</span>
        </CollapsibleTrigger>
        {accion}
      </div>
      <CollapsibleContent keepMounted className="border-t p-4 data-[closed]:hidden">
        {children}
      </CollapsibleContent>
    </Collapsible>
  )
}
