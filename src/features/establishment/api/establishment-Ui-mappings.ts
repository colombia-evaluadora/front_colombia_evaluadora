import type { EstablishmentStatus } from "./types/establishment"

type BadgeColor =
  | "primary"
  | "secondary"
  | "destructive"
  | "info"
  | "warning"
  | "success"

interface BadgeProps {
  variant: "soft"
  color: BadgeColor
}

export const ESTABLISHMENT_STATUS_LABELS: Record<
  EstablishmentStatus,
  string
> = {
  ACTIVE: "Activa",
  SUSPENDED: "Suspendido",
}

export const ESTABLISHMENT_STATUS_BADGE: Record<
  EstablishmentStatus,
  BadgeProps
> = {
  ACTIVE: {
    variant: "soft",
    color: "success",
  },
  SUSPENDED: {
    variant: "soft",
    color: "destructive",
  },
}