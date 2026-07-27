import * as React from "react"
import { Input as InputPrimitive } from "@base-ui/react/input"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"
import { useFieldVariant, type FieldVariant } from "@/hooks/use-field-variant"

const inputVariants = cva(
  "w-full min-w-0 bg-transparent text-base transition-[color,border-color,background-color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
  {
    variants: {
      variant: {
        standard:
          "h-10 border border-transparent border-b-input px-0 py-1 focus-visible:border-b-ring aria-invalid:border-b-destructive dark:aria-invalid:border-b-destructive/50",
        outlined:
          "h-10 rounded-md border border-input px-3 py-1 hover:border-ring focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/20 aria-invalid:border-red aria-invalid:focus-visible:border-red aria-invalid:focus-visible:ring-red/20",
        filled:
          "h-14 rounded-t-md border-0 border-b border-b-input bg-muted/40 px-3 pt-6 pb-1 hover:bg-muted/55 focus-visible:border-b-ring focus-visible:bg-muted/50 aria-invalid:border-b-destructive",
      },
    },
    defaultVariants: {
      variant: "standard",
    },
  }
)

/**
 * Capa que se compone encima de `inputVariants` para los controles que tienen
 * forma de input pero abren un popup (`Select`, `DatePicker`). Aporta el
 * estado abierto: como el foco vive en el popup mientras está desplegado, el
 * borde tiene que reaccionar a `data-popup-open` — es el equivalente del
 * `focus-visible` del input, que ahí no aplica — para que el campo no se
 * "apague" al abrirlo.
 */
const inputTriggerVariants = cva("cursor-pointer", {
  variants: {
    variant: {
      standard: "data-[popup-open]:border-b-ring",
      outlined:
        "data-[popup-open]:border-ring data-[popup-open]:ring-2 data-[popup-open]:ring-ring/20",
      filled: "data-[popup-open]:border-b-ring data-[popup-open]:bg-muted/50",
    },
  },
  defaultVariants: {
    variant: "standard",
  },
})

type InputVariant = Exclude<FieldVariant, "plain">

/**
 * Resuelve la variante visual de un control: la explícita si la hay, sino la
 * del `Field` contenedor. `plain` (el default del `Field`, sin label flotante)
 * no tiene forma propia, así que cae en `standard`.
 */
function useInputVariant(variant?: InputVariant | null): InputVariant {
  const fieldVariant = useFieldVariant()
  return variant ?? (fieldVariant === "plain" ? "standard" : fieldVariant)
}

type InputProps = React.ComponentProps<"input"> &
  VariantProps<typeof inputVariants>

function Input({ className, type, variant, ...props }: InputProps) {
  const resolvedVariant = useInputVariant(variant)

  return (
    <InputPrimitive
      type={type}
      data-slot="input"
      className={cn(inputVariants({ variant: resolvedVariant }), className)}
      {...props}
    />
  )
}

export {
  Input,
  inputVariants,
  inputTriggerVariants,
  useInputVariant,
  type InputVariant,
}
