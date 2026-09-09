import { useState } from "react"
import { useQueryClient } from "@tanstack/react-query"

import { Button } from "@/components/ui/button"
import { FolderOpenIcon } from "@/components/ui/icons"
import { useNotify } from "@/components/notice/notice-context"

import { getErrorMessage } from "@/lib/api-client"
import { useMatriculaDetailQuery } from "@/features/coverage/api/query/use-matricula-detail-query"
import { useUpdateMatriculaFiles } from "@/features/coverage/api/mutations/update-matricula-files"
import { addMatriculaDocumento } from "@/features/coverage/api/mutations/add-matricula-documento"
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
  const [isSaving, setIsSaving] = useState(false)
  const { notify } = useNotify()
  const queryClient = useQueryClient()
  // Solo se pide mientras el sheet está abierto -- evita una consulta por
  // fila de la tabla apenas se renderiza.
  const { data } = useMatriculaDetailQuery(open ? matricula.id : undefined)
  const fullName = `${matricula.firstName} ${matricula.lastName}`

  const updateFiles = useUpdateMatriculaFiles()

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

  async function handleSave() {
    if (data?.status !== "ok" || !data.details || !hasPendingChanges || isSaving) return
    const byCategory = groupExistingFilesByKey(data.files)
    const hasPatchChanges =
      files.studentIdDocument.length > 0 ||
      files.previousYearCertificate.length > 0 ||
      files.medicalCertificate.length > 0 ||
      files.studentPhoto.length > 0 ||
      removedIds.size > 0

    setIsSaving(true)
    try {
      if (hasPatchChanges) {
        await updateFiles.mutateAsync({
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
          otrosDocumentosARemover: byCategory.otherDocuments.filter((f) => removedIds.has(f.id)).map((f) => f.id),
        })
      }
      const pendingUploads = files.otherDocuments
      const failedUploads: File[] = []
      for (const file of pendingUploads) {
        try {
          await addMatriculaDocumento(matricula.id, file)
        } catch {
          failedUploads.push(file)
        }
      }

      if (pendingUploads.length > 0 || removedIds.size > 0) {
        queryClient.invalidateQueries({ queryKey: ["matricula"] })
      }

      setFiles({ ...createEmptySupportFiles(), otherDocuments: failedUploads })
      setRemovedIds(new Set())
      setOpen(false)

      if (failedUploads.length > 0) {
        notify(
          `Se guardó el resto, pero ${failedUploads.length} archivo(s) de "otros documentos" no se pudieron subir. Quedaron para reintentar.`,
          { variant: "error" },
        )
      } else {
        notify("Archivos actualizados correctamente.")
      }
    } catch (error) {
      setOpen(false)
      notify(getErrorMessage(error), { variant: "error" })
    } finally {
      setIsSaving(false)
    }
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
        isSaving={isSaving}
        saveDisabled={!hasPendingChanges}
      />
    </>
  )
}
