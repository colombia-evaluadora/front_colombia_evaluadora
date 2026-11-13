import { useState } from "react"

import { useNotify } from "@/components/notice/notice-context"
import { UserSwitchIcon } from "@/components/ui/icons"

import { ComboOpciones } from "@/features/gestion-estudiantil/commons/components/combo-opciones"
import { DialogoOperacionShell } from "@/features/gestion-estudiantil/commons/components/dialogo-operacion-shell"
import { useEstadoDialogo } from "@/features/gestion-estudiantil/commons/hooks/use-estado-dialogo"
import { enfocarPrimerError } from "@/features/gestion-estudiantil/commons/utils/validaciones"
import { useAsignarCaso } from "@/features/gestion-estudiantil/reintegracion/api/mutations/casos"
import { useOpcionesProfesionalesQuery } from "@/features/gestion-estudiantil/reintegracion/api/query/use-opciones-query"
import type { CasoDetalle } from "@/features/gestion-estudiantil/reintegracion/api/types"
import { ResumenCasoDialogo } from "@/features/gestion-estudiantil/reintegracion/components/dialogos/resumen-caso-dialogo"

/** Reasignar — [Caso] (o Asignar si no tiene profesional): profesionales con rol en la sede y jornada del caso. */
export function DialogoAsignar({ caso: c, onClose }: { caso: CasoDetalle; onClose: () => void }) {
  const { notify } = useNotify()
  const s = useEstadoDialogo()
  const profesionales = useOpcionesProfesionalesQuery(c.fk_tsede, c.fk_tlv_jornada)
  const [profesional, setProfesional] = useState("")
  const reasigna = c.profesional != null
  const verbo = reasigna ? "Reasignar" : "Asignar"

  const mut = useAsignarCaso({
    mutationConfig: {
      onSuccess: () => {
        notify(reasigna ? "Caso reasignado." : "Caso asignado.", { variant: "success" })
        onClose()
      },
      onError: (e: Error) => s.setError(e),
    },
  })

  const error = s.intento && !profesional ? "El Profesional de trabajo social es obligatorio." : undefined

  function asignar() {
    s.setIntento(true)
    s.setError(null)
    if (!profesional) {
      enfocarPrimerError()
      return
    }
    mut.mutate({ id: c.id, FK_PROFESIONAL: Number(profesional) })
  }

  return (
    <DialogoOperacionShell
      titulo={`${verbo} — ${c.estudiante_nombre}`}
      resumen={<ResumenCasoDialogo caso={c} />}
      onClose={onClose}
      error={s.error ?? (profesionales.isError ? profesionales.error : null)}
      pending={mut.isPending}
      confirmar={{ label: verbo, icon: <UserSwitchIcon data-icon="inline-start" />, onClick: asignar }}
    >
      <ComboOpciones
        id="reintegracion-asignar-profesional"
        label="Profesional de trabajo social"
        required
        size="default"
        todos={false}
        placeholder="Seleccione"
        value={profesional}
        options={(profesionales.data ?? []).map((p) => ({ value: String(p.fk_tusuario), label: p.nombre }))}
        error={error}
        onChange={setProfesional}
      />
    </DialogoOperacionShell>
  )
}
