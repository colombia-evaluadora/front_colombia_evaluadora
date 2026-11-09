import { useState } from "react"

import { Button } from "@/components/ui/button"
import { ConfirmRemoveButton } from "@/components/confirm-remove-button"
import { ControlPointIcon, FileTextIcon, InfoIcon } from "@/components/ui/icons"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
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

async function abrirAnexo(fileId: number) {
  const { url } = await fetchArchivoViewUrl(fileId)
  window.open(url, "_blank", "noopener,noreferrer")
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
  const [open, setOpen] = useState(false)
  const empty = annexes.length === 0 && pending.length === 0

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
                {readOnly ? null : <TableHead className="w-12" />}
              </TableRow>
            </TableHeader>
            <TableBody>
              {annexes.map((annex) => (
                <TableRow key={annex.id}>
                  <TableCell>{annex.name}</TableCell>
                  <TableCell className="whitespace-normal">{annex.description}</TableCell>
                  <TableCell>
                    <button
                      type="button"
                      className="inline-flex items-center gap-1.5 text-primary hover:underline"
                      onClick={() => void abrirAnexo(annex.fileId)}
                    >
                      <FileTextIcon className="size-4" aria-hidden />
                      {annex.fileName}
                      {annex.size != null ? ` · ${formatBytes(annex.size)}` : ""}
                    </button>
                  </TableCell>
                  {readOnly ? null : (
                    <TableCell>
                      <ConfirmRemoveButton
                        label="Eliminar documento"
                        title="Eliminar documento anexo"
                        description={`Se quitará «${annex.name}» de los documentos del funcionario.`}
                        onConfirm={() => onRemove(annex.id)}
                      />
                    </TableCell>
                  )}
                </TableRow>
              ))}
              {pending.map((annex) => (
                <TableRow key={`pendiente-${annex.key}`}>
                  <TableCell>{annex.name}</TableCell>
                  <TableCell className="whitespace-normal">{annex.description}</TableCell>
                  <TableCell>
                    <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                      <FileTextIcon className="size-4" aria-hidden />
                      {annex.file.name} · {formatBytes(annex.file.size)} · se carga al guardar
                    </span>
                  </TableCell>
                  {readOnly ? null : (
                    <TableCell>
                      <ConfirmRemoveButton
                        label="Quitar documento"
                        title="Quitar documento anexo"
                        description={`Se quitará «${annex.name}».`}
                        onConfirm={() => onRemovePending(annex.key)}
                      />
                    </TableCell>
                  )}
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
