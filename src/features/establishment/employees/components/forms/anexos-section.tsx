import { useState, type ReactNode } from "react"

import { Button } from "@/components/ui/button"
import { ConfirmRemoveButton } from "@/components/confirm-remove-button"
import { ControlPointIcon, EyeIcon, FileDownloadOutlinedIcon, FileTextIcon, InfoIcon } from "@/components/ui/icons"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { actionsOverlayClass } from "@/components/table-row-actions"
import { useNotify } from "@/components/notice/notice-context"
import { getErrorMessage } from "@/lib/api-client"
import { fetchArchivoViewUrl } from "@/lib/files"
import { formatBytes } from "@/lib/image-file"

import type { Anexo } from "@/features/establishment/employees/api/types/funcionario"
import { DialogAnexo } from "@/features/establishment/employees/components/dialogs/dialog-anexo"

/** Un anexo del alta, todavía sin subir: se carga después de crear al funcionario. */
export interface AnexoPendiente {
  key: number
  name: string
  description: string
  file: File
}

interface AnexosSectionProps {
  establishmentName: string
  annexes: Anexo[]
  pending: AnexoPendiente[]
  readOnly: boolean
  onAdd: (values: { name: string; description: string; file: File }) => Promise<void>
  onRemove: (annexId: number) => Promise<void>
  onRemovePending: (key: number) => void
}

/** Descarga por un enlace temporal: la URL es del mismo origen (`/api/...` o `blob:`), así que `download` se respeta. */
function descargarUrl(url: string, fileName: string) {
  const a = document.createElement("a")
  a.href = url
  a.download = fileName
  a.rel = "noopener"
  document.body.append(a)
  a.click()
  a.remove()
}

/**
 * Ver y descargar (Regla 81). Los anexos guardados piden un token de vista a file-service; los
 * pendientes del alta todavía no se subieron y se abren desde el archivo elegido (URL `blob:`,
 * que se libera un minuto después para no cortar la pestaña que lo está cargando).
 */
async function verAnexo(fileId: number) {
  const { url } = await fetchArchivoViewUrl(fileId)
  window.open(url, "_blank", "noopener,noreferrer")
}

async function descargarAnexo(fileId: number, fileName: string) {
  const { url } = await fetchArchivoViewUrl(fileId)
  descargarUrl(url, fileName)
}

function conArchivoLocal(file: File, accion: (url: string) => void) {
  const url = URL.createObjectURL(file)
  accion(url)
  setTimeout(() => URL.revokeObjectURL(url), 60_000)
}

function AccionIcono({ label, onClick, children }: { label: string; onClick: () => void; children: ReactNode }) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={<Button type="button" variant="ghost" color="neutral" size="icon-sm" aria-label={label} onClick={onClick} />}
      >
        {children}
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  )
}

/** Documentos anexos del funcionario (Regla 81): cada establecimiento ve, agrega y quita los suyos. */
export function AnexosSection({
  establishmentName,
  annexes,
  pending,
  readOnly,
  onAdd,
  onRemove,
  onRemovePending,
}: AnexosSectionProps) {
  const { notify } = useNotify()
  const [open, setOpen] = useState(false)
  const empty = annexes.length === 0 && pending.length === 0

  // La pantalla tiene su NoticeProvider: los errores de axios no salen solos.
  const intentar = (accion: () => Promise<void>) => {
    accion().catch((error) => notify(getErrorMessage(error), { variant: "error" }))
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-3 md:flex-row md:items-center">
        <div className="flex flex-1 items-center gap-2 rounded-md border border-blue-stroke bg-blue-22 px-3 py-2 text-sm">
          <InfoIcon className="size-4 shrink-0 text-blue" aria-hidden />
          Solo se ven los documentos que cargó {establishmentName || "este establecimiento"}.
        </div>
        {readOnly ? null : (
          <Button type="button" variant="fill" color="primary" size="sm" onClick={() => setOpen(true)}>
            <ControlPointIcon data-icon="inline-start" />
            Agregar documento
          </Button>
        )}
      </div>

      {empty ? (
        <p className="py-4 text-center text-sm text-muted-foreground">El funcionario no tiene documentos anexos.</p>
      ) : (
        <div className="overflow-hidden rounded-lg border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre documento</TableHead>
                <TableHead>Descripción</TableHead>
                <TableHead>Archivo</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {annexes.map((annex) => (
                <TableRow key={annex.id} className="group/row">
                  <TableCell>{annex.name}</TableCell>
                  <TableCell className="whitespace-normal">{annex.description}</TableCell>
                  <TableCell className="relative">
                    <span className="inline-flex items-center gap-1.5">
                      <FileTextIcon className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                      {annex.fileName}
                      {annex.size != null ? ` · ${formatBytes(annex.size)}` : ""}
                    </span>
                    <div className={actionsOverlayClass(false, "background")}>
                      <AccionIcono label="Ver archivo" onClick={() => intentar(() => verAnexo(annex.fileId))}>
                        <EyeIcon />
                      </AccionIcono>
                      <AccionIcono
                        label="Descargar archivo"
                        onClick={() => intentar(() => descargarAnexo(annex.fileId, annex.fileName))}
                      >
                        <FileDownloadOutlinedIcon />
                      </AccionIcono>
                      {readOnly ? null : (
                        <ConfirmRemoveButton
                          label="Eliminar documento"
                          title="Eliminar documento anexo"
                          description={`Se quitará «${annex.name}» de los documentos del funcionario.`}
                          color="destructive"
                          onConfirm={() => onRemove(annex.id)}
                        />
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {pending.map((annex) => (
                <TableRow key={`pendiente-${annex.key}`} className="group/row">
                  <TableCell>{annex.name}</TableCell>
                  <TableCell className="whitespace-normal">{annex.description}</TableCell>
                  <TableCell className="relative">
                    <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                      <FileTextIcon className="size-4 shrink-0" aria-hidden />
                      {annex.file.name} · {formatBytes(annex.file.size)} · se carga al guardar
                    </span>
                    <div className={actionsOverlayClass(false, "background")}>
                      <AccionIcono
                        label="Ver archivo"
                        onClick={() => conArchivoLocal(annex.file, (url) => window.open(url, "_blank", "noopener,noreferrer"))}
                      >
                        <EyeIcon />
                      </AccionIcono>
                      <AccionIcono
                        label="Descargar archivo"
                        onClick={() => conArchivoLocal(annex.file, (url) => descargarUrl(url, annex.file.name))}
                      >
                        <FileDownloadOutlinedIcon />
                      </AccionIcono>
                      {readOnly ? null : (
                        <ConfirmRemoveButton
                          label="Quitar documento"
                          title="Quitar documento anexo"
                          description={`Se quitará «${annex.name}».`}
                          color="destructive"
                          onConfirm={() => onRemovePending(annex.key)}
                        />
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <DialogAnexo open={open} onOpenChange={setOpen} onAdd={onAdd} />
    </div>
  )
}
