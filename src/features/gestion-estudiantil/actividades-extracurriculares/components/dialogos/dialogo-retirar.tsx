import { useNotify } from "@/components/notice/notice-context"
import { PersonRemoveIcon } from "@/components/ui/icons"

import { DialogoOperacionShell } from "@/features/gestion-estudiantil/commons/components/dialogo-operacion-shell"
import { useEstadoDialogo } from "@/features/gestion-estudiantil/commons/hooks/use-estado-dialogo"
import { formatFecha } from "@/features/gestion-estudiantil/commons/utils/formatos"
import { useRetirarParticipante } from "@/features/gestion-estudiantil/actividades-extracurriculares/api/mutations/actividades"
import type { ParticipanteRow } from "@/features/gestion-estudiantil/actividades-extracurriculares/api/types"
import { avisarExito } from "@/features/gestion-estudiantil/actividades-extracurriculares/utils/avisos"

interface Props {
  actividadNombre: string
  participante: ParticipanteRow
  onClose: () => void
}

/** Retirar a [Estudiante] (§6.2): confirma con la actividad, el grado/grupo y la fecha de inscripción. */
export function DialogoRetirar({ actividadNombre, participante: p, onClose }: Props) {
  const { notify } = useNotify()
  const s = useEstadoDialogo()
  const mut = useRetirarParticipante({
    mutationConfig: {
      onSuccess: () => {
        avisarExito(notify, "Participante retirado.")
        onClose()
      },
      onError: (e: Error) => s.setError(e),
    },
  })

  return (
    <DialogoOperacionShell
      titulo={`Retirar a ${p.estudiante_nombre}`}
      resumen={
        <div className="flex flex-col gap-1 text-sm">
          <span>Actividad: {actividadNombre}</span>
          <span>Grado/Grupo: {p.grado_grupo}</span>
          <span>Fecha de inscripción: {formatFecha(p.fecha_inscripcion)}</span>
        </div>
      }
      onClose={onClose}
      error={s.error}
      pending={mut.isPending}
      confirmar={{
        label: "Retirar",
        icon: <PersonRemoveIcon data-icon="inline-start" />,
        color: "destructive",
        onClick: () => {
          s.setError(null)
          mut.mutate({ id: p.id })
        },
      }}
    >
      <p className="text-sm">
        Se retirará a {p.estudiante_nombre} de la actividad {actividadNombre} y quedará libre su lugar en el cupo.
      </p>
    </DialogoOperacionShell>
  )
}
