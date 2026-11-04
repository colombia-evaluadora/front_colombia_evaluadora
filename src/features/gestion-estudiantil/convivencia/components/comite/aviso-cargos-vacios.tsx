import { Alert, AlertDescription } from "@/components/ui/alert"
import { WarningIcon } from "@/components/ui/icons"

import type { CargoVacio } from "@/features/gestion-estudiantil/convivencia/api/comite-types"

/** Los cargos del Comité que aún no tienen a nadie (Regla 11). */
export function AvisoCargosVacios({ cargos, accion }: { cargos: Pick<CargoVacio, "cargo_nombre">[]; accion?: string }) {
  if (cargos.length === 0) return null
  return (
    <Alert variant="warning">
      <WarningIcon aria-hidden="true" />
      <AlertDescription>
        {cargos.length === 1 ? "Falta un integrante para el cargo" : "Faltan integrantes para los cargos"}{" "}
        {cargos.map((c) => c.cargo_nombre).join(", ")}.{accion ? ` ${accion}` : ""}
      </AlertDescription>
    </Alert>
  )
}
