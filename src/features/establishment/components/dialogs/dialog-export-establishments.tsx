import { useState } from "react"

import { DownloadSimpleIcon, FilePdfIcon, FileXlsIcon, SpinnerIcon } from "@/components/ui/icons"
import { toast } from "sonner"

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

import { useExportEstablishments } from "../../api/mutations/export-establishments"
import type { EstablishmentsQueryRequest } from "../../api/types/establishment"
import type { ExportFormat } from "../../api/types/export"

interface ExportEstablishmentsDialogProps {
    filters: EstablishmentsQueryRequest["filters"]
}

export function ExportEstablishmentsDialog({ filters }: ExportEstablishmentsDialogProps) {
    const [open, setOpen] = useState(false)

    const exportAll = useExportEstablishments({
        mutationConfig: {
            onSuccess: (result) => {
                if (result.status === "error") {
                    toast.error(result.message)
                    return
                }
                toast.success(result.message)
                setOpen(false)
            },
        },
    })

    function handleExport(format: ExportFormat) {
        exportAll.mutate({ filters, format })
    }

    // Los dos botones comparten la misma mutación, así que `isPending` sola no
    // distingue cuál se pulsó. `variables` guarda el input en vuelo — con eso
    // el spinner sale solo en el botón que disparó la exportación.
    const pendingFormat = exportAll.isPending ? exportAll.variables?.format : undefined

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger
                render={
                    <Button
                        variant="outline"
                        color="muted"
                        size="icon-sm"
                        aria-label="Exportar establecimientos filtrados"
                    >
                        <DownloadSimpleIcon />
                    </Button>
                }
            />
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Exportar establecimientos filtrados</DialogTitle>
                    <DialogDescription>
                        Elegí un formato para exportar todos los establecimientos que coincidan con los filtros activos.
                    </DialogDescription>
                </DialogHeader>
                <DialogFooter className="sm:justify-between">
                    <DialogClose render={<Button type="button" variant="ghost" />}>Cancelar</DialogClose>
                    <div className="flex flex-col-reverse gap-2 sm:flex-row">
                        <Button
                            type="button"
                            variant="outline"
                            disabled={exportAll.isPending}
                            aria-busy={pendingFormat === "excel"}
                            onClick={() => handleExport("excel")}
                        >
                            {pendingFormat === "excel" ? (
                                <SpinnerIcon data-icon="inline-start" className="animate-spin" />
                            ) : (
                                <FileXlsIcon data-icon="inline-start" />
                            )}
                            Excel
                        </Button>
                        <Button
                            type="button"
                            color="primary"
                            disabled={exportAll.isPending}
                            aria-busy={pendingFormat === "pdf"}
                            onClick={() => handleExport("pdf")}
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
