import { useState, type ReactNode } from "react"

import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { CaretDownIcon } from "@/components/ui/icons"
import { cn } from "@/lib/utils"

interface SeccionPlegableProps {
  titulo: ReactNode
  children: ReactNode
  /** Botón a la derecha de la cabecera (p. ej. «Agregar estudiante»). */
  accion?: ReactNode
  /** Texto de ayuda a la derecha de la cabecera, cuando no hay acción. */
  subtitulo?: ReactNode
  /** Abierta al montar (sin control externo). */
  defaultAbierta?: boolean
  /** Control externo del plegado. */
  abierta?: boolean
  onAbiertaChange?: (abierta: boolean) => void
  /** Con un error dentro, la sección se abre para que se vea el campo marcado. */
  forzarAbierta?: boolean
  /** Recuadro propio (borde y esquinas); sin él, la sección va dentro de un recuadro compartido. */
  encuadrada?: boolean
  /** Como `<section>` con el título en un `<h2>` (patrón de acordeón accesible del detalle). */
  comoSeccion?: boolean
  contentClassName?: string
}

const CARET =
  "size-5 shrink-0 -rotate-90 text-muted-foreground transition-transform group-data-[open]/section:rotate-0 motion-reduce:transition-none"
const FOCO = "outline-none focus-visible:ring-2 focus-visible:ring-ring/40"

/** Sección plegable con cabecera muted: caret y título a la izquierda; acción o subtítulo a la derecha. */
export function SeccionPlegable({
  titulo,
  children,
  accion,
  subtitulo,
  defaultAbierta = true,
  abierta: abiertaControlada,
  onAbiertaChange,
  forzarAbierta,
  encuadrada,
  comoSeccion,
  contentClassName,
}: SeccionPlegableProps) {
  const [abiertaLocal, setAbiertaLocal] = useState(defaultAbierta)
  const abierta = abiertaControlada ?? abiertaLocal
  const setAbierta = onAbiertaChange ?? setAbiertaLocal

  const trigger = accion ? (
    <CollapsibleTrigger className={cn("flex flex-1 items-center gap-2 py-1 text-left text-base font-medium", FOCO)}>
      <CaretDownIcon className={CARET} />
      {titulo}
    </CollapsibleTrigger>
  ) : (
    <CollapsibleTrigger
      className={cn("flex w-full items-center gap-2 bg-table-screen-title px-4 py-3 text-left text-base font-medium", FOCO)}
    >
      <CaretDownIcon className={CARET} />
      {titulo}
      {subtitulo && <span className="ml-auto text-xs font-normal text-muted-foreground">{subtitulo}</span>}
    </CollapsibleTrigger>
  )
  const cabecera = comoSeccion ? <h2 className={cn("m-0", accion && "flex flex-1")}>{trigger}</h2> : trigger

  return (
    <Collapsible
      open={abierta || Boolean(forzarAbierta)}
      onOpenChange={setAbierta}
      render={comoSeccion ? <section /> : undefined}
      className={cn("group/section", encuadrada && "overflow-hidden rounded-lg border border-border bg-background")}
    >
      {accion ? (
        <div className="flex items-center gap-2 bg-table-screen-title px-4 py-2">
          {cabecera}
          {accion}
        </div>
      ) : (
        cabecera
      )}
      <CollapsibleContent keepMounted className={cn(contentClassName, "data-[closed]:hidden")}>
        {children}
      </CollapsibleContent>
    </Collapsible>
  )
}
