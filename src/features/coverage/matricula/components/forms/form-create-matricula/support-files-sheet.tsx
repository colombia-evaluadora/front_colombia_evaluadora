import { useState } from "react"
import { FieldDescription } from "@/components/ui/field"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { ArrowCounterClockwiseIcon, CheckIcon, EyeIcon, FileDownloadOutlinedIcon, FilePdfIcon, FileTextIcon, FileXlsIcon, FolderOpenIcon, ImageIcon, PaperclipIcon, SpinnerIcon, TrashIcon } from "@/components/ui/icons"
import { FileUpload, FileUploadTrigger } from "@/components/ui/file-upload"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { useArchivoViewUrl } from "@/features/files/api/query/use-archivo-view-url"
import { isFieldRequired, isFieldVisible, type MatriculaFieldSettingsMap } from "@/features/coverage/matricula/utils/matricula-field-settings"
import type { MatriculaFile } from "@/features/coverage/matricula/api/types/matricula"
import { MatriculaFormSection } from "./fields"
import { type MatriculaSupportFiles, SUPPORT_FILE_FIELDS, type SupportFileFieldConfig, acceptDe, fileKey, formatFileSize, formatosTexto, groupExistingFilesByKey, validarArchivoSoporte } from "./support-files"

function FileTypeIcon({ file }: { file: File }) {
  const extension = file.name.split(".").pop()?.toLowerCase() ?? ""
  if (file.type.startsWith("image/")) return <ImageIcon className="size-4 shrink-0 text-orange" />
  if (extension === "pdf") return <FilePdfIcon className="size-4 shrink-0 text-red" />
  if (["xls", "xlsx", "csv"].includes(extension)) {
    return <FileXlsIcon className="size-4 shrink-0 text-green" />
  }
  return <FileTextIcon className="size-4 shrink-0 text-blue" />
}

function previewFile(file: File) {
  window.open(URL.createObjectURL(file), "_blank", "noopener,noreferrer")
}

function downloadFile(file: File) {
  const url = URL.createObjectURL(file)
  const link = document.createElement("a")
  link.href = url
  link.download = file.name
  document.body.appendChild(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 60_000)
}

// Misma fila en el sheet y en la grilla del formulario — afuera solo se le
// recortan las acciones (sin adjuntar/quitar, eso vive en el sheet).
function SupportFileEmptyRow({ invalid }: { invalid?: boolean }) {
  return (
    <div
      className={
        invalid
          ? "flex items-center justify-center gap-1.5 border-b border-red pb-1.5 text-center text-xs text-red"
          : "flex items-center justify-center gap-1.5 border-b border-border pb-1.5 text-center text-xs text-muted-foreground"
      }
    >
      <FolderOpenIcon aria-hidden className="size-4" weight="light" />
      Sin datos
    </div>
  )
}

interface SupportFileRowProps {
  file: File
  /** El sheet agrega "Eliminar"; afuera solo se ve. */
  onRemove?: (file: File) => void
  /** El sheet además ofrece "Descargar"; afuera (grilla del formulario) no. */
  showDownload?: boolean
}

function SupportFileRow({ file, onRemove, showDownload = false }: SupportFileRowProps) {
  return (
    <div className="flex items-center justify-between gap-2 border-b border-border pb-1.5 text-sm">
      <span className="flex min-w-0 items-center gap-2">
        <FileTypeIcon file={file} />
        <span className="truncate">{file.name}</span>
      </span>
      <span className="flex shrink-0 items-center gap-0.5">
        <span className="mr-1 text-xs text-muted-foreground">{formatFileSize(file.size)}</span>
        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                type="button"
                variant="ghost"
                color="neutral"
                size="icon-sm"
                aria-label={`Ver ${file.name}`}
                onClick={() => previewFile(file)}
              />
            }
          >
            <EyeIcon />
          </TooltipTrigger>
          <TooltipContent>{`Ver ${file.name}`}</TooltipContent>
        </Tooltip>
        {showDownload && (
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  type="button"
                  variant="ghost"
                  color="neutral"
                  size="icon-sm"
                  aria-label={`Descargar ${file.name}`}
                  onClick={() => downloadFile(file)}
                />
              }
            >
              <FileDownloadOutlinedIcon />
            </TooltipTrigger>
            <TooltipContent>{`Descargar ${file.name}`}</TooltipContent>
          </Tooltip>
        )}
        {onRemove && (
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  type="button"
                  variant="ghost"
                  color="neutral"
                  size="icon-sm"
                  aria-label={`Eliminar ${file.name}`}
                  onClick={() => onRemove(file)}
                />
              }
            >
              <TrashIcon />
            </TooltipTrigger>
            <TooltipContent>{`Eliminar ${file.name}`}</TooltipContent>
          </Tooltip>
        )}
      </span>
    </div>
  )
}

