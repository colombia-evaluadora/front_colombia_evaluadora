import { useState } from "react"

import { useNotify } from "@/components/notice/notice-context"
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { PrinterIcon, SpinnerIcon, WarningIcon, XIcon } from "@/components/ui/icons"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { downloadReport } from "@/lib/report-client"

interface PrintReportButtonProps {
  label: string
  report: "periodo-planes-estudio" | "periodo-horarios"
  filters: Record<string, unknown>
  /** Sin contenido no hay qué imprimir: el botón queda deshabilitado con este porqué. */
  emptyReason?: string
  /** Advertencia con decisión antes de generar (Regla 74). */
  confirm?: { title: string; description: string }
}

// "Imprimir plan de estudio" e "Imprimir horario" (Sección 5.7): el mismo
// reporte de "Generar" del período, con un solo grado o grupo.
export function PrintReportButton({
  label,
  report,
  filters,
  emptyReason,
  confirm,
}: PrintReportButtonProps) {
  const { notify } = useNotify()
  const [isGenerating, setIsGenerating] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)

  async function generate() {
    setIsGenerating(true)
    const result = await downloadReport(report, { format: "pdf", filters })
    setIsGenerating(false)
    if (result.status === "error") notify(result.message, { variant: "error" })
  }

  const button = (
    <Button
      size="sm"
      variant="outline"
      color="neutral"
      disabled={isGenerating || emptyReason != null}
      aria-busy={isGenerating}
      onClick={() => (confirm ? setConfirmOpen(true) : generate())}
    >
      {isGenerating ? (
        <SpinnerIcon data-icon="inline-start" className="animate-spin" />
      ) : (
        <PrinterIcon data-icon="inline-start" />
      )}
      {label}
    </Button>
  )

  return (
    <>
      {emptyReason ? (
        <Tooltip>
          <TooltipTrigger render={<span tabIndex={0} />}>{button}</TooltipTrigger>
          <TooltipContent>{emptyReason}</TooltipContent>
        </Tooltip>
      ) : (
        button
      )}
      {confirm && (
        <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <WarningIcon className="size-5 shrink-0 text-orange" aria-hidden />
                {confirm.title}
              </AlertDialogTitle>
              <AlertDialogDescription>{confirm.description}</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel variant="outline" color="neutral">
                <XIcon data-icon="inline-start" />
                Cancelar
              </AlertDialogCancel>
              <Button
                color="primary"
                onClick={() => {
                  setConfirmOpen(false)
                  generate()
                }}
              >
                <PrinterIcon data-icon="inline-start" />
                Generar
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </>
  )
}
