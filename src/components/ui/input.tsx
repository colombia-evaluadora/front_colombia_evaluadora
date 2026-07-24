import * as React from "react"
import { Input as InputPrimitive } from "@base-ui/react/input"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"
import { useFieldVariant } from "@/hooks/use-field-variant"

const inputVariants = cva(
  "w-full min-w-0 bg-transparent text-base transition-[color,border-color,background-color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
  {
    variants: {
      variant: {
        standard:
          "h-10 border border-transparent border-b-input px-0 py-1 focus-visible:border-b-ring aria-invalid:border-b-destructive dark:aria-invalid:border-b-destructive/50",
        outlined:
          "h-10 rounded-md border border-input px-3 py-1 hover:border-ring focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/20 aria-invalid:border-destructive aria-invalid:focus-visible:border-destructive aria-invalid:focus-visible:ring-destructive/20",
        filled:
          "h-14 rounded-t-md border-0 border-b border-b-input bg-muted/40 px-3 pt-6 pb-1 hover:bg-muted/55 focus-visible:border-b-ring focus-visible:bg-muted/50 aria-invalid:border-b-destructive",
      },
    },
    defaultVariants: {
      variant: "standard",
    },
  }
)

type InputProps = React.ComponentProps<"input"> &
  VariantProps<typeof inputVariants>

function Input({ className, type, variant, ...props }: InputProps) {
  const fieldVariant = useFieldVariant()
  // La variante se toma explícita del prop o, si no, de la del `Field`
  // contenedor. Fuera de un `Field` (o con `plain`) cae a `standard`.
  const resolvedVariant =
    variant ?? (fieldVariant === "plain" ? "standard" : fieldVariant)

  return (
    <InputPrimitive
      type={type}
      data-slot="input"
      className={cn(inputVariants({ variant: resolvedVariant }), className)}
      {...props}
    />
  )
}

export { Input, inputVariants }
