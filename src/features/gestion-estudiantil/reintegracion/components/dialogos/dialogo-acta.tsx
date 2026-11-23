import { Alert, AlertDescription } from "@/components/ui/alert"
import { FileTextIcon, InfoIcon } from "@/components/ui/icons"

import { DialogoOperacionShell } from "@/features/gestion-estudiantil/commons/components/dialogo-operacion-shell"
import { useEstadoDialogo } from "@/features/gestion-estudiantil/commons/hooks/use-estado-dialogo"
import { useDescargarActa } from "@/features/gestion-estudiantil/reintegracion/api/mutations/casos"
import type { CasoDetalle } from "@/features/gestion-estudiantil/reintegracion/api/types"
import { ResumenCasoDialogo } from "@/features/gestion-estudiantil/reintegracion/components/dialogos/resumen-caso-dialogo"

/**
 * Generar acta de retiro: confirma (la primera vez asigna el número de acta) y descarga el PDF de
 * reporting-service (clave `reintegracion-acta-retiro`), que conserva el número al regenerar.
 */
export function DialogoActa({ caso: c, onClose }: { caso: CasoDetalle; onClose: () => void }) {
  const s = useEstadoDialogo()
  const mut = useDescargarActa({
    mutationConfig: {
      onSuccess: onClose,
      onError: (e: Error) => s.setError(e),
    },
  })

  return (
    <DialogoOperacionShell
      titulo={`Generar acta de retiro — ${c.estudiante_nombre}`}
      resumen={<ResumenCasoDialogo caso={c} conRetiro />}
      onClose={onClose}
      error={s.error}
      pending={mut.isPending}
      confirmar={{
        label: "Generar acta",
        icon: <FileTextIcon data-icon="inline-start" />,
        onClick: () => {
          s.setError(null)
          mut.mutate({ id: c.id })
        },
      }}
    >
      <Alert>
        <InfoIcon aria-hidden="true" />
        <AlertDescription>
          {c.acta
            ? `El acta conserva su número (${c.acta.numero}) y se vuelve a generar con las razones actuales.`
            : "La primera vez se asigna el número de acta del establecimiento y el año."}
        </AlertDescription>
      </Alert>
    </DialogoOperacionShell>
  )
}
