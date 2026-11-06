import type { ComponentProps } from "react"

import type { Badge } from "@/components/ui/badge"
import type { EstadoFuncionario } from "@/features/establishment/employees/api/types/funcionario"

/** Estado del funcionario en el establecimiento (Regla 101): no se edita, sale de sus roles. */
export const ESTADO_FUNCIONARIO_LABELS: Record<EstadoFuncionario, string> = {
  A: "Activo",
  I: "Inactivo",
}

export const ESTADO_FUNCIONARIO_OPTIONS = (Object.keys(ESTADO_FUNCIONARIO_LABELS) as EstadoFuncionario[]).map(
  (code) => ({ code, name: ESTADO_FUNCIONARIO_LABELS[code] }),
)

export const ESTADO_FUNCIONARIO_BADGE: Record<EstadoFuncionario, Pick<ComponentProps<typeof Badge>, "variant" | "color">> = {
  A: { variant: "soft", color: "success" },
  I: { variant: "soft", color: "muted" },
}
