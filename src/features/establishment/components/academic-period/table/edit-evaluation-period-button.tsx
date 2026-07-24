import { PencilIcon } from "@phosphor-icons/react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"

import type { EvaluationPeriod } from "../../../api/types/academic-period/evaluation-period"

interface EditEvaluationPeriodButtonProps {
  period: EvaluationPeriod
}

// Placeholder: la edición todavía no está implementada. Se deja el botón para
// mantener la fila de acciones y conectar el flujo real más adelante.
export function EditEvaluationPeriodButton({
  period,
}: EditEvaluationPeriodButtonProps) {
  return (
    <Button
      variant="fill"
      color="secondary"
      size="icon"
      className="size-8"
      onClick={() =>
        toast.info(`Edición de "${period.nombre}" próximamente disponible.`)
      }
    >
      <span className="sr-only">Editar periodo de evaluación</span>
      <PencilIcon />
    </Button>
  )
}