interface SupportFilesSheetFieldProps {
  config: SupportFileFieldConfig
  value: File[]
  onChange: (files: File[]) => void
  required?: boolean
  existingFiles?: MatriculaFile[]
  editable?: boolean
  viewOnly?: boolean
  removedExistingIds?: Set<number>
  onToggleRemoveExisting?: (fileId: number) => void
}

function SupportFilesSheetField({
  config,
  value,
  onChange,
  required = false,
  existingFiles = [],
  editable = false,
  viewOnly = false,
  removedExistingIds,
  onToggleRemoveExisting,
}: SupportFilesSheetFieldProps) {
  const [rejection, setRejection] = useState<string | null>(null)

  function removeFile(file: File) {
    onChange(value.filter((f) => f !== file))
  }

  const existingSuperseded = editable && !config.multiple && value.length > 0
  const visibleExisting = existingSuperseded ? [] : existingFiles
  const isEmpty = value.length === 0 && visibleExisting.length === 0
  const canAttach =
    !viewOnly && (editable ? true : config.multiple || (value.length === 0 && existingFiles.length === 0))
  const canRemoveExisting = editable && (config.multiple || !required)

  return (
    <FileUpload
      value={value}
      onValueChange={(files) => {
        setRejection(null)
        onChange(files)
      }}
      multiple={config.multiple}
      accept={acceptDe(config)}
      onFileValidate={(file) => validarArchivoSoporte(file, config)}
      onFileReject={(file, message) => setRejection(`${file.name} ${message}`)}
      className="gap-2"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="flex flex-col">
          <span className="text-sm font-semibold text-foreground">
            {config.label}
            {required ? "*" : ""}
          </span>
          {canAttach && (
            <span className="text-xs text-muted-foreground">{formatosTexto(config)}</span>
          )}
        </span>
        {canAttach && (
          <Tooltip>
            <TooltipTrigger
              render={
                <FileUploadTrigger
                  render={
                    <Button
                      type="button"
                      variant="ghost"
                      color="primary"
                      size="icon-sm"
                      aria-label={`Adjuntar ${config.label}`}
                    />
                  }
                />
              }
            >
              <PaperclipIcon />
            </TooltipTrigger>
            <TooltipContent>{`Adjuntar ${config.label}`}</TooltipContent>
          </Tooltip>
        )}
      </div>
      {rejection && <p className="text-xs text-red">{rejection}</p>}

      {isEmpty ? (
        <SupportFileEmptyRow />
      ) : (
        <div className="flex flex-col gap-2">
          {visibleExisting.map((file) => (
            <ExistingFileRow
              key={file.id}
              file={file}
              removable={canRemoveExisting}
              markedForRemoval={removedExistingIds?.has(file.id)}
              onToggleRemove={onToggleRemoveExisting ? () => onToggleRemoveExisting(file.id) : undefined}
            />
          ))}
          {value.map((file) => (
            <SupportFileRow key={fileKey(file)} file={file} onRemove={removeFile} showDownload />
          ))}
        </div>
      )}
    </FileUpload>
  )
}

// Ícono por extensión para archivos reales (`MatriculaFile`, del GET de
// detalle) -- a diferencia de `FileTypeIcon` no hay un `File` del navegador
// con `.type`, solo el nombre.
function existingFileIcon(name: string) {
  const extension = name.split(".").pop()?.toLowerCase() ?? ""
  if (["jpg", "jpeg", "png", "gif", "webp"].includes(extension)) {
    return <ImageIcon className="size-4 shrink-0 text-orange" />
  }
  if (extension === "pdf") return <FilePdfIcon className="size-4 shrink-0 text-red" />
  if (["xls", "xlsx", "csv"].includes(extension)) {
    return <FileXlsIcon className="size-4 shrink-0 text-green" />
  }
  return <FileTextIcon className="size-4 shrink-0 text-blue" />
}

