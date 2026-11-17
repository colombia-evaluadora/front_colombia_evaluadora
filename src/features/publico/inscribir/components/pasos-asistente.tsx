import { Fragment } from "react"

import { CheckIcon } from "@/components/ui/icons"
import { cn } from "@/lib/utils"

/**
 * Indicador de pasos del asistente: círculo y nombre en la misma línea, unidos
 * por una línea que se pinta de primary al completar el paso. En celular solo
 * se ve el nombre del paso actual.
 */
export function PasosAsistente({ pasos, actual }: { pasos: string[]; actual: number }) {
  return (
    <ol aria-label="Pasos de la inscripción" className="flex items-center gap-3">
      {pasos.map((paso, i) => {
        const hecho = i < actual
        const activo = i === actual
        return (
          <Fragment key={paso}>
            <li aria-current={activo ? "step" : undefined} className="flex shrink-0 items-center gap-2">
              <span
                className={cn(
                  "flex size-6 items-center justify-center rounded-full text-xs font-semibold",
                  hecho && "bg-primary-22 text-primary",
                  activo && "bg-primary text-primary-foreground",
                  !hecho && !activo && "bg-muted text-muted-foreground",
                )}
              >
                {hecho ? <CheckIcon className="size-4" aria-hidden /> : i + 1}
                {hecho && <span className="sr-only">Completado:</span>}
              </span>
              <span
                className={cn(
                  "text-sm whitespace-nowrap",
                  activo ? "text-foreground font-medium" : hecho ? "text-foreground hidden md:inline" : "text-muted-foreground hidden md:inline",
                )}
              >
                {paso}
              </span>
            </li>
            {i < pasos.length - 1 && (
              <li aria-hidden className={cn("min-w-4 flex-1", hecho ? "bg-primary h-0.5" : "bg-border h-px")} />
            )}
          </Fragment>
        )
      })}
    </ol>
  )
}
