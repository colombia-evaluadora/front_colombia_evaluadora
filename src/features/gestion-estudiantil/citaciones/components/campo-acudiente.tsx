import { Field, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"

import { useAcudienteQuery } from "@/features/gestion-estudiantil/citaciones/api/query/use-citaciones-query"

/** «Acudiente» de solo lectura, el de la matrícula elegida (G.3.CIT.4). */
export function CampoAcudiente({ id, matricula }: { id: string; matricula: string }) {
  const { data, isPending } = useAcudienteQuery(matricula ? Number(matricula) : null)
  const texto = !matricula || isPending ? "" : (data?.acudiente_nombre ?? "Sin acudiente registrado")
  return (
    <Field orientation="vertical" variant="outlined" className="gap-2">
      <FieldLabel htmlFor={id}>Acudiente</FieldLabel>
      <Input id={id} readOnly value={texto} placeholder="Según la matrícula" />
    </Field>
  )
}