interface ExistingFileRowProps {
  file: MatriculaFile
  removable?: boolean
  markedForRemoval?: boolean
  onToggleRemove?: () => void
}

// Ver/Descargar salen de `file-service` (`useArchivoViewUrl`, acuña un
// token de vista de un solo archivo por `fk_tarchivo` -- ver `lib/files.ts`),
// mismo mecanismo que ya usa `ArchivoImage`.
function ExistingFileRow({ file, removable, markedForRemoval, onToggleRemove }: ExistingFileRowProps) {
  const { data: url, isPending } = useArchivoViewUrl(file.archivoId)

  function handleView() {
    if (url) window.open(url, "_blank", "noopener,noreferrer")
  }

  function handleDownload() {
    if (!url) return
    const link = document.createElement("a")
    link.href = url
    link.download = file.name
    document.body.appendChild(link)
    link.click()
    link.remove()
  }

  return (
    <div
      className={
        markedForRemoval
          ? "flex items-center justify-between gap-2 border-b border-border pb-1.5 text-sm opacity-50"
          : "flex items-center justify-between gap-2 border-b border-border pb-1.5 text-sm"
      }
    >
      <span className="flex min-w-0 items-center gap-2">
        {existingFileIcon(file.name)}
        <span className={markedForRemoval ? "truncate line-through" : "truncate"}>{file.name}</span>
      </span>
      <span className="flex shrink-0 items-center gap-0.5">
        <span className="mr-1 text-xs text-muted-foreground">{formatFileSize(file.sizeBytes)}</span>
        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                type="button"
                variant="ghost"
                color="neutral"
                size="icon-sm"
                disabled={isPending || !url}
                aria-label={`Ver ${file.name}`}
                onClick={handleView}
              />
            }
          >
            <EyeIcon />
          </TooltipTrigger>
          <TooltipContent>{`Ver ${file.name}`}</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                type="button"
                variant="ghost"
                color="neutral"
                size="icon-sm"
                disabled={isPending || !url}
                aria-label={`Descargar ${file.name}`}
                onClick={handleDownload}
              />
            }
          >
            <FileDownloadOutlinedIcon />
          </TooltipTrigger>
          <TooltipContent>{`Descargar ${file.name}`}</TooltipContent>
        </Tooltip>
        {removable && (
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  type="button"
                  variant="ghost"
                  color="neutral"
                  size="icon-sm"
                  aria-label={markedForRemoval ? `Deshacer eliminar ${file.name}` : `Eliminar ${file.name}`}
                  onClick={onToggleRemove}
                />
              }
            >
              {markedForRemoval ? <ArrowCounterClockwiseIcon /> : <TrashIcon />}
            </TooltipTrigger>
            <TooltipContent>
              {markedForRemoval ? `Deshacer eliminar ${file.name}` : `Eliminar ${file.name}`}
            </TooltipContent>
          </Tooltip>
        )}
      </span>
    </div>
  )
}

interface SupportFilesSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  value: MatriculaSupportFiles
  onChange: (value: MatriculaSupportFiles) => void
  /** Archivos ya cargados en el backend (solo detalle/edición) -- se
   * muestran aparte, arriba, de solo lectura salvo que `editable` esté
   * activo. */
  existingFiles?: MatriculaFile[]
  /** Editar (no alta): habilita reemplazar los de una sola vía y marcar
   * para borrar los de "otros documentos", más el botón Guardar de abajo. */
  editable?: boolean
  /** Fila de la tabla: puramente de visualización (ver `SupportFilesSheetField`). */
  viewOnly?: boolean
  removedExistingIds?: Set<number>
  onToggleRemoveExisting?: (fileId: number) => void
  onSave?: () => void
  isSaving?: boolean
  saveDisabled?: boolean
  fieldSettings?: MatriculaFieldSettingsMap
}

