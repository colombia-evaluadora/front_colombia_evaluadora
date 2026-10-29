import { useState } from "react"

import { Button } from "@/components/ui/button"
import { CheckCircleIcon, ProhibitIcon, SpinnerIcon } from "@/components/ui/icons"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { useNotify } from "@/components/notice/notice-context"
import { getErrorMessage } from "@/lib/api-client"
import { QUEUED_MESSAGE } from "@/lib/offline/outbox/engine"
import { useOfflineWritable } from "@/lib/offline/outbox/hooks"

import { useToggleStatus } from "@/features/academic-management/curricular-references/api/mutations/use-toggle-status"
import { fetchCurricularReferenceImpact } from "@/features/academic-management/curricular-references/api/query/fetch-impact"
import {
  buildHighImpactAlerts,
  type HighImpactAlert,
} from "@/features/academic-management/curricular-references/utils/high-impact-alerts"
import { HighImpactDialog } from "@/features/academic-management/curricular-references/components/dialogs/dialog-high-impact"
import { LevelConflictDialog } from "@/features/academic-management/curricular-references/components/dialogs/dialog-level-conflict"
import {
  toLevelConflict,
  type LevelConflict,
} from "@/features/academic-management/curricular-references/utils/level-conflict"
import type { CurricularReference } from "@/features/academic-management/curricular-references/api/types/curricular-reference"

// Activar/Inactivar directo desde la fila, sin abrir el formulario.
export function ToggleStatusButton({ curricularReference }: { curricularReference: CurricularReference }) {
  const { notify } = useNotify()
  const nextActive = !curricularReference.active
  const label = nextActive ? "Activar" : "Inactivar"
  // Sin red no se puede activar/inactivar (plan offline §7.5).
  // Fase 4 offline: activar se encola; inactivar exige consultar el impacto en
  // el servidor, así que sin red queda deshabilitado.
  const escritura = useOfflineWritable()
  const soloEnLinea =
    escritura.queues && !nextActive
      ? { disabled: true, tooltip: "Inactivar necesita conexión para revisar el impacto." }
      : escritura

  // Inactivar con unidades/actividades pasa por el modal (Regla 5).
  const [impactAlerts, setImpactAlerts] = useState<HighImpactAlert[]>([])
  // Inactivar siempre pide confirmación, tenga o no impacto.
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [isCheckingImpact, setIsCheckingImpact] = useState(false)
  // Activar sobre un nivel ya gobernado abre el modal de la Regla 7.
  const [levelConflict, setLevelConflict] = useState<LevelConflict | null>(null)

  function closeConfirm() {
    setConfirmOpen(false)
    setImpactAlerts([])
  }

  async function handleError(message: string) {
    closeConfirm()
    const conflict = nextActive ? await toLevelConflict(message) : null
    if (conflict) {
      setLevelConflict(conflict)
      return
    }
    notify(message || "No fue posible cambiar el estado.", { variant: "error" })
  }

  const toggleMutation = useToggleStatus({
    mutationConfig: {
      onSuccess: (result) => {
        if (result?.status === "error") {
          void handleError(result.message ?? "")
          return
        }
        closeConfirm()
        if (result?.queued) {
          notify(QUEUED_MESSAGE)
          return
        }
        notify(nextActive ? "El referente curricular se activó." : "El referente curricular se inactivó.")
      },
      onError: (error) => void handleError(getErrorMessage(error)),
    },
  })

  function toggle() {
    if (soloEnLinea.disabled) return
    toggleMutation.mutate({ reference: curricularReference, active: nextActive })
  }

  async function handleClick() {
    if (nextActive) {
      toggle()
      return
    }
    setIsCheckingImpact(true)
    try {
      const impact = await fetchCurricularReferenceImpact(curricularReference.id)
      const alerts = buildHighImpactAlerts(
        ["status"],
        curricularReference,
        { ...curricularReference, active: false },
        impact,
      )
      setImpactAlerts(alerts)
      setConfirmOpen(true)
    } catch (error) {
      notify(getErrorMessage(error), { variant: "error" })
    } finally {
      setIsCheckingImpact(false)
    }
  }

  const isPending = toggleMutation.isPending || isCheckingImpact

  return (
    <>
      <Tooltip>
        <TooltipTrigger
          render={
            <Button
              type="button"
              variant="ghost"
              color="neutral"
              size="icon-sm"
              aria-label={`${label} ${curricularReference.name}`}
              disabled={isPending || soloEnLinea.disabled}
              onClick={handleClick}
            />
          }
        >
          {isPending ? (
            <SpinnerIcon className="animate-spin" />
          ) : nextActive ? (
            <CheckCircleIcon />
          ) : (
            <ProhibitIcon />
          )}
        </TooltipTrigger>
        <TooltipContent>{soloEnLinea.tooltip ?? label}</TooltipContent>
      </Tooltip>

      <HighImpactDialog
        open={confirmOpen}
        alerts={impactAlerts}
        isPending={toggleMutation.isPending}
        onConfirm={toggle}
        onCancel={closeConfirm}
        title="Inactivar referente"
        confirmLabel="Inactivar"
        description={`El referente "${curricularReference.name}" quedará inactivo. Podrá activarlo de nuevo cuando lo necesite.`}
      />

      <LevelConflictDialog conflict={levelConflict} onCancel={() => setLevelConflict(null)} />
    </>
  )
}
