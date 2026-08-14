import type { AreaSubject } from "@/features/establishment/academic-period/api/types/area-subject"
import { AreaSubjectFormDialog } from "@/features/establishment/academic-period/components/dialogs/dialog-area-subject-form"

interface EditAreaSubjectDialogProps {
  areaSubject: AreaSubject
  // Necesario para que `EspecialidadSelect` (dentro de la tabla de
  // asignaturas del form) pueda resolver las opciones de énfasis contra
  // `fn_especialidad_enfasis_listar`. Antes no se propagaba y la query
  // devolvía `[]`, dejando el select de énfasis vacío en el modal de
  // editar — solo aparecía en el alta (que sí forwarda el id).
  academicPeriodId?: number
}

// Edición de un área: mismo diálogo/formulario que el alta, precargado con el
// área y sus asignaturas generales.
export function EditAreaSubjectDialog({ areaSubject, academicPeriodId }: EditAreaSubjectDialogProps) {
  return <AreaSubjectFormDialog areaSubject={areaSubject} academicPeriodId={academicPeriodId} />
}
