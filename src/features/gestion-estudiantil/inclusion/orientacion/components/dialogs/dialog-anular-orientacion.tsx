import { useAnularAtencion, useAnularRemision } from "@/features/gestion-estudiantil/inclusion/orientacion/api/mutations/atenciones"
import { texto } from "@/features/gestion-estudiantil/inclusion/piar/components/dialogos/tipos"
import { FormDialogPiar } from "@/features/gestion-estudiantil/inclusion/piar/components/form-dialog-piar"

export interface AnulacionOrientacion {
  tipo: "remision" | "atencion"
  id: number
  estudiante: string
}

/** Regla 3: no se borra; queda anulada con su motivo. Solo coordinador y rector (V602). */
export function DialogAnularOrientacion({ objetivo, onClose }: { objetivo: AnulacionOrientacion; onClose: () => void }) {
  const remision = useAnularRemision()
  const atencion = useAnularAtencion()
  const anular = objetivo.tipo === "remision" ? remision : atencion
  return (
    <FormDialogPiar
      abierto
      onClose={onClose}
      titulo={`Anular ${objetivo.tipo === "remision" ? "remisión" : "atención"} — ${objetivo.estudiante}`}
      confirmar="Anular"
      confirmarColor="destructive"
      campos={[texto("motivo", "Motivo", 1000, { required: true, min: 10 })]}
      onSubmit={(v) => anular.mutateAsync({ id: objetivo.id, motivo: v.motivo })}
    />
  )
}
