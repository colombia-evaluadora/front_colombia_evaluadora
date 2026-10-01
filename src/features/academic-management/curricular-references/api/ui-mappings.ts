export { toSentenceCase } from "@/lib/utils"

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

/** Fecha corta es-CO de un timestamp del backend; "" si no hay o no parsea. */
export function formatLastModifiedDate(value: string | null | undefined): string {
  if (!value) return ""
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ""
  return date.toLocaleDateString("es-CO", { day: "2-digit", month: "short", year: "numeric" })
}
