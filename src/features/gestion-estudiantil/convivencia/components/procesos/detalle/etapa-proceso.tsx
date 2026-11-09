import type { ReactNode } from "react"

import { cn } from "@/lib/utils"

import { SeccionPlegable } from "@/features/gestion-estudiantil/convivencia/components/seccion-plegable"

interface Props {
  titulo: string
  alcanzada: boolean
  /** Texto a la derecha de la cabecera cuando la etapa se alcanzó (p. ej. la fecha). */
  resumen?: ReactNode
  children: ReactNode
}

/** Etapa del proceso: abierta si se alcanzó; si no, plegada, gris y con el subtítulo «pendiente». */
export function EtapaProceso({ titulo, alcanzada, resumen, children }: Props) {
  return (
    <SeccionPlegable
      encuadrada
      comoSeccion
      defaultAbierta={alcanzada}
      titulo={<span className={cn(!alcanzada && "text-muted-foreground")}>{titulo}</span>}
      subtitulo={alcanzada ? resumen : "pendiente"}
      contentClassName="flex flex-col gap-4 px-4 py-4"
    >
      {alcanzada ? children : <p className="text-sm text-muted-foreground">Esta etapa aún no se ha alcanzado.</p>}
    </SeccionPlegable>
  )
}
