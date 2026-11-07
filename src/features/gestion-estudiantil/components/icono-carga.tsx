import type { ReactNode } from "react"

import { SpinnerIcon } from "@/components/ui/icons"

/** Icono inicial de un botón: el spinner mientras la acción está en curso; si no, el icono propio. */
export function IconoCarga({ cargando, children }: { cargando: boolean; children?: ReactNode }) {
  return cargando ? <SpinnerIcon data-icon="inline-start" className="animate-spin" /> : children
}
