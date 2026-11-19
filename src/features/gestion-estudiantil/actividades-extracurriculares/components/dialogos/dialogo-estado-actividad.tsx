import { useNotify } from "@/components/notice/notice-context"
import { Badge } from "@/components/ui/badge"
import { CheckCircleIcon, ProhibitIcon } from "@/components/ui/icons"

import { DialogoOperacionShell } from "@/features/gestion-estudiantil/commons/components/dialogo-operacion-shell"
import { useEstadoDialogo } from "@/features/gestion-estudiantil/commons/hooks/use-estado-dialogo"
import { abreviarPersona } from "@/features/gestion-estudiantil/commons/utils/formatos"
import { useCambiarEstadoActividad } from "@/features/gestion-estudiantil/actividades-extracurriculares/api/mutations/actividades"
import type { ActividadResumen } from "@/features/gestion-estudiantil/actividades-extracurriculares/api/types"
import { ESTADO_ACTIVIDAD_COLOR } from "@/features/gestion-estudiantil/actividades-extracurriculares/api/ui-mappings"
import { avisarExito } from "@/features/gestion-estudiantil/actividades-extracurriculares/utils/avisos"

/** Inactivar [Actividad] (con sus datos y el texto de la especificación) o Activar (confirmación simple). */
export function DialogoEstadoActividad({ actividad: a, onClose }: { actividad: ActividadResumen; onClose: () => void }) {
  const { notify } = useNotify()
  const s = useEstadoDialogo()
  const inactivar = a.esta_activa
  const mut = useCambiarEstadoActividad({
    mutationConfig: {
      onSuccess: () => {
        avisarExito(notify, inactivar ? "Actividad inactivada." : "Actividad activada.")
        onClose()
      },
      onError: (e: Error) => s.setError(e),
    },
  })

  return (
    <DialogoOperacionShell
      titulo={`${inactivar ? "Inactivar" : "Activar"} ${a.nombre}`}
      resumen={
        inactivar ? (
          <div className="flex flex-col gap-1 text-sm">
            <span>Tipo: {a.tipo_nombre}</span>
            {a.grados_texto && <span>Grados: {a.grados_texto}</span>}
            <span>Responsable: {abreviarPersona(a.responsable_nombre)}</span>
            <span>
              Estado:{" "}
              <Badge variant="soft" color={ESTADO_ACTIVIDAD_COLOR.ACTIVA}>
                <span>Activa</span>
              </Badge>
            </span>
          </div>
        ) : undefined
      }
      onClose={onClose}
      error={s.error}
      pending={mut.isPending}
      confirmar={{
        label: inactivar ? "Inactivar" : "Activar",
        icon: inactivar ? <ProhibitIcon data-icon="inline-start" /> : <CheckCircleIcon data-icon="inline-start" />,
        color: inactivar ? "destructive" : undefined,
        onClick: () => {
          s.setError(null)
          mut.mutate({ id: a.id, ESTADO: inactivar ? "INACTIVA" : "ACTIVA" })
        },
      }}
    >
      <p className="text-sm">
        {inactivar
          ? `Se inactivará la actividad ${a.nombre}, que tiene ${a.inscritos} ${a.inscritos === 1 ? "estudiante inscrito" : "estudiantes inscritos"}.`
          : `Se activará la actividad ${a.nombre}; volverá a recibir inscripciones y sesiones.`}
      </p>
    </DialogoOperacionShell>
  )
}
