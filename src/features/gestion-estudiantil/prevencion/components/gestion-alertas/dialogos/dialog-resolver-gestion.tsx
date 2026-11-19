import { useState } from "react"

import { useNotify } from "@/components/notice/notice-context"
import { CheckCircleIcon } from "@/components/ui/icons"

import { ComboOpciones } from "@/features/gestion-estudiantil/commons/components/combo-opciones"
import { DialogoOperacionShell } from "@/features/gestion-estudiantil/commons/components/dialogo-operacion-shell"
import { useEstadoDialogo } from "@/features/gestion-estudiantil/commons/hooks/use-estado-dialogo"
import { enfocarPrimerError } from "@/features/gestion-estudiantil/commons/utils/validaciones"
import { useResolverGestion } from "@/features/gestion-estudiantil/prevencion/api/mutations/gestion-alertas"
import type { ResumenGestion } from "@/features/gestion-estudiantil/prevencion/api/types"
import { CampoFecha } from "@/features/gestion-estudiantil/prevencion/components/caracterizacion/form/campo-fecha"
import { ResumenGestionDialogo } from "@/features/gestion-estudiantil/prevencion/components/gestion-alertas/dialogos/resumen-gestion"
import { fechaParaBackend } from "@/features/gestion-estudiantil/prevencion/utils/formularios"
import { RESULTADO_VOLVIO, validarResolver } from "@/features/gestion-estudiantil/prevencion/utils/formularios-gestion"

/** «Matrícula retirada» la pone el sistema al dejar de estar Cursando; quien resuelve solo verifica el regreso. */
const RESULTADOS = [{ value: RESULTADO_VOLVIO, label: "El estudiante volvió a asistir" }]

/** Resolver la alerta (G.8.GAL.3): pide la verificación de la reincorporación, no basta una llamada. */
export function DialogResolverGestion({ gestion, onClose }: { gestion: ResumenGestion; onClose: () => void }) {
  const { notify } = useNotify()
  const s = useEstadoDialogo()
  const [fecha, setFecha] = useState<Date | undefined>(() => new Date())
  const [resultado, setResultado] = useState(RESULTADO_VOLVIO)
  const errorFecha = validarResolver(fecha)
  const errorResultado = resultado ? undefined : "El resultado es obligatorio."

  const mut = useResolverGestion({
    mutationConfig: {
      onSuccess: () => {
        notify("Alerta resuelta.", { variant: "success" })
        onClose()
      },
      onError: (e: Error) => s.setError(e),
    },
  })

  return (
    <DialogoOperacionShell
      titulo="Resolver la alerta"
      resumen={<ResumenGestionDialogo g={gestion} />}
      onClose={onClose}
      error={s.error}
      pending={mut.isPending}
      confirmar={{
        label: "Resolver",
        icon: <CheckCircleIcon data-icon="inline-start" />,
        onClick: () => {
          s.setIntento(true)
          s.setError(null)
          if (errorFecha || errorResultado || !fecha) return enfocarPrimerError()
          mut.mutate({ id: gestion.id, FECHA_VERIFICACION: fechaParaBackend(fecha), RESULTADO: resultado })
        },
      }}
    >
      <div className="grid grid-cols-1 gap-4">
        <div className="flex flex-col gap-1">
          <CampoFecha
            id="resolver-fecha"
            label="Verificación de la reincorporación"
            required
            value={fecha}
            error={s.intento ? errorFecha : undefined}
            onChange={setFecha}
          />
          <p className="text-xs text-muted-foreground">Fecha en que volvió a asistir.</p>
        </div>
        <ComboOpciones
          id="resolver-resultado"
          label="Resultado"
          required
          size="default"
          todos={false}
          value={resultado}
          options={RESULTADOS}
          error={s.intento ? errorResultado : undefined}
          onChange={setResultado}
        />
      </div>
    </DialogoOperacionShell>
  )
}
