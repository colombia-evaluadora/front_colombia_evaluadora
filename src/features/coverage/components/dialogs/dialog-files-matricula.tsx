import { useState } from "react"

import { Button } from "@/components/ui/button"
import { FolderOpenIcon } from "@/components/ui/icons"
import { useNotify } from "@/components/notice/notice-context"

import { getErrorMessage } from "@/lib/api-client"
import { useMatriculaDetailQuery } from "@/features/coverage/api/query/use-matricula-detail-query"
import { useUpdateMatriculaFiles } from "@/features/coverage/api/mutations/update-matricula-files"
import {
  SupportFilesSheet,
  groupExistingFilesByKey,
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
  editable?: boolean
}

/**
 * Botón de la tabla (o de la barra de detalle/edición) que abre el sheet de
 * "Archivos de soporte" — el mismo que usa el alta, reutilizado acá. Los
 * archivos ya cargados se traen del GET de detalle (`archivos[]`).
 */
export function FilesMatriculaDialog({ matricula, trigger = "icon", editable = false }: FilesMatriculaDialogProps) {
  const [open, setOpen] = useState(false)
  const [files, setFiles] = useState<MatriculaSupportFiles>(createEmptySupportFiles)
  const [removedIds, setRemovedIds] = useState<Set<number>>(new Set())
  const { notify } = useNotify()
  // Solo se pide mientras el sheet está abierto -- evita una consulta por
  // fila de la tabla apenas se renderiza.
  const { data } = useMatriculaDetailQuery(open ? matricula.id : undefined)
  const fullName = `${matricula.firstName} ${matricula.lastName}`

  const updateFiles = useUpdateMatriculaFiles({
    mutationConfig: {
      onError: (error) => notify(getErrorMessage(error), { variant: "error" }),
      onSuccess: () => {
        notify("Archivos actualizados correctamente.")
        setFiles(createEmptySupportFiles())
        setRemovedIds(new Set())
      },
    },
  })

  function toggleRemoveExisting(fileId: number) {
    setRemovedIds((prev) => {
      const next = new Set(prev)
      if (next.has(fileId)) next.delete(fileId)
      else next.add(fileId)
      return next
    })
  }

  const hasPendingChanges =
    files.studentIdDocument.length > 0 ||
    files.previousYearCertificate.length > 0 ||
    files.medicalCertificate.length > 0 ||
    files.studentPhoto.length > 0 ||
    files.otherDocuments.length > 0 ||
    removedIds.size > 0

  function handleSave() {
    if (data?.status !== "ok" || !data.details || !hasPendingChanges) return
    const byCategory = groupExistingFilesByKey(data.files)
    updateFiles.mutate({
      id: matricula.id,
      values: data.details,
      pkTpadre: data.details.pkTpadre,
      pkUsuarioAcudiente: data.details.pkUsuarioAcudiente,
      studentIdDocument: files.studentIdDocument[0] ?? null,
      previousYearCertificate: files.previousYearCertificate[0] ?? null,
      medicalCertificate: files.medicalCertificate[0] ?? null,
      studentPhoto: files.studentPhoto[0] ?? null,
      deleteMedicalCertificate: byCategory.medicalCertificate.some((f) => removedIds.has(f.id)),
      deleteStudentPhoto: byCategory.studentPhoto.some((f) => removedIds.has(f.id)),
      otrosDocumentosANuevos: files.otherDocuments,
      otrosDocumentosARemover: byCategory.otherDocuments.filter((f) => removedIds.has(f.id)).map((f) => f.id),
    })
  }

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
      <SupportFilesSheet
        open={open}
        onOpenChange={setOpen}
        value={files}
        onChange={setFiles}
        existingFiles={data?.status === "ok" ? data.files : undefined}
        editable={editable}
        viewOnly={trigger === "icon"}
        removedExistingIds={removedIds}
        onToggleRemoveExisting={toggleRemoveExisting}
        onSave={editable ? handleSave : undefined}
        isSaving={updateFiles.isPending}
        saveDisabled={!hasPendingChanges}
      />
    </>
  )
}
