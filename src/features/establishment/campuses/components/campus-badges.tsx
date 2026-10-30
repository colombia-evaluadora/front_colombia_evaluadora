import { Badge } from "@/components/ui/badge"

import type { CampusStatus } from "@/features/establishment/campuses/api/types/campus"

/** Activo / Inactivo de una sede o de una especialidad de su catálogo. */
export function CampusStatusBadge({ status }: { status: CampusStatus }) {
  return status === "A" ? (
    <Badge variant="soft" color="success" className="border border-current/30">
      <span aria-hidden className="size-1.5 rounded-full bg-current" />
      Activo
    </Badge>
  ) : (
    <Badge variant="outline" color="neutral">
      <span aria-hidden className="size-1.5 rounded-full bg-current" />
      Inactivo
    </Badge>
  )
}

/** Marca de la sede de consecutivo 1 (Regla 91). */
export function PrincipalBadge() {
  return (
    <Badge variant="outline" color="neutral" className="shrink-0">
      Sede principal
    </Badge>
  )
}
