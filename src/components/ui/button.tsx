import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

// Dos ejes independientes: `variant` es la forma (fill/outline/ghost/link),
// `color` es el tono semántico. Mismo desacople que en Badge — evita simular
// combinaciones (ej. "outline" + tono destructivo) pisando className a mano.
// `ghost` y `link` ignoran `color`, igual que en Badge.
const buttonVariants = cva(
  "group/button inline-flex shrink-0 cursor-pointer items-center justify-center rounded-none border border-transparent bg-clip-padding text-xs font-semibold tracking-widest whitespace-nowrap uppercase transition-all outline-none select-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 active:not-aria-[haspopup]:translate-y-px disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-2 aria-invalid:ring-destructive/20 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-3.5",
  {
    variants: {
      variant: {
        fill: "bg-primary text-primary-foreground hover:bg-primary/80",
        soft: "",
        outline:
          "border-primary bg-transparent hover:bg-muted aria-expanded:bg-muted dark:hover:bg-input/30",
        ghost:
          "hover:bg-muted aria-expanded:bg-muted dark:hover:bg-muted/50",
        link: "text-primary underline underline-offset-4 hover:underline",
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
      size: {
        default:
          "h-10 gap-1.5 px-6 has-data-[icon=inline-end]:pr-4 has-data-[icon=inline-start]:pl-4",
        xs: "h-7 gap-1 px-3 has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2 [&_svg:not([class*='size-'])]:size-3",
        sm: "h-9 gap-1 px-4 has-data-[icon=inline-end]:pr-3 has-data-[icon=inline-start]:pl-3",
        lg: "h-11 gap-1.5 px-8 has-data-[icon=inline-end]:pr-5 has-data-[icon=inline-start]:pl-5",
        icon: "size-10",
        "icon-xs": "size-7 [&_svg:not([class*='size-'])]:size-3",
        "icon-sm": "size-9",
        "icon-lg": "size-11",
      },
    },
    compoundVariants: [
      {
        variant: "fill",
        color: "secondary",
        class:
          "bg-secondary text-secondary-foreground hover:bg-[color-mix(in_oklch,var(--secondary),var(--foreground)_5%)] aria-expanded:bg-secondary aria-expanded:text-secondary-foreground",
      },
      {
        variant: "fill",
        color: "muted",
        class: "bg-muted text-muted-foreground hover:bg-muted/70",
      },
      {
        variant: "fill",
        color: "destructive",
        class:
          "bg-destructive/10 text-destructive hover:bg-destructive/20 focus-visible:border-destructive/40 focus-visible:ring-destructive/20 dark:bg-destructive/20 dark:hover:bg-destructive/30 dark:focus-visible:ring-destructive/40",
      },
      {
        variant: "fill",
        color: "info",
        class:
          "bg-info/10 text-info hover:bg-info/20 focus-visible:border-info/40 focus-visible:ring-info/20 dark:bg-info/20 dark:hover:bg-info/30 dark:focus-visible:ring-info/40",
      },
      {
        variant: "fill",
        color: "warning",
        class:
          "bg-warning/10 text-warning hover:bg-warning/20 focus-visible:border-warning/40 focus-visible:ring-warning/20 dark:bg-warning/20 dark:hover:bg-warning/30 dark:focus-visible:ring-warning/40",
      },
      {
        variant: "fill",
        color: "success",
        class:
          "bg-success/10 text-success hover:bg-success/20 focus-visible:border-success/40 focus-visible:ring-success/20 dark:bg-success/20 dark:hover:bg-success/30 dark:focus-visible:ring-success/40",
      },
      {
        variant: "soft",
        color: "primary",
        class:
          "border-primary/30 bg-primary/10 text-primary hover:bg-primary/20 aria-expanded:bg-primary/20 focus-visible:ring-primary/20",
      },
      {
        variant: "soft",
        color: "secondary",
        class:
          "border-secondary/30 bg-secondary/10 text-secondary-foreground hover:bg-secondary/20 aria-expanded:bg-secondary/20 focus-visible:ring-ring/30",
      },
      {
        variant: "soft",
        color: "muted",
        class:
          "border-border bg-muted text-muted-foreground hover:bg-muted/70 aria-expanded:bg-muted/70 focus-visible:ring-ring/30",
      },
      {
        variant: "soft",
        color: "destructive",
        class:
          "border-destructive/30 bg-destructive/10 text-destructive hover:bg-destructive/20 aria-expanded:bg-destructive/20 focus-visible:border-destructive/40 focus-visible:ring-destructive/20 dark:bg-destructive/20 dark:hover:bg-destructive/30 dark:focus-visible:ring-destructive/40",
      },
      {
        variant: "soft",
        color: "info",
        class:
          "border-info/30 bg-info/10 text-info hover:bg-info/20 aria-expanded:bg-info/20 focus-visible:border-info/40 focus-visible:ring-info/20 dark:bg-info/20 dark:hover:bg-info/30 dark:focus-visible:ring-info/40",
      },
      {
        variant: "soft",
        color: "warning",
        class:
          "border-warning/30 bg-warning/10 text-warning hover:bg-warning/20 aria-expanded:bg-warning/20 focus-visible:border-warning/40 focus-visible:ring-warning/20 dark:bg-warning/20 dark:hover:bg-warning/30 dark:focus-visible:ring-warning/40",
      },
      {
        variant: "soft",
        color: "success",
        class:
          "border-success/30 bg-success/10 text-success hover:bg-success/20 aria-expanded:bg-success/20 focus-visible:border-success/40 focus-visible:ring-success/20 dark:bg-success/20 dark:hover:bg-success/30 dark:focus-visible:ring-success/40",
      },
      {
        variant: "outline",
        color: "muted",
        class:
          "border-border text-muted-foreground hover:bg-muted hover:text-muted-foreground aria-expanded:text-muted-foreground focus-visible:ring-ring/30",
      },
      {
        variant: "outline",
        color: "primary",
        class:
          "border-primary text-primary hover:bg-primary/10 hover:text-primary aria-expanded:text-primary focus-visible:ring-primary/20",
      },
      {
        variant: "outline",
        color: "destructive",
        class:
          "border-destructive/30 text-destructive hover:bg-destructive/10 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40",
      },
      {
        variant: "outline",
        color: "info",
        class: "border-info/30 text-info hover:bg-info/10 focus-visible:ring-info/20",
      },
      {
        variant: "outline",
        color: "warning",
        class:
          "border-warning/30 text-warning hover:bg-warning/10 focus-visible:ring-warning/20",
      },
      {
        variant: "outline",
        color: "success",
        class:
          "border-success/30 text-success hover:bg-success/10 focus-visible:ring-success/20",
      },
    ],
    defaultVariants: {
      variant: "fill",
      color: "secondary",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "fill",
  color = "muted",
  size = "default",
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, color, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
