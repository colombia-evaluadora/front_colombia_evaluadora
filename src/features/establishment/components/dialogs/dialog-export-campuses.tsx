import { useState } from "react"

import { DownloadSimpleIcon, FilePdfIcon, FileXlsIcon, SpinnerIcon } from "@/components/ui/icons"

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

import { useExportCampuses } from "../../api/mutations/export-campuses"
import type { CampusesQueryRequest } from "../../api/types/campus"
import type { ExportFormat } from "../../api/types/export"
import { useNotify } from "@/components/notice/notice-context"

interface ExportCampusesDialogProps {
    filters: CampusesQueryRequest["filters"]
}

export function ExportCampusesDialog({ filters }: ExportCampusesDialogProps) {
    const [open, setOpen] = useState(false)
    const { notify } = useNotify()

    const exportAll = useExportCampuses({
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
                        aria-label="Exportar sedes filtradas"
                    >
                        <DownloadSimpleIcon />
                    </Button>
                }
            />
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Exportar</DialogTitle>
                    <DialogDescription>
                        Elige un formato para exportar todas las sedes que coincidan con los filtros activos.
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
