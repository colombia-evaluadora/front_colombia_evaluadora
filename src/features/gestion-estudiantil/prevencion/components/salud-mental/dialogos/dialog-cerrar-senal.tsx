import { useNotify } from "@/components/notice/notice-context"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { CheckCircleIcon, WarningIcon } from "@/components/ui/icons"

import { DialogoOperacionShell } from "@/features/gestion-estudiantil/commons/components/dialogo-operacion-shell"
import { useEstadoDialogo } from "@/features/gestion-estudiantil/commons/hooks/use-estado-dialogo"
import { formatFecha } from "@/features/gestion-estudiantil/commons/utils/formatos"
import { useCerrarSenal } from "@/features/gestion-estudiantil/prevencion/api/mutations/salud-mental"
import type { ResumenSenalSM } from "@/features/gestion-estudiantil/prevencion/api/types"
import { BadgeEstadoSenal } from "@/features/gestion-estudiantil/prevencion/components/salud-mental/badges-senal"

interface Props {
  senal: ResumenSenalSM
  onClose: () => void
}

/** Cerrar la señal (G.8.SAL.7): con la señal Por valorar el botón Cerrar se bloquea y se explica por qué (Regla 19). */
export function DialogCerrarSenal({ senal, onClose }: Props) {
  const { notify } = useNotify()
  const s = useEstadoDialogo()
  const mut = useCerrarSenal({
    mutationConfig: {
      onSuccess: () => {
        notify("Señal cerrada.", { variant: "success" })
        onClose()
      },
      onError: (e: Error) => s.setError(e),
    },
  })
  const sinValorar = senal.estado === "POR_VALORAR"

  return (
    <DialogoOperacionShell
      titulo={`Cerrar la señal — ${senal.estudiante_nombre}`}
      resumen={
        <span className="flex flex-wrap items-center gap-2">
          {senal.tipo_nombre} · {formatFecha(senal.fecha)} ·
          <BadgeEstadoSenal estado={senal.estado} nombre={senal.estado_nombre} />
        </span>
      }
      onClose={onClose}
      error={s.error}
      pending={mut.isPending}
      confirmar={{
        label: "Cerrar",
        icon: <CheckCircleIcon data-icon="inline-start" />,
        disabled: sinValorar,
        onClick: () => {
          s.setError(null)
          mut.mutate({ id: senal.id })
        },
      }}
    >
      {sinValorar ? (
        <Alert variant="destructive">
          <WarningIcon aria-hidden="true" />
          <AlertDescription>No se puede cerrar la señal porque aún no ha sido valorada.</AlertDescription>
        </Alert>
      ) : (
        <p className="text-sm">El cierre es final: la señal no se anula ni se reabre.</p>
      )}
    </DialogoOperacionShell>
  )
}
