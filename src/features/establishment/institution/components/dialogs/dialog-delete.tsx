import { SUCCESS_MESSAGES } from "@/lib/success-messages"
import { establishmentsRoute } from "@/router"

import { useDelete } from "@/features/establishment/institution/api/mutations/delete"
import type { Establishment } from "@/features/establishment/institution/api/types/establishment"
import { DeleteEntityDialog } from "@/features/establishment/shared/components/delete-entity-dialog"

interface DeleteEstablishmentDialogProps {
  establishment: Establishment
}

export function DeleteEstablishmentDialog({
  establishment,
}: DeleteEstablishmentDialogProps) {
  const navigate = establishmentsRoute.useNavigate()
  const deleteMutation = useDelete()

  return (
    <DeleteEntityDialog
      id={establishment.id}
      name={establishment.name}
      description={
        <>
          Se eliminará el establecimiento educativo{" "}
          {establishment.name}. Esta acción no se puede deshacer.
        </>
      }
      menuCode="ESTABLECIMIENTO"
      successMessage={SUCCESS_MESSAGES.establishment.deleted}
      mutation={deleteMutation}
      onDeleted={() =>
        navigate({ search: (prev) => ({ ...prev, page: 0 }), replace: true })
      }
    />
  )
}
