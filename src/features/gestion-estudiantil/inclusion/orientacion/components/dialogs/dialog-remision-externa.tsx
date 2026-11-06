import { useRemisionExterna } from "@/features/gestion-estudiantil/inclusion/orientacion/api/mutations/atenciones"
import { texto } from "@/features/gestion-estudiantil/inclusion/piar/components/dialogos/tipos"
import { FormDialogPiar } from "@/features/gestion-estudiantil/inclusion/piar/components/form-dialog-piar"

interface Props {
  atencionId: number
  entidades: { value: string; label: string }[]
  onClose: () => void
}

/** Remisión externa de una atención ya guardada, con sus soportes. */
export function DialogRemisionExterna({ atencionId, entidades, onClose }: Props) {
  const guardar = useRemisionExterna(atencionId)
  return (
    <FormDialogPiar
      abierto
      onClose={onClose}
      titulo="Registrar remisión externa"
      confirmar="Registrar"
      archivos={{ label: "Soportes", max: 3, ayuda: "Opcional · PDF, JPG o PNG, máximo 10 MB cada uno" }}
      campos={[
        { name: "entidad", label: "Entidad", kind: "select", required: true, options: entidades },
        { name: "fecha", label: "Fecha", kind: "fecha", required: true },
        texto("motivo", "Motivo", 1000, { required: true, min: 10 }),
        texto("respuesta", "Respuesta", 2000),
        { name: "fecha_respuesta", label: "Fecha de respuesta", kind: "fecha" },
      ]}
      onSubmit={(v, archivos) =>
        guardar.mutateAsync({
          REMISION_EXTERNA: null,
          FK_ENTIDAD: Number(v.entidad),
          MOTIVO: v.motivo,
          FECHA: v.fecha,
          RESPUESTA: v.respuesta || null,
          FECHA_RESPUESTA: v.fecha_respuesta || null,
          SOPORTES: archivos,
        })
      }
    />
  )
}
