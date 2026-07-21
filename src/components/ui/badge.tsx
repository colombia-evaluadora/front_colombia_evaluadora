import { mergeProps } from "@base-ui/react/merge-props"
import { useRender } from "@base-ui/react/use-render"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

// Dos ejes independientes: `variant` es la forma (fill/soft/outline),
// `color` es el tono semántico. Antes vivían mezclados en un solo enum
// ("destructive", "outline", "secondary"...), lo que obligaba a simular
// combinaciones (ej. "outline" + color destructivo) pisando className a mano.
//
// Sincronizado con Figma "Design Tokens — Tailwind Sync" (Badge):
//   - 8 colores: Primary · Secondary · Muted · Neutral · Blue · Red · Yellow · Green
//   - 3 variantes: Solid (fill) · Soft · Outline
// Los nombres `fill / outline` se conservan por compatibilidad con la API
// existente; `fill` ⇄ Solid y `outline` ⇄ Outline del Figma.
const badgeVariants = cva(
  "group/badge inline-flex w-fit shrink-0 items-center justify-center gap-1 overflow-hidden border border-transparent px-2 py-0.5 text-[0.625rem] font-semibold tracking-widest whitespace-nowrap uppercase transition-colors focus-visible:border-ring focus-visible:ring-[3px] aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 [&>svg]:pointer-events-none [&>svg]:size-3!",
  {
    variants: {
      variant: {
        // Solid en Figma
        fill: "",
        // Soft en Figma: bg-X-22 + border-X-stroke (alpha 30%) + texto del color
        soft: "",
        // Outline en Figma: border-X-stroke + texto del color (sin fondo)
        outline: "",
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
    },
    compoundVariants: [
      // ============ fill (Solid en Figma) ============
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
        color: "neutral",
        class: "bg-foreground text-background [a]:hover:bg-foreground/80 focus-visible:ring-ring/50",
      },
      {
        variant: "fill",
        color: "destructive",
        class:
          "bg-destructive text-destructive-foreground [a]:hover:bg-destructive/80 focus-visible:ring-destructive/20",
      },
      {
        variant: "fill",
        color: "info",
        class:
          "bg-info text-info-foreground [a]:hover:bg-info/80 focus-visible:ring-info/20",
      },
      {
        variant: "fill",
        color: "warning",
        class:
          "bg-warning text-warning-foreground [a]:hover:bg-warning/80 focus-visible:ring-warning/20",
      },
      {
        variant: "fill",
        color: "success",
        class:
          "bg-success text-success-foreground [a]:hover:bg-success/80 focus-visible:ring-success/20",
      },

      // ============ soft (Soft en Figma) ============
      {
        variant: "soft",
        color: "primary",
        class: "border-primary-stroke bg-primary-22 text-primary [a]:hover:bg-primary/30 focus-visible:ring-primary/20",
      },
      {
        variant: "soft",
        color: "secondary",
        class: "border-secondary-stroke bg-secondary-22 text-secondary [a]:hover:bg-secondary/30 focus-visible:ring-ring/30",
      },
      {
        variant: "soft",
        color: "muted",
        class: "border-muted-stroke bg-muted-22 text-muted-foreground [a]:hover:bg-muted/40 focus-visible:ring-ring/30",
      },
      {
        variant: "soft",
        color: "neutral",
        class: "border-foreground-stroke bg-foreground-22 text-foreground [a]:hover:bg-foreground/30 focus-visible:ring-foreground/20",
      },
      {
        variant: "soft",
        color: "destructive",
        class: "border-destructive-stroke bg-destructive-22 text-destructive [a]:hover:bg-destructive/30 focus-visible:ring-destructive/20",
      },
      {
        variant: "soft",
        color: "info",
        class: "border-info-stroke bg-info-22 text-info [a]:hover:bg-info/30 focus-visible:ring-info/20",
      },
      {
        variant: "soft",
        color: "warning",
        class: "border-warning-stroke bg-warning-22 text-warning [a]:hover:bg-warning/30 focus-visible:ring-warning/20",
      },
      {
        variant: "soft",
        color: "success",
        class: "border-success-stroke bg-success-22 text-success [a]:hover:bg-success/30 focus-visible:ring-success/20",
      },

      // ============ outline (Outline en Figma) ============
      {
        variant: "outline",
        color: "primary",
        class: "border-primary-stroke text-primary [a]:hover:bg-primary/10 focus-visible:ring-primary/20",
      },
      {
        variant: "outline",
        color: "muted",
        class: "border-border text-muted-foreground [a]:hover:bg-muted hover:text-foreground focus-visible:ring-ring/50",
      },
      {
        variant: "outline",
        color: "secondary",
        class: "border-secondary-stroke text-secondary [a]:hover:bg-secondary/10 focus-visible:ring-ring/30",
      },
      {
        variant: "outline",
        color: "neutral",
        class: "border-foreground-stroke text-foreground [a]:hover:bg-foreground/10 focus-visible:ring-foreground/20",
      },
      {
        variant: "outline",
        color: "destructive",
        class:
          "border-destructive-stroke text-destructive [a]:hover:bg-destructive/10 focus-visible:ring-destructive/20",
      },
      {
        variant: "outline",
        color: "info",
        class: "border-info-stroke text-info [a]:hover:bg-info/10 focus-visible:ring-info/20",
      },
      {
        variant: "outline",
        color: "warning",
        class: "border-warning-stroke text-warning [a]:hover:bg-warning/10 focus-visible:ring-warning/20",
      },
      {
        variant: "outline",
        color: "success",
        class: "border-success-stroke text-success [a]:hover:bg-success/10 focus-visible:ring-success/20",
      },
    ],
    defaultVariants: {
      variant: "fill",
      color: "primary",
    },
  }
)

/**
 * Etiqueta compacta para representar estado, categoría o conteo.
 *
 * Combina `variant` (forma: fill / soft / outline) con `color` (tono
 * semántico: 8 colores) para dar 24 combinaciones sincronizadas con
 * Figma "Design Tokens — Tailwind Sync".
 *
 * Construido sobre `@base-ui/react/use-render` — soporta `render` para
 * montar como `<a>`, `<button>`, etc. preservando accesibilidad.
 *
 * @example
 *   <Badge variant="soft" color="success">Activo</Badge>
 *   <Badge variant="outline" color="warning">Pendiente</Badge>
 *   <Badge render={<a href="?status=draft" />}>Borrador</Badge>
 */
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