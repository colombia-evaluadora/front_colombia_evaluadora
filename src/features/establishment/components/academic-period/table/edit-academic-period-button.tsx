import { PencilIcon } from "@phosphor-icons/react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"

import type { AcademicPeriod } from "../../../api/types/academic-period/academic-period"

interface EditAcademicPeriodButtonProps {
  period: AcademicPeriod
}

// Placeholder: la edición todavía no está implementada. Se deja el botón para
// mantener la fila de acciones y conectar el flujo real más adelante.
export function EditAcademicPeriodButton({
  period,
}: EditAcademicPeriodButtonProps) {
  return (
    <Button
      variant="fill"
      color="secondary"
      size="icon"
      className="size-8"
      onClick={() =>
        toast.info(`Edición de "${period.name}" próximamente disponible.`)
      }
    >
      <span className="sr-only">Editar periodo</span>
      <PencilIcon />
    </Button>
  )
}
