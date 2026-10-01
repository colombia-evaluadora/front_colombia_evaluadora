import { useState } from "react"

import { Button } from "@/components/ui/button"
import { CheckCircleIcon, ProhibitIcon, SpinnerIcon } from "@/components/ui/icons"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { useNotify } from "@/components/notice/notice-context"
import { getErrorMessage } from "@/lib/api-client"

import { useToggleStatus } from "@/features/academic-management/curricular-references/api/mutations/use-toggle-status"
import { fetchCurricularReferenceImpact } from "@/features/academic-management/curricular-references/api/query/fetch-impact"
import {
  buildHighImpactAlerts,
  type HighImpactAlert,
} from "@/features/academic-management/curricular-references/api/high-impact-alerts"
import { HighImpactDialog } from "@/features/academic-management/curricular-references/components/dialogs/dialog-high-impact"
import { LevelConflictDialog } from "@/features/academic-management/curricular-references/components/dialogs/dialog-level-conflict"
import {
  toLevelConflict,
  type LevelConflict,
} from "@/features/academic-management/curricular-references/api/level-conflict"
import type { CurricularReference } from "@/features/academic-management/curricular-references/api/types/curricular-reference"

// Activar/Inactivar directo desde la fila, sin abrir el formulario.
export function ToggleStatusButton({ curricularReference }: { curricularReference: CurricularReference }) {
  const { notify } = useNotify()
  const nextActive = !curricularReference.active
  const label = nextActive ? "Activar" : "Inactivar"

  // Inactivar con unidades/actividades pasa por el modal (Regla 5).
  const [impactAlerts, setImpactAlerts] = useState<HighImpactAlert[]>([])
  const [isCheckingImpact, setIsCheckingImpact] = useState(false)
  // Activar sobre un nivel ya gobernado abre el modal de la Regla 7.
  const [levelConflict, setLevelConflict] = useState<LevelConflict | null>(null)

  async function handleError(message: string) {
    setImpactAlerts([])
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
        setImpactAlerts([])
        notify(nextActive ? "El referente curricular se activó." : "El referente curricular se inactivó.")
      },
      onError: (error) => void handleError(getErrorMessage(error)),
    },
  })

  function toggle() {
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
      if (alerts.length > 0) {
        setImpactAlerts(alerts)
        return
      }
    } catch (error) {
      notify(getErrorMessage(error), { variant: "error" })
      return
    } finally {
      setIsCheckingImpact(false)
    }
    toggle()
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
              disabled={isPending}
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
        <TooltipContent>{label}</TooltipContent>
      </Tooltip>

      <HighImpactDialog
        open={impactAlerts.length > 0}
        alerts={impactAlerts}
        isPending={toggleMutation.isPending}
        onConfirm={toggle}
        onCancel={() => setImpactAlerts([])}
      />

      <LevelConflictDialog conflict={levelConflict} onCancel={() => setLevelConflict(null)} />
    </>
  )
}
