import { Fragment } from "react"

import { CheckIcon } from "@/components/ui/icons"
import { cn } from "@/lib/utils"

interface StepperProps {
  steps: string[]
  currentStep: number
}

const CIRCLE_SIZE = "1.5rem"

/**
 * Indicador de pasos: círculo por paso (check si ya se completó, número si
 * no) unidos por una línea, con el label debajo, centrado bajo su círculo.
 *
 * Un solo grid con columnas fijas para los círculos (`CIRCLE_SIZE`) y `1fr`
 * para las líneas entre medio; círculo y label de un mismo paso comparten
 * columna (misma `gridColumn`, filas distintas). Al centrarse ambos en esa
 * columna angosta quedan alineados sin importar cuánto texto tenga el
 * label — al ser más ancho que la columna simplemente desborda hacia los
 * costados (dentro del `1fr` de las líneas vecinas), que es el look esperado.
 */
export function Stepper({ steps, currentStep }: StepperProps) {
  const columns = steps
    .map((_, index) => (index < steps.length - 1 ? `${CIRCLE_SIZE} 1fr` : CIRCLE_SIZE))
    .join(" ")

  return (
    <div className="grid px-20" style={{ gridTemplateColumns: columns }}>
      {steps.map((_, index) => {
        const isDone = index < currentStep
        const isActive = index === currentStep
        return (
          <Fragment key={index}>
            <div
              style={{ gridColumn: index * 2 + 1, gridRow: 1 }}
              className={cn(
                "flex size-6 shrink-0 items-center justify-center justify-self-center rounded-full border-2 text-xs font-semibold",
                isDone && "border-primary bg-primary text-primary-foreground",
                isActive && "border-primary text-primary",
                !isDone && !isActive && "border-border text-muted-foreground",
              )}
            >
              {isDone ? <CheckIcon className="size-4" /> : index + 1}
            </div>
            {index < steps.length - 1 && (
              <div
                style={{ gridColumn: index * 2 + 2, gridRow: 1 }}
                className={cn("h-0.5 self-center", index < currentStep ? "bg-primary" : "bg-border")}
              />
            )}
          </Fragment>
        )
      })}
      {steps.map((label, index) => {
        const isDone = index < currentStep
        const isActive = index === currentStep
        return (
          <span
            key={label}
            style={{ gridColumn: index * 2 + 1, gridRow: 2 }}
            className={cn(
              "mt-2 justify-self-center text-center text-sm font-medium whitespace-nowrap",
              isActive ? "text-primary" : isDone ? "text-foreground" : "text-muted-foreground",
            )}
          >
            {label}
          </span>
        )
      })}
    </div>
  )
}
