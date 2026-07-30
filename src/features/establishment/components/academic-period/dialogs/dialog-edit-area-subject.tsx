import type { AreaSubject } from "../../../api/types/academic-period/area-subject"
import { AreaSubjectFormDialog } from "./area-subject-form-dialog"

interface EditAreaSubjectDialogProps {
  areaSubject: AreaSubject
}

// Edición de un área: mismo diálogo/formulario que el alta, precargado con el
// área y sus asignaturas generales.
export function EditAreaSubjectDialog({
  areaSubject,
}: EditAreaSubjectDialogProps) {
  return <AreaSubjectFormDialog areaSubject={areaSubject} />
}
