export function toSentenceCase(value: string): string {
  const lower = value.toLowerCase()
  return lower.charAt(0).toUpperCase() + lower.slice(1)
}

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
