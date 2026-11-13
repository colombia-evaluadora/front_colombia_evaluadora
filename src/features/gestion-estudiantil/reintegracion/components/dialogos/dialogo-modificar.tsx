import { useState } from "react"

import { useNotify } from "@/components/notice/notice-context"
import { FloppyDiskIcon } from "@/components/ui/icons"
import { Switch } from "@/components/ui/switch"

import { DialogoOperacionShell } from "@/features/gestion-estudiantil/commons/components/dialogo-operacion-shell"
import { TextoLargo } from "@/features/gestion-estudiantil/commons/components/texto-largo"
import { useEstadoDialogo } from "@/features/gestion-estudiantil/commons/hooks/use-estado-dialogo"
import { enfocarPrimerError } from "@/features/gestion-estudiantil/commons/utils/validaciones"
import { useModificarCaso } from "@/features/gestion-estudiantil/reintegracion/api/mutations/casos"
import { useOpcionesRazonesQuery } from "@/features/gestion-estudiantil/reintegracion/api/query/use-opciones-query"
import type { CasoDetalle } from "@/features/gestion-estudiantil/reintegracion/api/types"
import { CamposRazones } from "@/features/gestion-estudiantil/reintegracion/components/campos-razones"
import { ResumenCasoDialogo } from "@/features/gestion-estudiantil/reintegracion/components/dialogos/resumen-caso-dialogo"
import {
  errorOtraRazon,
  OBSERVACIONES_MAX,
  razonesDeCaso,
  razonesParaBackend,
  type RazonesForm,
} from "@/features/gestion-estudiantil/reintegracion/utils/razones"

/**
 * Modificar el caso (§10.1): alta complejidad, razones del abandono con su causa principal y observaciones del
 * Profesional de trabajo social. Vaciar las observaciones las borra.
 */
export function DialogoModificar({ caso: c, onClose }: { caso: CasoDetalle; onClose: () => void }) {
  const { notify } = useNotify()
  const s = useEstadoDialogo()
  const opciones = useOpcionesRazonesQuery().data ?? []
  const [alta, setAlta] = useState(c.alta_complejidad)
  const [razones, setRazones] = useState<RazonesForm>(() => razonesDeCaso(c))
  const [observaciones, setObservaciones] = useState(c.ficha.observaciones_profesional ?? "")

  const errorOtra = s.intento ? errorOtraRazon(razones, opciones) : undefined

  const mut = useModificarCaso({
    mutationConfig: {
      onSuccess: () => {
        notify("Caso modificado.", { variant: "success" })
        onClose()
      },
      onError: (e: Error) => s.setError(e),
    },
  })

  function guardar() {
    s.setIntento(true)
    s.setError(null)
    if (errorOtraRazon(razones, opciones)) {
      enfocarPrimerError()
      return
    }
    mut.mutate({
      id: c.id,
      ALTA_COMPLEJIDAD: alta,
      OBSERVACIONES: observaciones.trim() || null,
      ...razonesParaBackend(razones, opciones),
    })
  }

  return (
    <DialogoOperacionShell
      titulo={`Modificar — ${c.estudiante_nombre}`}
      resumen={<ResumenCasoDialogo caso={c} />}
      className="sm:max-w-3xl"
      onClose={onClose}
      error={s.error}
      pending={mut.isPending}
      confirmar={{ label: "Guardar", icon: <FloppyDiskIcon data-icon="inline-start" />, onClick: guardar }}
    >
      <div className="flex max-h-[60vh] flex-col gap-4 overflow-y-auto pr-1">
        <label className="flex h-11 items-center gap-3 text-sm">
          <Switch round checked={alta} onCheckedChange={setAlta} />
          Alta complejidad
        </label>
        <CamposRazones
          id="reintegracion-modificar"
          opciones={opciones}
          value={razones}
          onChange={setRazones}
          errorOtraRazon={errorOtra}
        />
        <TextoLargo
          id="reintegracion-modificar-observaciones"
          label="Observaciones del Profesional de trabajo social"
          rows={4}
          max={OBSERVACIONES_MAX}
          value={observaciones}
          onChange={setObservaciones}
        />
      </div>
    </DialogoOperacionShell>
  )
}
