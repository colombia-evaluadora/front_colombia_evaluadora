import { useState } from "react"

import { FileDownloadOutlinedIcon, SpinnerIcon } from "@/components/ui/icons"

import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"

import { useExport } from "@/features/academic-management/curricular-references/api/mutations/export"
import type { CurricularReferencesQueryRequest } from "@/features/academic-management/curricular-references/api/types/curricular-reference"
import { useNotify } from "@/components/notice/notice-context"

interface ExportCurricularReferencesDialogProps {
  filters: CurricularReferencesQueryRequest["filters"]
}

export function ExportCurricularReferencesDialog({ filters }: ExportCurricularReferencesDialogProps) {
  const [open, setOpen] = useState(false)
  const { notify } = useNotify()

  const exportAll = useExport({
    mutationConfig: {
      onSuccess: (result) => {
        if (result.status === "error") {
          notify(result.message, { variant: "error" })
          return
        }
        notify(result.message)
        setOpen(false)
      },
    },
  })

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button
            variant="outline"
            color="muted"
            size="icon-sm"
            aria-label="Exportar referentes curriculares filtrados"
            className="[&_svg:not([class*='size-'])]:size-4"
          >
            <FileDownloadOutlinedIcon />
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Exportar</DialogTitle>
          <DialogDescription>
            Exporta todos los referentes curriculares que coincidan con los filtros activos.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="sm:justify-between">
          <DialogClose render={<Button size="sm" type="button" variant="ghost" />}>
            Cancelar
          </DialogClose>
          <Button
            size="sm"
            type="button"
            color="primary"
            disabled={exportAll.isPending}
            aria-busy={exportAll.isPending}
            onClick={() => exportAll.mutate({ filters })}
          >
            {exportAll.isPending ? (
              <SpinnerIcon data-icon="inline-start" className="animate-spin" />
            ) : (
              <FileDownloadOutlinedIcon data-icon="inline-start" />
            )}
            Exportar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
