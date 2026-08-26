import { useState } from "react"

import { Button } from "@/components/ui/button"
import { FolderOpenIcon } from "@/components/ui/icons"

import {
  SupportFilesSheet,
  type MatriculaSupportFiles,
} from "@/features/coverage/components/forms/form-create-matricula"
import type { Matricula } from "@/features/coverage/api/types/matricula"

function createEmptySupportFiles(): MatriculaSupportFiles {
  return {
    studentIdDocument: [],
    previousYearCertificate: [],
    medicalCertificate: [],
    studentPhoto: [],
    otherDocuments: [],
  }
}

interface FilesMatriculaDialogProps {
  matricula: Matricula
  /** "icon" (fila de la tabla) o "button" (barra de detalle/edición). */
  trigger?: "icon" | "button"
}

/**
 * Botón de la tabla (o de la barra de detalle/edición) que abre el sheet de
 * "Archivos de soporte" — el mismo que usa el alta, reutilizado acá. No hay
 * endpoint todavía para leer los documentos que se cargaron al matricular,
 * así que arranca vacío por fila (se pierde al cerrar, igual que en el alta
 * antes de guardar).
 */
export function FilesMatriculaDialog({ matricula, trigger = "icon" }: FilesMatriculaDialogProps) {
  const [open, setOpen] = useState(false)
  const [files, setFiles] = useState<MatriculaSupportFiles>(createEmptySupportFiles)
  const fullName = `${matricula.firstName} ${matricula.lastName}`

  return (
    <>
      {trigger === "button" ? (
        <Button
          type="button"
          variant="outline"
          color="primary"
          size="sm"
          aria-label={`Archivos de ${fullName}`}
          onClick={() => setOpen(true)}
        >
          <FolderOpenIcon data-icon="inline-start" />
          Archivos
        </Button>
      ) : (
        <Button
          type="button"
          variant="ghost"
          color="neutral"
          size="icon-sm"
          aria-label={`Archivos de ${fullName}`}
          onClick={() => setOpen(true)}
        >
          <FolderOpenIcon />
        </Button>
      )}
      <SupportFilesSheet open={open} onOpenChange={setOpen} value={files} onChange={setFiles} />
    </>
  )
}
