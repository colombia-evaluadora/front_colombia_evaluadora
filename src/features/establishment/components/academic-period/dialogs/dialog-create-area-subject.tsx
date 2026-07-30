import { AreaSubjectFormDialog } from "./dialog-area-subject-form"

interface CreateAreaSubjectDialogProps {
  academicPeriodId?: number
}

// Alta de un área: reusa el mismo diálogo/formulario que la edición.
export function CreateAreaSubjectDialog({
  academicPeriodId,
}: CreateAreaSubjectDialogProps) {
  return <AreaSubjectFormDialog academicPeriodId={academicPeriodId} />
}
