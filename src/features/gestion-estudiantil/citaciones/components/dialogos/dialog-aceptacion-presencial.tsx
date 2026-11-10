import { useState } from "react"

import { useNotify } from "@/components/notice/notice-context"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { FieldError } from "@/components/ui/field"
import { InfoIcon, PencilIcon } from "@/components/ui/icons"

import { useRegistrarAceptacionPresencial } from "@/features/gestion-estudiantil/citaciones/api/mutations/aceptacion-presencial"
import { subirSoporteCompromiso } from "@/features/gestion-estudiantil/citaciones/api/mutations/soporte-compromiso"
import type { CompromisoRow } from "@/features/gestion-estudiantil/citaciones/api/types"
import { DialogoOperacionShell } from "@/features/gestion-estudiantil/commons/components/dialogo-operacion-shell"
import { useEstadoDialogo } from "@/features/gestion-estudiantil/commons/hooks/use-estado-dialogo"
import { ResumenCompromiso } from "@/features/gestion-estudiantil/citaciones/components/dialogos/resumen-compromiso"
import { errorSoporte } from "@/features/gestion-estudiantil/citaciones/utils/formularios"
import { enfocarPrimerError } from "@/features/gestion-estudiantil/commons/utils/validaciones"
import { SoportesUpload } from "@/features/gestion-estudiantil/commons/components/soportes-upload"

interface Props {
  compromiso: CompromisoRow
  onClose: () => void
}

/**
 * Aceptación presencial (G.3.CMP.5, §4.2, Regla 26): el soporte firmado es obligatorio. Dos pasos como el alta
 * del compromiso: el archivo se sube primero (`POST /compromisos/soporte`) y su pk viaja en `FK_ARCHIVO`.
 */
export function DialogAceptacionPresencial({ compromiso: c, onClose }: Props) {
  const { notify } = useNotify()
  const s = useEstadoDialogo()
  const [soporte, setSoporte] = useState<File | null>(null)
  const [subiendo, setSubiendo] = useState(false)

  const mut = useRegistrarAceptacionPresencial({
    mutationConfig: {
      onSuccess: () => {
        notify("Aceptación presencial registrada; el compromiso quedó vigente.", { variant: "success" })
        onClose()
      },
      onError: (e: Error) => s.setError(e),
    },
  })
  const error = errorSoporte(soporte)

  async function registrar() {
    s.setIntento(true)
    s.setError(null)
    if (error || !soporte) {
      enfocarPrimerError()
      return
    }
    setSubiendo(true)
    try {
      const archivo = await subirSoporteCompromiso(soporte)
      mut.mutate({ id: c.id, FK_ARCHIVO: archivo })
    } catch (e) {
      s.setError(e)
    } finally {
      setSubiendo(false)
    }
  }

  return (
    <DialogoOperacionShell
      titulo={`Aceptación presencial — ${c.estudiante_nombre}`}
      resumen={<ResumenCompromiso c={c} conAcudiente />}
      onClose={onClose}
      error={s.error}
      pending={mut.isPending || subiendo}
      confirmar={{ label: "Registrar aceptación", icon: <PencilIcon data-icon="inline-start" />, onClick: registrar }}
    >
      <div className="flex flex-col gap-1" data-invalid={Boolean(s.intento && error) || undefined}>
        <SoportesUpload
          label="Soporte firmado*"
          max={1}
          archivos={soporte ? [soporte] : []}
          onChange={(archivos) => setSoporte(archivos[0] ?? null)}
        />
        {s.intento && error && <FieldError>{error}</FieldError>}
      </div>
      <Alert>
        <InfoIcon aria-hidden="true" />
        <AlertDescription>Al registrar la aceptación, el compromiso pasará a Vigente.</AlertDescription>
      </Alert>
    </DialogoOperacionShell>
  )
}
