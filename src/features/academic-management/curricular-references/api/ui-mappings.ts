type BadgeColor = "success" | "destructive"

interface BadgeProps {
  variant: "soft"
  color: BadgeColor
}

export function curricularReferenceStatusBadge(active: boolean): BadgeProps {
  return { variant: "soft", color: active ? "success" : "destructive" }
}

export function curricularReferenceStatusLabel(active: boolean): string {
  return active ? "Activo" : "Inactivo"
}

/**
 * Vigencia que se muestra debajo del badge de estado, como hasta 2 líneas
 * (`from` arriba, `to` abajo):
 * - Activo: `from` = "Desde <año de alta>", sin `to`.
 * - Inactivo que llegó a estar activo: `from` = "Desde <alta>", `to` =
 *   "Hasta <año en que se desactivó>".
 * - Inactivo que nació así y nunca se activó (sin `deactivatedYear`): solo
 *   el año de alta en `from`, sin "Desde"/`to`.
 */
export interface CurricularReferenceStatusPeriod {
  from: string
  to: string | null
}

export function curricularReferenceStatusPeriod(reference: {
  active: boolean
  createdYear: number
  deactivatedYear: number | null
}): CurricularReferenceStatusPeriod {
  if (reference.active) return { from: `Desde ${reference.createdYear}`, to: null }
  if (reference.deactivatedYear) {
    return { from: `Desde ${reference.createdYear}`, to: `Hasta ${reference.deactivatedYear}` }
  }
  return { from: `${reference.createdYear}`, to: null }
}
