import { PencilIcon } from "@phosphor-icons/react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"

import type { AreaSubject } from "../../../api/types/academic-period/area-subject"

interface EditAreaSubjectButtonProps {
  areaSubject: AreaSubject
}

// Placeholder: la edición todavía no está implementada. Se deja el botón para
// mantener la fila de acciones y conectar el flujo real más adelante.
export function EditAreaSubjectButton({
  areaSubject,
}: EditAreaSubjectButtonProps) {
  return (
    <Button
      variant="fill"
      color="secondary"
      size="icon"
      className="size-8"
      onClick={() =>
        toast.info(
          `Edición de "${areaSubject.nombreInterno}" próximamente disponible.`
        )
      }
    >
      <span className="sr-only">Editar área/asignatura</span>
      <PencilIcon />
    </Button>
  )
}
