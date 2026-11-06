import { useState } from "react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { TrashIcon } from "@/components/ui/icons"
import { ErrorNoticeBanner } from "@/components/notice/error-notice-banner"
import { useNotify } from "@/components/notice/notice-context"

import { IconoCarga } from "@/features/gestion-estudiantil/components/icono-carga"
import { useEliminarCodigo } from "@/features/gestion-estudiantil/catalogo-anotaciones/api/mutations/codigos"
import type { CodigoRow } from "@/features/gestion-estudiantil/catalogo-anotaciones/api/types"

/** Confirmación destructiva de 2.1. Si el código ya se usó, el backend bloquea con su mensaje. */
export function DialogEliminarCodigo({ codigo, onClose }: { codigo: CodigoRow; onClose: () => void }) {
  const { notify } = useNotify()
  const [error, setError] = useState<unknown>(null)
  const eliminar = useEliminarCodigo()

  return (
    <Dialog open onOpenChange={(open) => !open && !eliminar.isPending && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Eliminar {codigo.codigo}</DialogTitle>
          <DialogDescription>
            {codigo.codigo} · {codigo.descripcion}
          </DialogDescription>
        </DialogHeader>
        <ErrorNoticeBanner error={error} />
        <DialogFooter>
          <DialogClose render={<Button size="sm" type="button" variant="outline" color="neutral" />}>Cancelar</DialogClose>
          <Button
            size="sm"
            type="button"
            color="destructive"
            disabled={eliminar.isPending}
            onClick={() =>
              eliminar.mutate(codigo.id, {
                onSuccess: () => {
                  notify("Código eliminado.", { variant: "success" })
                  onClose()
                },
                onError: (error) => setError(error),
              })
            }
          >
            <IconoCarga cargando={eliminar.isPending}><TrashIcon data-icon="inline-start" /></IconoCarga>
            Eliminar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
