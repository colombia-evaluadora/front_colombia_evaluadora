import { useMemo, useState } from "react"

import { Alert, AlertDescription } from "@/components/ui/alert"
import { InfoIcon, UserSwitchIcon } from "@/components/ui/icons"
import { formatDateValue } from "@/lib/date-value"

import { useRegistrarNotificacion } from "@/features/gestion-estudiantil/convivencia/api/mutations/procesos-etapas"
import { usePlazoRecurrirQuery } from "@/features/gestion-estudiantil/convivencia/api/query/use-proceso-etapas-query"
import type { ProcesoDetalle } from "@/features/gestion-estudiantil/convivencia/api/procesos-types"
import { formatFecha } from "@/features/gestion-estudiantil/convivencia/api/ui-mappings"
import { enfocarPrimerError } from "@/features/gestion-estudiantil/convivencia/api/validaciones"
import { CampoArchivo } from "@/features/gestion-estudiantil/convivencia/components/procesos/dialogos/campo-archivo"
import { CampoFecha } from "@/features/gestion-estudiantil/convivencia/components/procesos/dialogos/campo-fecha"
import { DialogProcesoShell, ResumenProceso } from "@/features/gestion-estudiantil/convivencia/components/procesos/dialogos/dialog-proceso-shell"
import { useResultadoEtapa } from "@/features/gestion-estudiantil/convivencia/hooks/use-resultado-etapa"
import { hayErrores, notificacionPendiente, validarNotificacion } from "@/features/gestion-estudiantil/convivencia/utils/proceso-etapas"

interface Props {
  proceso: ProcesoDetalle
  onClose: () => void
}

/** Notificación presencial (G.2.PRD.ETA.3): fecha y soporte firmado del acto que el acudiente no confirmó en el portal. */
export function DialogNotificacionPresencial({ proceso: p, onClose }: Props) {
  const [hoy] = useState(() => formatDateValue(new Date()))
  const pendiente = useMemo(() => notificacionPendiente(p), [p])
  const [fecha, setFecha] = useState(hoy)
  const [soporte, setSoporte] = useState<File[]>([])
  const [intento, setIntento] = useState(false)
  const plazo = usePlazoRecurrirQuery(p.id, fecha <= hoy ? fecha : "")
  const { error, mutationConfig } = useResultadoEtapa(onClose, "Notificación registrada.")
  const mut = useRegistrarNotificacion({ mutationConfig })
  const fechaActo = pendiente?.fechaActo ?? null
  const e = useMemo(() => (intento ? validarNotificacion(fecha, soporte, hoy, fechaActo) : {}), [intento, fecha, soporte, hoy, fechaActo])

  const registrar = () => {
    setIntento(true)
    if (hayErrores(validarNotificacion(fecha, soporte, hoy, fechaActo))) return enfocarPrimerError()
    mut.mutate({ procesoId: p.id, fecha, soporte: soporte[0] })
  }

  return (
    <DialogProcesoShell
      titulo={`Notificación presencial — ${p.estudiante.nombre}`}
      resumen={
        <ResumenProceso
          numero={p.numero}
          estado={p.estado}
          despues={[
            fechaActo && `Decisión del ${formatFecha(fechaActo)}`,
            p.acudiente && `Acudiente: ${p.acudiente.nombre}`,
            pendiente && "En el portal: Por confirmar",
          ]}
        />
      }
      onClose={onClose}
      error={error}
      pending={mut.isPending}
      confirmar={{ label: "Registrar notificación", icon: <UserSwitchIcon data-icon="inline-start" />, onClick: registrar }}
      className="sm:max-w-lg"
    >
      <CampoFecha id="notificacion-fecha" label="Fecha de notificación" value={fecha} min={fechaActo} max={hoy} error={e.fecha} onChange={setFecha} />
      <CampoArchivo label="Soporte firmado*" archivos={soporte} error={e.soporte} onChange={setSoporte} />
      {plazo.data?.limite && (
        <Alert>
          <InfoIcon aria-hidden="true" />
          <AlertDescription>
            El plazo para recurrir correrá desde esta fecha: hasta el {formatFecha(plazo.data.limite)}.
          </AlertDescription>
        </Alert>
      )}
    </DialogProcesoShell>
  )
}
