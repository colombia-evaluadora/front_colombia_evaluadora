import { useState } from "react"

import { useNotify } from "@/components/notice/notice-context"
import { CheckCircleIcon } from "@/components/ui/icons"

import { DialogoOperacionShell } from "@/features/gestion-estudiantil/commons/components/dialogo-operacion-shell"
import { SoportesUpload } from "@/features/gestion-estudiantil/commons/components/soportes-upload"
import { TextoLargo } from "@/features/gestion-estudiantil/commons/components/texto-largo"
import { useEstadoDialogo } from "@/features/gestion-estudiantil/commons/hooks/use-estado-dialogo"
import { abreviarPersona, formatFecha } from "@/features/gestion-estudiantil/commons/utils/formatos"
import { enfocarPrimerError, errorLargo } from "@/features/gestion-estudiantil/commons/utils/validaciones"
import {
  subirSoporteAcomp,
  useResultadoAccionAcomp,
} from "@/features/gestion-estudiantil/prevencion/api/mutations/acompanamientos"
import type { AcompAccion, ResumenAcomp } from "@/features/gestion-estudiantil/prevencion/api/types"
import {
  ACCION_TEXTO_MAX,
  ACCION_TEXTO_MIN,
  SOPORTES_MAX,
} from "@/features/gestion-estudiantil/prevencion/utils/formularios-acompanamiento"

interface Props {
  acomp: ResumenAcomp
  accion: AcompAccion
  onClose: () => void
}

/** Registrar el resultado de una acción (su Responsable u orientación): marca la acción Realizada. */
export function DialogResultadoAccion({ acomp, accion, onClose }: Props) {
  const { notify } = useNotify()
  const s = useEstadoDialogo()
  const [resultado, setResultado] = useState("")
  const [archivos, setArchivos] = useState<File[]>([])
  const [subiendo, setSubiendo] = useState(false)
  const error = errorLargo(resultado, ACCION_TEXTO_MIN, ACCION_TEXTO_MAX, "El resultado")
  const existentes = accion.soportes.length
  const mut = useResultadoAccionAcomp({
    mutationConfig: {
      onSuccess: () => {
        notify("Resultado registrado: la acción queda Realizada.", { variant: "success" })
        onClose()
      },
      onError: (e: Error) => s.setError(e),
    },
  })

  const guardar = async () => {
    s.setIntento(true)
    s.setError(null)
    if (error) return enfocarPrimerError()
    try {
      setSubiendo(true)
      const nuevos = await Promise.all(archivos.map((f) => subirSoporteAcomp(f)))
      mut.mutate({ accionId: accion.id, RESULTADO: resultado, SOPORTES: nuevos.length ? nuevos : null })
    } catch (e) {
      s.setError(e)
    } finally {
      setSubiendo(false)
    }
  }

  return (
    <DialogoOperacionShell
      titulo={`Registrar resultado — ${acomp.estudiante_nombre}`}
      resumen={`${accion.tipo_nombre} · ${formatFecha(accion.fecha)} · ${abreviarPersona(accion.responsable_nombre)}`}
      onClose={onClose}
      error={s.error}
      pending={mut.isPending || subiendo}
      confirmar={{ label: "Registrar", icon: <CheckCircleIcon data-icon="inline-start" />, onClick: guardar }}
    >
      {accion.descripcion && <p className="text-sm whitespace-pre-line text-muted-foreground">{accion.descripcion}</p>}
      <TextoLargo
        id="accion-resultado-registrar"
        label="Resultado"
        required
        max={ACCION_TEXTO_MAX}
        rows={4}
        value={resultado}
        error={s.intento ? error : undefined}
        onChange={setResultado}
      />
      <SoportesUpload
        label={`Soportes (${existentes + archivos.length} de ${SOPORTES_MAX}) · PDF, JPG o PNG, máximo 10 MB cada uno`}
        archivos={archivos}
        onChange={setArchivos}
        max={SOPORTES_MAX - existentes}
        disabled={mut.isPending || subiendo}
      />
    </DialogoOperacionShell>
  )
}
