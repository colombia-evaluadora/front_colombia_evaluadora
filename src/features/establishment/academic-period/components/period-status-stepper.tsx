import { Fragment } from "react"

import { CheckIcon } from "@/components/ui/icons"
import { cn } from "@/lib/utils"

interface PeriodStatusStepperProps {
  steps: string[]
  currentStep: number
}

// Estados del período en línea: cada paso es círculo + etiqueta, unidos por
// una barra que se pinta hasta el estado actual. Pasados con check, el actual
// relleno y los que faltan en gris.
export function PeriodStatusStepper({ steps, currentStep }: PeriodStatusStepperProps) {
  return (
    <ol className="flex w-full items-center gap-3" aria-label="Estado del período">
      {steps.map((label, index) => {
        const isDone = index < currentStep
        const isActive = index === currentStep
        return (
          <Fragment key={label}>
            <li
              className="flex shrink-0 items-center gap-2.5"
              aria-current={isActive ? "step" : undefined}
            >
              <span
                className={cn(
                  "flex size-6 items-center justify-center rounded-full border text-xs font-medium tabular-nums",
                  isDone && "border-primary/30 bg-primary/10 text-primary",
                  isActive && "border-primary bg-primary text-primary-foreground",
                  !isDone && !isActive && "border-border bg-muted text-muted-foreground",
                )}
              >
                {isDone ? <CheckIcon className="size-3.5" aria-hidden /> : index + 1}
              </span>
              <span
                className={cn(
                  "text-sm",
                  isDone || isActive ? "text-foreground" : "text-muted-foreground",
                )}
              >
                {label}
              </span>
            </li>
            {index < steps.length - 1 && (
              <li
                aria-hidden
                className={cn(
                  "h-0.5 min-w-6 flex-1 rounded-full",
                  index < currentStep ? "bg-primary" : "bg-border",
                )}
              />
            )}
          </Fragment>
        )
      })}
    </ol>
  )
}
