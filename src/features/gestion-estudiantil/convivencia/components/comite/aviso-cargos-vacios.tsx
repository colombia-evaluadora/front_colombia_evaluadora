import { Alert, AlertDescription } from "@/components/ui/alert"
import { WarningIcon } from "@/components/ui/icons"

import type { CargoVacio } from "@/features/gestion-estudiantil/convivencia/api/comite-types"

/** «A», «A y B», «A, B y C». */
const listaY = (n: string[]) => (n.length > 1 ? `${n.slice(0, -1).join(", ")} y ${n[n.length - 1]}` : n.join(""))

/** Los cargos del Comité que aún no tienen a nadie (Regla 11). */
export function AvisoCargosVacios({ cargos, accion }: { cargos: Pick<CargoVacio, "cargo_nombre">[]; accion?: string }) {
  if (cargos.length === 0) return null
  return (
    <Alert variant="warning">
      <WarningIcon aria-hidden="true" />
      <AlertDescription>
        {cargos.length === 1 ? "Cargo sin integrante" : "Cargos sin integrante"}: {listaY(cargos.map((c) => c.cargo_nombre))}.
        {accion ? ` ${accion}` : ""}
      </AlertDescription>
    </Alert>
  )
}
