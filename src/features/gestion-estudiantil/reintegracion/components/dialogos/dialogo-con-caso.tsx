import type { ReactNode } from "react"

import { ErrorNoticeBanner } from "@/components/notice/error-notice-banner"
import { Button } from "@/components/ui/button"
import { Dialog, DialogClose, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Skeleton } from "@/components/ui/skeleton"

import { useCasoDialogoQuery } from "@/features/gestion-estudiantil/reintegracion/api/query/use-casos-query"
import type { CasoDetalle } from "@/features/gestion-estudiantil/reintegracion/api/types"

interface Props {
  casoId: number
  /** Título genérico mientras llega el caso (el diálogo real pone el suyo con el nombre del estudiante). */
  titulo: string
  onClose: () => void
  children: (caso: CasoDetalle) => ReactNode
}

/**
 * Carga el caso que necesita un diálogo (razones, estados siguientes, retiro, acta…) y monta el diálogo solo
 * cuando llega, para que su estado arranque con datos reales y limpio en cada apertura.
 */
export function DialogoConCaso({ casoId, titulo, onClose, children }: Props) {
  const q = useCasoDialogoQuery(casoId)
  if (q.data) return <>{children(q.data)}</>
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{titulo}</DialogTitle>
        </DialogHeader>
        {q.isError ? <ErrorNoticeBanner error={q.error} /> : <Skeleton className="h-40" />}
        <DialogFooter>
          <DialogClose render={<Button size="sm" type="button" variant="outline" color="neutral" />}>Cerrar</DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
