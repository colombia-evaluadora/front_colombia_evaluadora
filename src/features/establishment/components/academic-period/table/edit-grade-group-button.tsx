import { PencilIcon } from "@phosphor-icons/react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"

import type { GradeGroup } from "../../../api/types/academic-period/grade-group"

interface EditGradeGroupButtonProps {
  gradeGroup: GradeGroup
}

export function EditGradeGroupButton({ gradeGroup }: EditGradeGroupButtonProps) {
  return (
    <Button
      variant="fill"
      color="secondary"
      size="icon"
      className="size-8"
      onClick={() =>
        toast.info(`Edición del grupo "${gradeGroup.codigo}" próximamente disponible.`)
      }
    >
      <span className="sr-only">Editar grupo</span>
      <PencilIcon />
    </Button>
  )
}
