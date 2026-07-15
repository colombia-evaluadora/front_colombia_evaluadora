import { mergeProps } from "@base-ui/react/merge-props"
import { useRender } from "@base-ui/react/use-render"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

// Dos ejes independientes: `variant` es la forma (fill/outline/ghost/link),
// `color` es el tono semántico. Antes vivían mezclados en un solo enum
// ("destructive", "outline", "secondary"...), lo que obligaba a simular
// combinaciones (ej. "outline" + color destructivo) pisando className a mano.
const badgeVariants = cva(
  "group/badge inline-flex w-fit shrink-0 items-center justify-center gap-1 overflow-hidden border border-transparent px-2 py-0.5 text-[0.625rem] font-semibold tracking-widest whitespace-nowrap uppercase transition-colors focus-visible:border-ring focus-visible:ring-[3px] aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 [&>svg]:pointer-events-none [&>svg]:size-3!",
  {
    variants: {
      variant: {
        fill: "",
        outline: "",
        ghost: "border-transparent bg-transparent text-muted-foreground hover:bg-muted hover:text-foreground",
        link: "border-transparent bg-transparent px-0 py-0 text-foreground underline-offset-4 hover:underline",
      },
      color: {
        primary: "",
        secondary: "",
        muted: "",
        destructive: "",
        info: "",
        warning: "",
        success: "",
      },
    },
    compoundVariants: [
      {
        variant: "fill",
        color: "primary",
        class: "bg-primary text-primary-foreground [a]:hover:bg-primary/80 focus-visible:ring-ring/50",
      },
      {
        variant: "fill",
        color: "muted",
        class: "bg-muted text-muted-foreground [a]:hover:bg-muted/70 focus-visible:ring-ring/50",
      },
      {
        variant: "fill",
        color: "secondary",
        class:
          "bg-secondary text-secondary-foreground [a]:hover:bg-[color-mix(in_oklch,var(--secondary),var(--foreground)_5%)] focus-visible:ring-ring/50",
      },
      {
        variant: "fill",
        color: "destructive",
        class:
          "bg-destructive/10 text-destructive dark:bg-destructive/20 [a]:hover:bg-destructive/20 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40",
      },
      {
        variant: "fill",
        color: "info",
        class: "bg-info/10 text-info dark:bg-info/20 [a]:hover:bg-info/20 focus-visible:ring-info/20",
      },
      {
        variant: "fill",
        color: "warning",
        class: "bg-warning/10 text-warning dark:bg-warning/20 [a]:hover:bg-warning/20 focus-visible:ring-warning/20",
      },
      {
        variant: "fill",
        color: "success",
        class: "bg-success/10 text-success dark:bg-success/20 [a]:hover:bg-success/20 focus-visible:ring-success/20",
      },
      {
        variant: "outline",
        color: "primary",
        class: "border-primary/30 text-primary [a]:hover:bg-primary/10 focus-visible:ring-ring/50",
      },
      {
        variant: "outline",
        color: "muted",
        class: "border-border text-muted-foreground [a]:hover:bg-muted focus-visible:ring-ring/50",
      },
      {
        variant: "outline",
        color: "secondary",
        class: "border-border text-foreground [a]:hover:bg-muted focus-visible:ring-ring/50",
      },
      {
        variant: "outline",
        color: "destructive",
        class:
          "border-destructive/30 text-destructive [a]:hover:bg-destructive/10 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40",
      },
      {
        variant: "outline",
        color: "info",
        class: "border-info/30 text-info [a]:hover:bg-info/10 focus-visible:ring-info/20",
      },
      {
        variant: "outline",
        color: "warning",
        class: "border-warning/30 text-warning [a]:hover:bg-warning/10 focus-visible:ring-warning/20",
      },
      {
        variant: "outline",
        color: "success",
        class: "border-success/30 text-success [a]:hover:bg-success/10 focus-visible:ring-success/20",
      },
    ],
    defaultVariants: {
      variant: "fill",
      color: "primary",
    },
  }
)

function Badge({
  className,
  variant = "fill",
  color = "primary",
  render,
  ...props
}: useRender.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return useRender({
    defaultTagName: "span",
    props: mergeProps<"span">(
      {
        className: cn(badgeVariants({ variant, color }), className),
      },
      props
    ),
    render,
    state: {
      slot: "badge",
      variant,
      color,
    },
  })
}

export { Badge, badgeVariants }
