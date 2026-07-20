import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

// Dos ejes independientes: `variant` es la forma (fill/soft/outline/ghost/link),
// `color` es el tono semántico. Mismo desacople que en Badge — evita simular
// combinaciones (ej. "outline" + tono destructivo) pisando className a mano.
// `ghost` y `link` ignoran `color` para algunos tonos secundarios, igual que en Badge.
//
// Sincronizado con Figma "Design Tokens — Tailwind Sync" (Button):
//   - 8 colores: Primary · Secondary · Muted · Neutral · Blue · Red · Yellow · Green
//   - 5 variantes: Solid (fill) · Soft · Outline · Ghost · Link
//   - 4 sizes: sm · md · lg · icon (en Figma); aquí conservamos también xs/icon-xs/icon-sm/icon-lg
const buttonVariants = cva(
  "group/button inline-flex shrink-0 cursor-pointer items-center justify-center rounded-none border border-transparent bg-clip-padding text-xs font-semibold tracking-widest whitespace-nowrap uppercase transition-all outline-none select-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 active:not-aria-[haspopup]:translate-y-px disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-2 aria-invalid:ring-destructive/20 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-3.5",
  {
    variants: {
      variant: {
        // Solid en Figma
        fill: "bg-primary text-primary-foreground",
        // Soft en Figma: bg-X-22 + border-X-stroke + texto del color
        soft: "",
        // Outline en Figma: border-X-stroke + texto del color (sin fondo)
        outline: "bg-transparent",
        // Ghost en Figma: solo texto del color, hover bg-X/10
        ghost: "bg-transparent",
        // Link en Figma: texto del color + underline
        link: "bg-transparent underline underline-offset-4 hover:underline",
      },
      color: {
        primary: "",
        secondary: "",
        muted: "",
        neutral: "",
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
      // ============ fill (Solid en Figma) ============
      {
        variant: "fill",
        color: "primary",
        class:
          "bg-primary text-primary-foreground hover:bg-primary/90 aria-expanded:bg-primary",
      },
      {
        variant: "fill",
        color: "secondary",
        class:
          "bg-secondary text-secondary-foreground hover:bg-[color-mix(in_oklch,var(--secondary),var(--foreground)_5%)] aria-expanded:bg-secondary aria-expanded:text-secondary-foreground",
      },
      {
        variant: "fill",
        color: "muted",
        class: "bg-muted text-muted-foreground hover:bg-muted/70 aria-expanded:bg-muted",
      },
      {
        variant: "fill",
        color: "neutral",
        class:
          "bg-foreground text-background hover:bg-foreground/90 aria-expanded:bg-foreground aria-expanded:text-background",
      },
      {
        variant: "fill",
        color: "info",
        class:
          "bg-info text-info-foreground hover:bg-info/90 aria-expanded:bg-info focus-visible:border-info/40 focus-visible:ring-info/20",
      },
      {
        variant: "fill",
        color: "destructive",
        class:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90 aria-expanded:bg-destructive focus-visible:border-destructive/40 focus-visible:ring-destructive/20",
      },
      {
        variant: "fill",
        color: "warning",
        class:
          "bg-warning text-warning-foreground hover:bg-warning/90 aria-expanded:bg-warning focus-visible:border-warning/40 focus-visible:ring-warning/20",
      },
      {
        variant: "fill",
        color: "success",
        class:
          "bg-success text-success-foreground hover:bg-success/90 aria-expanded:bg-success focus-visible:border-success/40 focus-visible:ring-success/20",
      },

      // ============ soft (Soft en Figma) ============
      {
        variant: "soft",
        color: "primary",
        class:
          "border-primary-stroke bg-primary-22 text-primary hover:bg-primary/20 aria-expanded:bg-primary/20 focus-visible:ring-primary/20",
      },
      {
        variant: "soft",
        color: "secondary",
        class:
          "border-secondary-stroke bg-secondary-22 text-secondary hover:bg-secondary/20 aria-expanded:bg-secondary/20 focus-visible:ring-ring/30",
      },
      {
        variant: "soft",
        color: "muted",
        class:
          // Figma usa bg-muted-stroke (alpha 30%) para Soft+Muted en Button;
          // difiere de Badge (que usa bg-muted-22). Se respeta la intención del diseño.
          "border-muted-stroke bg-muted-stroke text-muted-foreground hover:bg-muted/40 aria-expanded:bg-muted-stroke",
      },
      {
        variant: "soft",
        color: "neutral",
        class:
          "border-foreground-stroke bg-foreground-22 text-foreground hover:bg-foreground/20 aria-expanded:bg-foreground/20 focus-visible:ring-foreground/20",
      },
      {
        variant: "soft",
        color: "info",
        class:
          "border-info-stroke bg-info-22 text-info hover:bg-info/20 aria-expanded:bg-info/20 focus-visible:border-info/40 focus-visible:ring-info/20",
      },
      {
        variant: "soft",
        color: "destructive",
        class:
          "border-destructive-stroke bg-destructive-22 text-destructive hover:bg-destructive/20 aria-expanded:bg-destructive/20 focus-visible:border-destructive/40 focus-visible:ring-destructive/20",
      },
      {
        variant: "soft",
        color: "warning",
        class:
          "border-warning-stroke bg-warning-22 text-warning hover:bg-warning/20 aria-expanded:bg-warning/20 focus-visible:border-warning/40 focus-visible:ring-warning/20",
      },
      {
        variant: "soft",
        color: "success",
        class:
          "border-success-stroke bg-success-22 text-success hover:bg-success/20 aria-expanded:bg-success/20 focus-visible:border-success/40 focus-visible:ring-success/20",
      },

      // ============ outline (Outline en Figma) ============
      {
        variant: "outline",
        color: "primary",
        class:
          "border-primary-stroke text-primary hover:bg-primary/10 hover:text-primary aria-expanded:text-primary focus-visible:ring-primary/20",
      },
      {
        variant: "outline",
        color: "secondary",
        class:
          "border-secondary-stroke text-secondary hover:bg-secondary/10 aria-expanded:text-secondary focus-visible:ring-ring/30",
      },
      {
        variant: "outline",
        color: "muted",
        class:
          "border-border text-muted-foreground hover:bg-muted hover:text-muted-foreground aria-expanded:text-muted-foreground focus-visible:ring-ring/30",
      },
      {
        variant: "outline",
        color: "neutral",
        class:
          "border-foreground-stroke text-foreground hover:bg-foreground/10 aria-expanded:text-foreground focus-visible:ring-foreground/20",
      },
      {
        variant: "outline",
        color: "info",
        class:
          "border-info-stroke text-info hover:bg-info/10 aria-expanded:text-info focus-visible:ring-info/20",
      },
      {
        variant: "outline",
        color: "destructive",
        class:
          "border-destructive-stroke text-destructive hover:bg-destructive/10 aria-expanded:text-destructive focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40",
      },
      {
        variant: "outline",
        color: "warning",
        class:
          "border-warning-stroke text-warning hover:bg-warning/10 aria-expanded:text-warning focus-visible:ring-warning/20",
      },
      {
        variant: "outline",
        color: "success",
        class:
          "border-success-stroke text-success hover:bg-success/10 aria-expanded:text-success focus-visible:ring-success/20",
      },

      // ============ ghost (Ghost en Figma) ============
      {
        variant: "ghost",
        color: "primary",
        class: "text-primary hover:bg-primary/10 aria-expanded:bg-primary/10",
      },
      {
        variant: "ghost",
        color: "secondary",
        class: "text-secondary hover:bg-secondary/10 aria-expanded:bg-secondary/10",
      },
      {
        variant: "ghost",
        color: "muted",
        class:
          "text-muted-foreground hover:bg-muted hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground",
      },
      {
        variant: "ghost",
        color: "neutral",
        class:
          "text-foreground hover:bg-foreground/10 aria-expanded:bg-foreground/10",
      },
      {
        variant: "ghost",
        color: "info",
        class: "text-info hover:bg-info/10 aria-expanded:bg-info/10",
      },
      {
        variant: "ghost",
        color: "destructive",
        class:
          "text-destructive hover:bg-destructive/10 aria-expanded:bg-destructive/10",
      },
      {
        variant: "ghost",
        color: "warning",
        class: "text-warning hover:bg-warning/10 aria-expanded:bg-warning/10",
      },
      {
        variant: "ghost",
        color: "success",
        class: "text-success hover:bg-success/10 aria-expanded:bg-success/10",
      },

      // ============ link (Link en Figma) ============
      {
        variant: "link",
        color: "primary",
        class: "text-primary",
      },
      {
        variant: "link",
        color: "secondary",
        class: "text-secondary",
      },
      {
        variant: "link",
        color: "muted",
        class: "text-muted-foreground",
      },
      {
        variant: "link",
        color: "neutral",
        class: "text-foreground",
      },
      {
        variant: "link",
        color: "info",
        class: "text-info",
      },
      {
        variant: "link",
        color: "destructive",
        class: "text-destructive",
      },
      {
        variant: "link",
        color: "warning",
        class: "text-warning",
      },
      {
        variant: "link",
        color: "success",
        class: "text-success",
      },
    ],
    defaultVariants: {
      variant: "fill",
      color: "primary",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "fill",
  color = "primary",
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