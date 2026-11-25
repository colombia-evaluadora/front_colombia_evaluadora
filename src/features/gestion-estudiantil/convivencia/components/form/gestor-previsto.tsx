import { LockIcon } from "@/components/ui/icons"

import type { GestorPrevisto as GestorPrevistoData } from "@/features/gestion-estudiantil/convivencia/api/types"

/** Gestor que el backend asignará al crear (por Sede y Jornada). */
export function GestorPrevisto({ previsto }: { previsto: GestorPrevistoData | undefined }) {
  if (!previsto) return null
  return (
    <p className="text-sm">
      {previsto.sin_gestor || !previsto.nombre ? (
        "Sin gestor: se avisará al Administrador del establecimiento."
      ) : (
        <>
          Gestor del caso: <span className="font-medium">{previsto.nombre}</span>{" "}
          <span className="text-muted-foreground">(asignado por Sede y Jornada)</span>
          <LockIcon aria-hidden="true" className="inline size-4 align-text-bottom text-muted-foreground" />
        </>
      )}
    </p>
  )
}
