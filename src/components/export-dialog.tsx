import { useState, type ReactNode } from "react"
import { useMutation } from "@tanstack/react-query"

import {
  FileDownloadOutlinedIcon,
  FilePdfIcon,
  FileXlsIcon,
  SpinnerIcon,
} from "@/components/ui/icons"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { useNotify } from "@/components/notice/notice-context"
import { getErrorMessage } from "@/lib/api-client"
import type { ExportFormat, ExportResult } from "@/features/establishment/institution/api/types/export"

interface ExportDialogProps {
  /** Tooltip y aria-label del botón. */
  label: string
  description: ReactNode
  onExport: (format: ExportFormat) => Promise<ExportResult>
  /** Con `count` el botón muestra la cantidad seleccionada. */
  count?: number
  onExported?: () => void
  errorMessage?: string
  /** Abierto encima de otro Dialog: necesita su propio overlay. */
  nested?: boolean
  disabled?: boolean
  /** Reemplaza al `label` solo en el tooltip (p. ej. el aviso de "solo en línea"). */
  tooltip?: string | null
}

export function ExportDialog({
  label,
  description,
  onExport,
  count,
  onExported,
  errorMessage,
  nested = false,
  disabled = false,
  tooltip,
}: ExportDialogProps) {
  const [open, setOpen] = useState(false)
  const { notify } = useNotify()

  const exportar = useMutation({
    mutationFn: onExport,
    onSuccess: (result) => {
      if (result.status === "error") {
        notify(result.message, { variant: "error" })
        return
      }
      notify(result.message)
      setOpen(false)
      onExported?.()
    },
    onError: (error) => {
      notify(errorMessage ?? getErrorMessage(error), { variant: "error" })
    },
  })

  // Ambos botones comparten la mutación: `variables` dice cuál disparó el spinner.
  const pendingFormat = exportar.isPending ? exportar.variables : undefined
  const seleccion = count != null

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Tooltip>
        <TooltipTrigger
          render={
            <DialogTrigger
              render={
                <Button
                  variant="outline"
                  color="muted"
                  size={seleccion ? "sm" : "icon-sm"}
                  aria-label={label}
                  disabled={disabled}
                />
              }
            />
          }
        >
          {seleccion ? (
            <>
              <FileDownloadOutlinedIcon data-icon="inline-start" aria-hidden="true" />
              <span aria-hidden="true" className="tabular-nums">
                ({count})
              </span>
            </>
          ) : (
            <FileDownloadOutlinedIcon />
          )}
        </TooltipTrigger>
        <TooltipContent>{tooltip ?? label}</TooltipContent>
      </Tooltip>
      {nested && (
        <DialogPortal>
          <DialogOverlay forceRender className="bg-black/30" />
        </DialogPortal>
      )}
      <DialogContent showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>Exportar</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <DialogFooter className="sm:justify-between">
          <DialogClose render={<Button size="sm" type="button" variant="ghost" />}>
            Cancelar
          </DialogClose>
          <div className="flex flex-col-reverse gap-2 sm:flex-row">
            <Button
              size="sm"
              type="button"
              variant="outline"
              disabled={exportar.isPending}
              aria-busy={pendingFormat === "excel"}
              onClick={() => exportar.mutate("excel")}
            >
              {pendingFormat === "excel" ? (
                <SpinnerIcon data-icon="inline-start" className="animate-spin" />
              ) : (
                <FileXlsIcon data-icon="inline-start" />
              )}
              Excel
            </Button>
            <Button
              size="sm"
              type="button"
              color="primary"
              disabled={exportar.isPending}
              aria-busy={pendingFormat === "pdf"}
              onClick={() => exportar.mutate("pdf")}
            >
              {pendingFormat === "pdf" ? (
                <SpinnerIcon data-icon="inline-start" className="animate-spin" />
              ) : (
                <FilePdfIcon data-icon="inline-start" />
              )}
              PDF
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
