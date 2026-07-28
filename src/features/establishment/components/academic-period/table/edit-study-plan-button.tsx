import { PencilIcon } from "@/components/ui/icons"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"

import type { StudyPlanItem } from "../../../api/types/academic-period/study-plan"

interface EditStudyPlanButtonProps {
  item: StudyPlanItem
}

export function EditStudyPlanButton({ item }: EditStudyPlanButtonProps) {
  return (
    <Button
      variant="fill"
      color="secondary"
      size="icon"
      className="size-8"
      onClick={() =>
        toast.info(`Edición de "${item.asignatura}" próximamente disponible.`)
      }
    >
      <span className="sr-only">Editar asignatura</span>
      <PencilIcon />
    </Button>
  )
}