export function SupportFilesSheet({
  open,
  onOpenChange,
  value,
  onChange,
  existingFiles,
  editable = false,
  viewOnly = false,
  removedExistingIds,
  onToggleRemoveExisting,
  onSave,
  isSaving = false,
  saveDisabled = false,
  fieldSettings,
}: SupportFilesSheetProps) {
  const existingByKey = groupExistingFilesByKey(existingFiles ?? [])
  const visibleFields = SUPPORT_FILE_FIELDS.filter((field) => isFieldVisible(fieldSettings, field.fieldId))
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full gap-0 data-[side=right]:sm:max-w-lg">
        <SheetHeader className="px-4">
          <SheetTitle>Archivos de soporte</SheetTitle>
          <SheetDescription>
            {viewOnly
              ? "Documentos cargados para este estudiante."
              : "Por favor cargue los siguientes documentos requeridos para completar la inscripción del estudiante. Se aceptan archivos PDF, JPG o PNG (la foto, solo JPG o PNG) de hasta 25 MB."}
          </SheetDescription>
        </SheetHeader>
        <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-4 pb-8">
          {visibleFields.map((field) => (
            <SupportFilesSheetField
              key={field.key}
              config={field}
              value={value[field.key]}
              onChange={(files) => onChange({ ...value, [field.key]: files })}
              required={isFieldRequired(fieldSettings, field.fieldId)}
              existingFiles={existingByKey[field.key]}
              editable={editable}
              viewOnly={viewOnly}
              removedExistingIds={removedExistingIds}
              onToggleRemoveExisting={onToggleRemoveExisting}
            />
          ))}
        </div>
        {onSave && (
          <SheetFooter className="px-4">
            <Button
              type="button"
              variant="fill"
              color="primary"
              size="sm"
              disabled={isSaving || saveDisabled}
              onClick={onSave}
            >
              {isSaving ? (
                <SpinnerIcon data-icon="inline-start" className="animate-spin" />
              ) : (
                <CheckIcon data-icon="inline-start" />
              )}
              Guardar
            </Button>
          </SheetFooter>
        )}
      </SheetContent>
    </Sheet>
  )
}

interface SupportFilesSectionProps {
  value: MatriculaSupportFiles
  onChange: (value: MatriculaSupportFiles) => void
  /** Claves de `MatriculaSupportFiles` obligatorias sin cargar. */
  invalidFields?: string[]
  fieldSettings?: MatriculaFieldSettingsMap
}

export function MatriculaSupportFilesSection({
  value,
  onChange,
  invalidFields = [],
  fieldSettings,
}: SupportFilesSectionProps) {
  const [open, setOpen] = useState(false)
  const visibleFields = SUPPORT_FILE_FIELDS.filter((field) => isFieldVisible(fieldSettings, field.fieldId))
  if (visibleFields.length === 0) return null

  return (
    <MatriculaFormSection title="Archivo de soporte" columns={2}>
      <div className="md:col-span-2">
        <FieldDescription>
          Por favor cargue los siguientes documentos requeridos para completar la inscripción del
          estudiante.
        </FieldDescription>
      </div>

      {visibleFields.map((field) => {
        const files = value[field.key]
        const required = isFieldRequired(fieldSettings, field.fieldId)
        const invalid = files.length === 0 && invalidFields.includes(field.key)
        return (
          <div key={field.key} className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between gap-2">
              <span className={invalid ? "font-semibold text-red" : "font-semibold text-foreground"}>
                {field.label}
                {required ? "*" : ""}
              </span>
              {(field.multiple || files.length === 0) && (
                <Tooltip>
                  <TooltipTrigger
                    render={
                      <Button
                        type="button"
                        variant="ghost"
                        color="primary"
                        size="icon-sm"
                        aria-label={`Adjuntar ${field.label}`}
                        onClick={() => setOpen(true)}
                      />
                    }
                  >
                    <PaperclipIcon />
                  </TooltipTrigger>
                  <TooltipContent>{`Adjuntar ${field.label}`}</TooltipContent>
                </Tooltip>
              )}
            </div>

            {files.length === 0 ? (
              <SupportFileEmptyRow invalid={invalid} />
            ) : (
              <div className="flex flex-col gap-2">
                {files.map((file) => (
                  <SupportFileRow key={fileKey(file)} file={file} />
                ))}
              </div>
            )}
          </div>
        )
      })}

      <SupportFilesSheet
        open={open}
        onOpenChange={setOpen}
        value={value}
        onChange={onChange}
        fieldSettings={fieldSettings}
      />
    </MatriculaFormSection>
  )
}
