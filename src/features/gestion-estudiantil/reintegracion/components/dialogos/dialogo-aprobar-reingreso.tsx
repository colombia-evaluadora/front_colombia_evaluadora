import { useNotify } from "@/components/notice/notice-context"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { CheckCircleIcon, InfoIcon } from "@/components/ui/icons"

import { DialogoOperacionShell } from "@/features/gestion-estudiantil/commons/components/dialogo-operacion-shell"
import { useEstadoDialogo } from "@/features/gestion-estudiantil/commons/hooks/use-estado-dialogo"
import { useAprobarReingreso } from "@/features/gestion-estudiantil/reintegracion/api/mutations/casos"
import type { CasoDetalle } from "@/features/gestion-estudiantil/reintegracion/api/types"
import { ResumenCasoDialogo } from "@/features/gestion-estudiantil/reintegracion/components/dialogos/resumen-caso-dialogo"

/** Aprobar reingreso — [Estudiante] (G.9.EST.5): confirmación con Origen, retiro, estado y profesional. */
export function DialogoAprobarReingreso({ caso: c, onClose }: { caso: CasoDetalle; onClose: () => void }) {
  const { notify } = useNotify()
  const s = useEstadoDialogo()
  const mut = useAprobarReingreso({
    mutationConfig: {
      onSuccess: () => {
        notify("Reingreso aprobado.", { variant: "success" })
        onClose()
      },
      onError: (e: Error) => s.setError(e),
    },
  })

  return (
    <DialogoOperacionShell
      titulo={`Aprobar reingreso — ${c.estudiante_nombre}`}
      resumen={<ResumenCasoDialogo caso={c} conRetiro />}
      onClose={onClose}
      error={s.error}
      pending={mut.isPending}
      confirmar={{
        label: "Aprobar reingreso",
        icon: <CheckCircleIcon data-icon="inline-start" />,
        onClick: () => {
          s.setError(null)
          mut.mutate({ id: c.id })
        },
      }}
    >
      <Alert>
        <InfoIcon aria-hidden="true" />
        <AlertDescription>Aprobar el reingreso solo autoriza el regreso del estudiante; no lo matricula.</AlertDescription>
      </Alert>
    </DialogoOperacionShell>
  )
}
