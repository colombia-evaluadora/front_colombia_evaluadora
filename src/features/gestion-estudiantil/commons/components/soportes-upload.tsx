import { useState } from "react"

import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import {
  FileUpload,
  FileUploadDropzone,
  FileUploadItem,
  FileUploadItemMetadata,
  FileUploadItemPreview,
  FileUploadList,
  FileUploadTrigger,
} from "@/components/ui/file-upload"
import { FolderOpenIcon, PaperclipIcon } from "@/components/ui/icons"
import { cn } from "@/lib/utils"

import { BotonQuitar } from "@/features/gestion-estudiantil/commons/components/boton-quitar"

const MAX_MB = 10

interface SoportesUploadProps {
  label: string
  archivos: File[]
  onChange: (archivos: File[]) => void
  max: number
  disabled?: boolean
  /** Reemplaza el texto de ayuda del recuadro. */
  ayuda?: string
  /** Tipos aceptados; por defecto PDF, JPG y PNG. */
  accept?: string
}

const claveArchivo = (f: File) => `${f.name}:${f.size}:${f.lastModified}`

/**
 * Carga de soportes: PDF, JPG o PNG de hasta 10 MB (3.1 y 3.2).
 *
 * Mientras se pueden agregar archivos, el recuadro ofrece la carpeta, el texto de ayuda y «Adjuntar», y los ya
 * cargados van debajo. Al llegar al máximo (con un solo archivo, apenas se carga) el recuadro cambia: muestra
 * cada archivo con su miniatura, nombre, peso y la papelera roja para quitarlo.
 */
export function SoportesUpload({ label, archivos, onChange, max, disabled, ayuda, accept = ".pdf,.jpg,.jpeg,.png" }: SoportesUploadProps) {
  const [rechazo, setRechazo] = useState<string | null>(null)
  const lleno = archivos.length >= max

  const fila = (f: File, enRecuadro: boolean) => (
    <FileUploadItem
      key={claveArchivo(f)}
      value={f}
      // Dentro del recuadro el ítem no lleva marco propio: el marco es el del campo.
      className={cn(enRecuadro && "border-0 bg-transparent p-0 has-[>a,>button]:hover:bg-transparent has-data-[slot=attachment-media]:p-0")}
    >
      <FileUploadItemPreview />
      <FileUploadItemMetadata />
      {!disabled && (
        <BotonQuitar
          label={`Quitar ${f.name}`}
          className="ml-auto"
          onClick={() => onChange(archivos.filter((x) => x !== f))}
        />
      )}
    </FileUploadItem>
  )

  return (
    <div className="flex flex-col gap-2">
      <FileUpload
        value={archivos}
        onValueChange={(v) => {
          setRechazo(null)
          onChange(v)
        }}
        onFileReject={(f, mensaje) => setRechazo(`${f.name}: ${mensaje}`)}
        accept={accept}
        maxFiles={max}
        maxSize={MAX_MB * 1024 * 1024}
        multiple={max > 1}
        // Solo se deshabilita por la prop: al llegar al máximo el recuadro ya no ofrece Adjuntar, y deshabilitar
        // todo el componente dejaba también la papelera deshabilitada.
        disabled={disabled}
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
          {lleno ? (
            <div className="flex flex-col gap-3 rounded-sm border border-input p-3 pt-4">
              {archivos.map((f) => fila(f, true))}
            </div>
          ) : (
            <FileUploadDropzone className="flex-row flex-wrap items-center gap-3 rounded-sm border border-dashed border-input p-3 pt-4 text-left hover:border-ring">
              <FolderOpenIcon aria-hidden className="size-6 shrink-0 text-muted-foreground" />
              <div className="min-w-0 flex-1">
                <p className="text-xs text-muted-foreground">
                  {ayuda ?? `PDF, JPG o PNG; hasta ${MAX_MB} MB${max > 1 ? ` cada uno y ${max} archivos` : ""}.`}
                </p>
              </div>
              <FileUploadTrigger render={<Button type="button" variant="outline" size="sm" />}>
                <PaperclipIcon data-icon="inline-start" />
                Adjuntar
              </FileUploadTrigger>
            </FileUploadDropzone>
          )}
        </div>
        {!lleno && archivos.length > 0 && <FileUploadList>{archivos.map((f) => fila(f, false))}</FileUploadList>}
      </FileUpload>
      {rechazo && (
        <p role="alert" className="text-xs text-red">
          {rechazo}
        </p>
      )}
    </div>
  )
}
