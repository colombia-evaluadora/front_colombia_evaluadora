import type { AreaSubject } from "../../../api/types/area-subject"
import { AreaSubjectFormDialog } from "./dialog-area-subject-form"

interface EditAreaSubjectDialogProps {
  areaSubject: AreaSubject
}

// Edición de un área: mismo diálogo/formulario que el alta, precargado con el
// área y sus asignaturas generales.
export function EditAreaSubjectDialog({ areaSubject }: EditAreaSubjectDialogProps) {
  return <AreaSubjectFormDialog areaSubject={areaSubject} />
}
