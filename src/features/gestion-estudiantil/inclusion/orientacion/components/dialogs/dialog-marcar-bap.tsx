import { useState } from "react"

import { useNotify } from "@/components/notice/notice-context"
import { Field, FieldLabel } from "@/components/ui/field"
import { PushPinIcon } from "@/components/ui/icons"
import { Input } from "@/components/ui/input"

import { useAuth } from "@/features/auth/hooks/use-auth"
import { DialogoOperacionShell } from "@/features/gestion-estudiantil/commons/components/dialogo-operacion-shell"
import { TextoLargo } from "@/features/gestion-estudiantil/commons/components/texto-largo"
import { useEstadoDialogo } from "@/features/gestion-estudiantil/commons/hooks/use-estado-dialogo"
import { enfocarPrimerError } from "@/features/gestion-estudiantil/commons/utils/validaciones"
import { useMarcarPresuncionBap } from "@/features/gestion-estudiantil/inclusion/orientacion/api/mutations/atenciones"

export interface MarcaBap {
  atencionId: number
  estudiante: string
}

const MIN = 10
const MAX = 1000

/** G.4.ORI.BAP.2/2a: marca de Presunción de BAP (5.3) desde la fila de una atención. Fecha y hora las pone el servidor. */
export function DialogMarcarBap({ objetivo, onClose }: { objetivo: MarcaBap; onClose: () => void }) {
  const { notify } = useNotify()
  const { user } = useAuth()
  const s = useEstadoDialogo()
  const [motivo, setMotivo] = useState("")
  const marcar = useMarcarPresuncionBap()

  const n = motivo.trim().length
  const error = n < MIN || n > MAX ? `El motivo debe tener entre ${MIN} y ${MAX} caracteres.` : undefined

  function confirmar() {
    s.setIntento(true)
    s.setError(null)
    if (error) return enfocarPrimerError()
    marcar.mutate(
      { id: objetivo.atencionId, motivo: motivo.trim() },
      {
        onSuccess: (r) => {
          const mensaje = r.datos?.mensaje ?? r.mensaje
          notify(mensaje?.startsWith("Presunción de BAP marcada") ? mensaje : `Presunción de BAP marcada para ${objetivo.estudiante}.`, { variant: "success" })
          onClose()
        },
        onError: (e) => s.setError(e),
      },
    )
  }

  return (
    <DialogoOperacionShell
      titulo="Marcar presunción de BAP"
      onClose={onClose}
      error={s.error}
      pending={marcar.isPending}
      confirmar={{ label: "Marcar presunción", icon: <PushPinIcon data-icon="inline-start" />, onClick: confirmar }}
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1 sm:col-span-2">
          <Field orientation="vertical" variant="outlined" className="gap-2">
            <FieldLabel htmlFor="bap-estudiante">Estudiante*</FieldLabel>
            <Input id="bap-estudiante" value={objetivo.estudiante} readOnly disabled />
          </Field>
          <p className="text-xs text-muted-foreground">Matrículas Cursando de sus Sedes y Jornadas.</p>
        </div>
        <div className="sm:col-span-2">
          <TextoLargo
            id="bap-motivo"
            label="Motivo"
            required
            rows={4}
            max={MAX}
            value={motivo}
            error={s.intento ? error : undefined}
            descripcion="Lo observado que lleva a presumir la barrera, sin diagnóstico ni detalle clínico."
            onChange={setMotivo}
          />
        </div>
        <Field orientation="vertical" variant="outlined" className="gap-2">
          <FieldLabel htmlFor="bap-marcada-por">Marcada por</FieldLabel>
          <Input id="bap-marcada-por" value={user?.name ?? ""} readOnly disabled />
        </Field>
        <Field orientation="vertical" variant="outlined" className="gap-2">
          <FieldLabel htmlFor="bap-fecha-hora">Fecha y hora</FieldLabel>
          <Input id="bap-fecha-hora" value="Automática" readOnly disabled />
        </Field>
      </div>
    </DialogoOperacionShell>
  )
}
