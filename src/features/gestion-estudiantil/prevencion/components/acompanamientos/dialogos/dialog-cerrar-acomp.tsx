import { useState } from "react"

import { useNotify } from "@/components/notice/notice-context"
import { CheckCircleIcon } from "@/components/ui/icons"

import { DialogoOperacionShell } from "@/features/gestion-estudiantil/commons/components/dialogo-operacion-shell"
import { TextoLargo } from "@/features/gestion-estudiantil/commons/components/texto-largo"
import { useEstadoDialogo } from "@/features/gestion-estudiantil/commons/hooks/use-estado-dialogo"
import { enfocarPrimerError, errorLargo } from "@/features/gestion-estudiantil/commons/utils/validaciones"
import { useCerrarAcomp } from "@/features/gestion-estudiantil/prevencion/api/mutations/acompanamientos"
import type { ResumenAcomp } from "@/features/gestion-estudiantil/prevencion/api/types"
import { ResumenAcompDialogo } from "@/features/gestion-estudiantil/prevencion/components/acompanamientos/dialogos/resumen-acomp"
import { RESUMEN_CIERRE_MAX } from "@/features/gestion-estudiantil/prevencion/utils/formularios-acompanamiento"

/** Textos del prototipo (G.8.EMB.6 / G.8.CON.5): en consumo se aclara que cerrar no certifica que no haya consumo. */
const AYUDA = {
  EMBARAZO:
    "Un acompañamiento cerrado queda en consulta y no se reabre; uno nuevo conserva el vínculo con este. La fecha, la hora y el usuario del cierre se registran solos.",
  CONSUMO:
    "Cerrar es terminar este acompañamiento, no certificar que no hay consumo. Queda en consulta y no se reabre; uno nuevo conserva el vínculo con este. La fecha, la hora y el usuario del cierre se registran solos.",
}

/** Cerrar acompañamiento: resumen de 10 a 2000 caracteres; final, no se reabre. */
export function DialogCerrarAcomp({ acomp, onClose }: { acomp: ResumenAcomp; onClose: () => void }) {
  const { notify } = useNotify()
  const s = useEstadoDialogo()
  const [resumen, setResumen] = useState("")
  const error = errorLargo(resumen, 10, RESUMEN_CIERRE_MAX, "El resumen del cierre")
  const mut = useCerrarAcomp({
    mutationConfig: {
      onSuccess: () => {
        notify("Acompañamiento cerrado.", { variant: "success" })
        onClose()
      },
      onError: (e: Error) => s.setError(e),
    },
  })

  return (
    <DialogoOperacionShell
      titulo={`Cerrar acompañamiento — ${acomp.estudiante_nombre}`}
      resumen={<ResumenAcompDialogo a={acomp} />}
      onClose={onClose}
      error={s.error}
      pending={mut.isPending}
      confirmar={{
        label: "Cerrar acompañamiento",
        icon: <CheckCircleIcon data-icon="inline-start" />,
        onClick: () => {
          s.setIntento(true)
          s.setError(null)
          if (error) return enfocarPrimerError()
          mut.mutate({ id: acomp.id, RESUMEN: resumen })
        },
      }}
    >
      <TextoLargo
        id="acomp-resumen-cierre"
        label="Resumen del cierre"
        required
        max={RESUMEN_CIERRE_MAX}
        rows={5}
        placeholder="Resultado de los apoyos, situación educativa y medidas de continuidad."
        value={resumen}
        error={s.intento ? error : undefined}
        onChange={setResumen}
      />
      <p className="text-xs text-muted-foreground">De 10 a 2000 caracteres. {AYUDA[acomp.tipo]}</p>
    </DialogoOperacionShell>
  )
}
