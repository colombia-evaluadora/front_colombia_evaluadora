import type { ReactNode } from "react"

import { cn } from "@/lib/utils"

type HeadingLevel = "h1" | "h2" | "h3" | "h4" | "h5" | "h6"

interface FormSectionHeadingProps {
  /** Texto del encabezado. */
  children: ReactNode
  /** Nivel de heading. Por defecto `h3` (subsección dentro de un formulario). */
  as?: HeadingLevel
  /** Clases extra para ajustar márgenes o color en un contexto particular. */
  className?: string
  /** Identificador opcional, útil para `aria-labelledby` o anclas. */
  id?: string
}

// Encabezado plano (`text-base font-semibold`) usado como título de una
// subsección dentro de un formulario. Sigue la jerarquía de headings del
// documento: las páginas ya exponen un `<h1>`/`<h2>` (vía `CardTitle`),
// así que estas subsecciones son típicamente `<h3>`. Mantenemos la
// apariencia actual — sin uppercase, sin `text-muted-foreground` — para
// no romper el contraste visual ya establecido en los formularios.
export function FormSectionHeading({
  children,
  as: Component = "h3",
  className,
  id,
}: FormSectionHeadingProps) {
  return (
    <Component
      id={id}
      className={cn("text-base font-semibold", className)}
    >
      {children}
    </Component>
  )
}