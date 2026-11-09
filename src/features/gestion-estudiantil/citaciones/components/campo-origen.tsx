import { Field, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"

import type { OrigenManual } from "@/features/gestion-estudiantil/citaciones/api/types"
import { origenEnlace } from "@/features/gestion-estudiantil/citaciones/api/ui-mappings"

/** «Registro de origen» de solo lectura (§4.1/§4.2): anotación o caso de convivencia que dio pie al alta. */
export function CampoOrigen({ id, origen }: { id: string; origen: OrigenManual }) {
  return (
    <Field orientation="vertical" variant="outlined" className="gap-2">
      <FieldLabel htmlFor={id}>Registro de origen</FieldLabel>
      <Input id={id} readOnly value={origenEnlace(origen.tipo, origen.id)?.texto ?? ""} />
    </Field>
  )
}
