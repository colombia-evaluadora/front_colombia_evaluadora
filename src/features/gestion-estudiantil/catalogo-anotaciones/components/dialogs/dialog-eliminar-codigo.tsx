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
import { SpinnerIcon, TrashIcon } from "@/components/ui/icons"
import { NoticeBanner, type Notice } from "@/components/notice/notice-banner"
import { useNotify } from "@/components/notice/notice-context"
import { getErrorMessage } from "@/lib/api-client"

import { useEliminarCodigo } from "@/features/gestion-estudiantil/catalogo-anotaciones/api/mutations/codigos"
import type { CodigoRow } from "@/features/gestion-estudiantil/catalogo-anotaciones/api/types"

/** Confirmación destructiva de 2.1. Si el código ya se usó, el backend bloquea con su mensaje. */
export function DialogEliminarCodigo({ codigo, onClose }: { codigo: CodigoRow; onClose: () => void }) {
  const { notify } = useNotify()
  const [notice, setNotice] = useState<Notice | null>(null)
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
        <NoticeBanner notice={notice} onClose={() => setNotice(null)} variant="error" />
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
                onError: (error) => setNotice({ id: Date.now(), message: getErrorMessage(error) }),
              })
            }
          >
            {eliminar.isPending ? <SpinnerIcon data-icon="inline-start" className="animate-spin" /> : <TrashIcon data-icon="inline-start" />}
            Eliminar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
