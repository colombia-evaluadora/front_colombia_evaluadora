import { useState } from "react"

import { useNotify } from "@/components/notice/notice-context"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { InfoIcon, LockIcon } from "@/components/ui/icons"

import { ComboOpciones } from "@/features/gestion-estudiantil/commons/components/combo-opciones"
import { DialogoOperacionShell } from "@/features/gestion-estudiantil/commons/components/dialogo-operacion-shell"
import { useEstadoDialogo } from "@/features/gestion-estudiantil/commons/hooks/use-estado-dialogo"
import { enfocarPrimerError } from "@/features/gestion-estudiantil/commons/utils/validaciones"
import { useCerrarCaso } from "@/features/gestion-estudiantil/reintegracion/api/mutations/casos"
import { useOpcionesListaQuery } from "@/features/gestion-estudiantil/reintegracion/api/query/use-opciones-query"
import type { CasoDetalle } from "@/features/gestion-estudiantil/reintegracion/api/types"
import { ResumenCasoDialogo } from "@/features/gestion-estudiantil/reintegracion/components/dialogos/resumen-caso-dialogo"

/** Nuevo abandono lo usa el sistema: el usuario no lo elige. Reevaluación sí, y abre un caso nuevo. */
const MOTIVO_SISTEMA = "NUEVO_ABANDONO"
const MOTIVO_REEVALUACION = "REEVALUACION_CASO"

interface Props {
  caso: CasoDetalle
  onClose: () => void
  onIrCaso: (casoId: number) => void
}

/**
 * Cerrar el caso: el Motivo de cierre es obligatorio si se cierra antes de Permanencia verificada. Con
 * «Reevaluación del caso» avisa del caso nuevo y, al cerrar, ofrece ir a él.
 */
export function DialogoCerrar({ caso: c, onClose, onIrCaso }: Props) {
  const { notify } = useNotify()
  const s = useEstadoDialogo()
  const motivos = useOpcionesListaQuery("MOTIVO_CIERRE").data ?? []
  const [motivo, setMotivo] = useState("")
  const [casoNuevo, setCasoNuevo] = useState<number | null>(null)

  const opciones = motivos
    .filter((m) => m.valor !== MOTIVO_SISTEMA)
    .map((m) => ({ value: String(m.fk_tlista_valor), label: m.nombre }))
  const exigeMotivo = c.estado !== "PERMANENCIA_VERIFICADA"
  const reevalua = motivos.find((m) => String(m.fk_tlista_valor) === motivo)?.valor === MOTIVO_REEVALUACION
  const error = s.intento && exigeMotivo && !motivo ? "El motivo de cierre es obligatorio si se cierra antes de Permanencia verificada." : undefined

  const mut = useCerrarCaso({
    mutationConfig: {
      onSuccess: (r) => {
        notify("Caso cerrado.", { variant: "success" })
        if (r.fk_caso_nuevo != null) setCasoNuevo(r.fk_caso_nuevo)
        else onClose()
      },
      onError: (e: Error) => s.setError(e),
    },
  })

  function cerrar() {
    s.setIntento(true)
    s.setError(null)
    if (exigeMotivo && !motivo) {
      enfocarPrimerError()
      return
    }
    mut.mutate({ id: c.id, FK_MOTIVO: motivo ? Number(motivo) : null })
  }

  if (casoNuevo != null)
    return (
      <Dialog open onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Caso cerrado</DialogTitle>
            <DialogDescription>
              Se abrió un caso nuevo para {c.estudiante_nombre}, vinculado a este.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button size="sm" type="button" variant="outline" color="neutral" onClick={onClose}>
              Quedarme aquí
            </Button>
            <Button
              size="sm"
              type="button"
              onClick={() => {
                onClose()
                onIrCaso(casoNuevo)
              }}
            >
              Ir al caso nuevo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    )

  return (
    <DialogoOperacionShell
      titulo={`Cerrar el caso — ${c.estudiante_nombre}`}
      resumen={<ResumenCasoDialogo caso={c} />}
      onClose={onClose}
      error={s.error}
      pending={mut.isPending}
      confirmar={{ label: "Cerrar", icon: <LockIcon data-icon="inline-start" />, color: "destructive", onClick: cerrar }}
    >
      <p className="text-sm">Cerrar el caso es definitivo: un caso cerrado no se reabre ni vuelve a un estado anterior.</p>
      <ComboOpciones
        id="reintegracion-cerrar-motivo"
        label="Motivo de cierre"
        required={exigeMotivo}
        size="default"
        todos={exigeMotivo ? false : "Sin motivo"}
        placeholder="Seleccione"
        value={motivo}
        options={opciones}
        error={error}
        onChange={setMotivo}
      />
      {reevalua && (
        <Alert>
          <InfoIcon aria-hidden="true" />
          <AlertDescription>Se abrirá un caso nuevo para {c.estudiante_nombre}, vinculado a este.</AlertDescription>
        </Alert>
      )}
    </DialogoOperacionShell>
  )
}
