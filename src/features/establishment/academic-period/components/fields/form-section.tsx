import type { ReactNode } from "react"

import { SeccionPlegable } from "@/components/seccion-plegable"

// Sección colapsable de los formularios del período: la variante `tarjeta` de `SeccionPlegable`
// (`keepMounted`, para que los campos sigan registrados y validándose aunque esté cerrada).
export function FormSection({
  title,
  defaultOpen = true,
  children,
}: {
  title: string
  defaultOpen?: boolean
  children: ReactNode
}) {
  return (
    <SeccionPlegable variante="tarjeta" titulo={title} defaultAbierto={defaultOpen}>
      {children}
    </SeccionPlegable>
  )
}
