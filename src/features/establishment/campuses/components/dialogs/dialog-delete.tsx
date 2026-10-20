import { SUCCESS_MESSAGES } from "@/lib/success-messages"
import { campusesRoute } from "@/router"

import { useDelete } from "@/features/establishment/campuses/api/mutations/delete"
import type { Campus } from "@/features/establishment/campuses/api/types/campus"
import { DeleteEntityDialog } from "@/features/establishment/shared/components/delete-entity-dialog"

interface DeleteCampusDialogProps {
  campus: Campus
}

export function DeleteCampusDialog({ campus }: DeleteCampusDialogProps) {
  const navigate = campusesRoute.useNavigate()
  const deleteMutation = useDelete()

  return (
    <DeleteEntityDialog
      id={campus.id}
      name={campus.name}
      description={
        <>
          Se eliminará la sede educativa {campus.name}. Esta
          acción no se puede deshacer.
        </>
      }
      menuCode="SEDES_EDUCATIVAS"
      successMessage={SUCCESS_MESSAGES.campus.deleted}
      mutation={deleteMutation}
      onDeleted={() =>
        navigate({ search: (prev) => ({ ...prev, page: 0 }), replace: true })
      }
    />
  )
}
