import { useState } from "react"

import { useNotify } from "@/components/notice/notice-context"
import { TrashIcon } from "@/components/ui/icons"

import { DialogoOperacionShell } from "@/features/gestion-estudiantil/commons/components/dialogo-operacion-shell"
import { useEliminarProceso, type Catalogo } from "@/features/gestion-estudiantil/configuracion/api/mutations/proceso"

interface Props {
  catalogo: Catalogo
  id: number
  nombre: string
  onClose: () => void
}

/** Confirmación destructiva; si ya se usó en procesos, el backend bloquea con su mensaje (Regla 4). */
export function DialogEliminarProceso({ catalogo, id, nombre, onClose }: Props) {
  const { notify } = useNotify()
  const [error, setError] = useState<unknown>(null)
  const eliminar = useEliminarProceso()
  const que = catalogo === "clasificaciones" ? "clasificación" : "sanción"

  return (
    <DialogoOperacionShell
      titulo={`Eliminar ${que}`}
      resumen={`¿Eliminar la ${que} «${nombre}»? Esta acción no se puede deshacer.`}
      onClose={onClose}
      error={error}
      pending={eliminar.isPending}
      className="sm:max-w-md"
      confirmar={{
        label: "Eliminar",
        color: "destructive",
        icon: <TrashIcon data-icon="inline-start" />,
        onClick: () =>
          eliminar.mutate(
            { catalogo, id },
            {
              onSuccess: () => {
                notify(catalogo === "clasificaciones" ? "Clasificación eliminada." : "Sanción eliminada.", { variant: "success" })
                onClose()
              },
              onError: setError,
            },
          ),
      }}
    >
      {null}
    </DialogoOperacionShell>
  )
}
