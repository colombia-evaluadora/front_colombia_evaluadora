import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const alertVariants = cva(
  "group/alert relative grid w-full gap-1 border bg-background px-4 py-3 text-left text-sm after:absolute after:-inset-y-px after:-left-px after:w-0.5 has-data-[slot=alert-action]:relative has-data-[slot=alert-action]:pr-18 has-[>svg]:grid-cols-[auto_1fr] has-[>svg]:gap-x-2.5 *:[svg]:row-span-2 *:[svg]:translate-y-0.5 *:[svg]:text-current *:[svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        // Sin variante: aviso informativo, con la misma forma que las demás (todas las alertas del
        // proyecto van en caja con borde y fondo suave, sin barra lateral).
        default:
          "rounded-md border-blue-stroke bg-blue-22 text-foreground after:hidden *:data-[slot=alert-description]:text-foreground *:[svg]:text-blue",
        // Error, advertencia e info comparten forma: caja con borde `-stroke`, fondo `-22`, esquinas
        // redondeadas, ícono del color y texto normal; sin la barra lateral.
        destructive:
          "rounded-md border-red-stroke bg-red-22 text-foreground after:hidden *:data-[slot=alert-description]:text-foreground *:[svg]:text-red",
        // Advertencia estática (no se cierra): misma familia que la variante
        // `warning` de NoticeBanner. El ícono lleva el color; el texto, el normal.
        warning:
          "rounded-md border-yellow-stroke bg-yellow-22 text-foreground after:hidden *:data-[slot=alert-description]:text-foreground *:[svg]:text-yellow",
        // Aviso informativo: caja azul suave con borde `blue-stroke`, ícono azul
        // y texto normal; sin la barra lateral. Es el mismo estilo de los avisos
        // "Registro único del período" de Periodos académicos.
        info: "rounded-md border-blue-stroke bg-blue-22 text-foreground after:hidden *:data-[slot=alert-description]:text-foreground *:[svg]:text-blue",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
)

function Alert({
  className,
  variant,
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof alertVariants>) {
  return (
    <div
      data-slot="alert"
      role="alert"
      className={cn(alertVariants({ variant }), className)}
      {...props}
    />
  )
}

function AlertTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-title"
      className={cn(
        "text-sm font-semibold group-has-[>svg]/alert:col-start-2 [&_a]:underline [&_a]:underline-offset-3 [&_a]:hover:text-foreground",
        className,
      )}
      {...props}
    />
  )
}

function AlertDescription({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-description"
      className={cn(
        "text-sm text-balance text-muted-foreground md:text-pretty [&_a]:underline [&_a]:underline-offset-3 [&_a]:hover:text-foreground [&_p:not(:last-child)]:mb-4",
        className,
      )}
      {...props}
    />
  )
}

function AlertAction({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-action"
      className={cn("absolute top-2.5 right-3", className)}
      {...props}
    />
  )
}

export { Alert, AlertTitle, AlertDescription, AlertAction }
