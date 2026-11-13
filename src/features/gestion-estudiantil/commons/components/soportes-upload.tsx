import { useState } from "react"

import { Button } from "@/components/ui/button"
import {
  FileUpload,
  FileUploadDropzone,
  FileUploadItem,
  FileUploadItemDelete,
  FileUploadItemMetadata,
  FileUploadItemPreview,
  FileUploadList,
  FileUploadTrigger,
} from "@/components/ui/file-upload"
import { FolderOpenIcon, PaperclipIcon } from "@/components/ui/icons"
import { Label } from "@/components/ui/label"

const MAX_MB = 10

interface SoportesUploadProps {
  label: string
  archivos: File[]
  onChange: (archivos: File[]) => void
  max: number
  disabled?: boolean
}

/** Carga de soportes: PDF, JPG o PNG de hasta 10 MB (3.1 y 3.2). */
export function SoportesUpload({ label, archivos, onChange, max, disabled }: SoportesUploadProps) {
  const [rechazo, setRechazo] = useState<string | null>(null)
  return (
    <div className="flex flex-col gap-2">
      <FileUpload
        value={archivos}
        onValueChange={(v) => {
          setRechazo(null)
          onChange(v)
        }}
        onFileReject={(f, mensaje) => setRechazo(`${f.name}: ${mensaje}`)}
        accept=".pdf,.jpg,.jpeg,.png"
        maxFiles={max}
        maxSize={MAX_MB * 1024 * 1024}
        multiple={max > 1}
        disabled={disabled || archivos.length >= max}
        label={label}
        className="gap-2"
      >
        {/* Label sobre la línea del recuadro, como el label flotante de inputs y selects. */}
        <div className="relative mt-2">
          <Label
            aria-hidden
            className="pointer-events-none absolute top-0 left-2.5 z-10 -translate-y-1/2 rounded-xs bg-background px-1 text-sm font-medium tracking-normal text-foreground normal-case"
          >
            {label}
          </Label>
        <FileUploadDropzone className="flex-row flex-wrap items-center gap-3 rounded-sm border border-dashed border-input p-3 pt-4 text-left hover:border-ring">
          <FolderOpenIcon aria-hidden className="size-6 shrink-0 text-muted-foreground" />
          <div className="min-w-0 flex-1">
            <p className="text-xs text-muted-foreground">
              PDF, JPG o PNG; hasta {MAX_MB} MB{max > 1 ? ` cada uno y ${max} archivos` : ""}.
            </p>
          </div>
          <FileUploadTrigger render={<Button type="button" variant="outline" size="sm" />}>
            <PaperclipIcon data-icon="inline-start" />
            Adjuntar
          </FileUploadTrigger>
        </FileUploadDropzone>
        </div>
        <FileUploadList>
          {archivos.map((f) => (
            <FileUploadItem key={`${f.name}:${f.size}:${f.lastModified}`} value={f}>
              <FileUploadItemPreview />
              <FileUploadItemMetadata />
              <FileUploadItemDelete />
            </FileUploadItem>
          ))}
        </FileUploadList>
      </FileUpload>
      {rechazo && (
        <p role="alert" className="text-xs text-red">
          {rechazo}
        </p>
      )}
    </div>
  )
}
