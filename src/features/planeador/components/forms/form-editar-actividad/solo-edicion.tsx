import type { ReactNode } from "react"
import { useSoloLecturaActividad } from "@/features/planeador/components/forms/form-editar-actividad/context"

export function SoloEdicion({ children }: { children: ReactNode }) {
  return useSoloLecturaActividad() ? null : <>{children}</>
}
