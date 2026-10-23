import { useState } from "react"

import {
  Attachment,
  AttachmentAction,
  AttachmentActions,
  AttachmentContent,
  AttachmentDescription,
  AttachmentMedia,
  AttachmentTitle,
} from "@/components/ui/attachment"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
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
import {
  ArrowCounterClockwiseIcon,
  EyeIcon,
  FileDownloadOutlinedIcon,
  FolderOpenIcon,
  PaperclipIcon,
  TrashIcon,
} from "@/components/ui/icons"
import { useNotify } from "@/components/notice/notice-context"
import { getErrorMessage } from "@/lib/api-client"
import { cn } from "@/lib/utils"
import type { AdjuntoComunicado } from "@/features/comunicaciones/chat/api/types"
import { iconoArchivo } from "@/features/comunicaciones/chat/api/ui-mappings"
import { VistaBinario } from "@/features/comunicaciones/chat/components/archivo-acciones"
import {
  ACEPTA_DOCUMENTOS,
  ACEPTA_MULTIMEDIA,
  descargarAdjunto,
  MAX_ADJUNTO_MB,
  pesoLegible,
  validarAdjunto,
} from "@/features/comunicaciones/chat/lib/archivo-adjunto"

// Mismo tope que comms-service (`ComunicadoService.MAX_ADJUNTOS`).
export const MAX_ADJUNTOS_COMUNICADO = 10

const claveArchivo = (f: File) => `${f.name}:${f.size}:${f.lastModified}`

/**
 * Archivos del comunicado al crearlo o editarlo: PDF, imágenes, documentos, video y ZIP/RAR de hasta
 * 20 MB (mismas reglas que un adjunto del chat: `validarAdjunto`; .exe/.bat nunca pasan). Los ya
 * guardados (edición) se pueden quitar o recuperar antes de guardar.
 */
export function AdjuntosComunicadoCampo({
  archivos,
  onArchivos,
  guardados = [],
  quitados = [],
  onQuitados,
  deshabilitado = false,
}: {
  archivos: File[]
  onArchivos: (v: File[]) => void
  guardados?: AdjuntoComunicado[]
  quitados?: number[]
  onQuitados?: (v: number[]) => void
  deshabilitado?: boolean
}) {
  const [rechazo, setRechazo] = useState<string | null>(null)
  const vigentes = guardados.filter((g) => !quitados.includes(g.id)).length
  const cupo = Math.max(0, MAX_ADJUNTOS_COMUNICADO - vigentes)

  return (
    <fieldset className="min-w-0 space-y-2" disabled={deshabilitado}>
      <legend className="mb-2 text-sm font-medium">Archivos adjuntos</legend>
      {guardados.length > 0 && (
        <ul className="flex flex-col gap-2" aria-label="Archivos guardados">
          {guardados.map((g) => {
            const quitado = quitados.includes(g.id)
            const { Icono, color } = iconoArchivo(g.formato, g.nombre)
            return (
              <li key={g.id}>
                <Attachment className={cn("w-full", quitado && "opacity-60")}>
                  <AttachmentMedia>
                    <Icono aria-hidden className={cn("size-5", color)} />
                  </AttachmentMedia>
                  <AttachmentContent>
                    <AttachmentTitle className={cn(quitado && "line-through")}>{g.nombre}</AttachmentTitle>
                    <AttachmentDescription>
                      {quitado ? "Se quitará al guardar" : pesoLegible(g.peso)}
                    </AttachmentDescription>
                  </AttachmentContent>
                  <AttachmentActions>
                    <AttachmentAction
                      aria-label={quitado ? `Conservar ${g.nombre}` : `Quitar ${g.nombre}`}
                      title={quitado ? "Conservar" : "Quitar"}
                      onClick={() =>
                        onQuitados?.(quitado ? quitados.filter((id) => id !== g.id) : [...quitados, g.id])
                      }
                    >
                      {quitado ? <ArrowCounterClockwiseIcon /> : <TrashIcon />}
                    </AttachmentAction>
                  </AttachmentActions>
                </Attachment>
              </li>
            )
          })}
        </ul>
      )}
      <FileUpload
        value={archivos}
        onValueChange={(v) => {
          setRechazo(null)
          onArchivos(v)
        }}
        onFileValidate={(f) => validarAdjunto(f)}
        onFileReject={(f, mensaje) => setRechazo(`${f.name}: ${mensaje}`)}
        accept={`${ACEPTA_DOCUMENTOS},${ACEPTA_MULTIMEDIA}`}
        maxFiles={cupo}
        maxSize={MAX_ADJUNTO_MB * 1024 * 1024}
        multiple
        disabled={deshabilitado || cupo === 0}
        label="Archivos adjuntos"
        className="gap-2"
      >
        <FileUploadDropzone className="flex-row flex-wrap items-center gap-3 p-3 text-left">
          <FolderOpenIcon aria-hidden className="size-6 shrink-0 text-muted-foreground" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium">Arrastra archivos aquí</p>
            <p className="text-xs text-muted-foreground">
              PDF, Word, Excel, PowerPoint, imágenes, video, ZIP o RAR; hasta {MAX_ADJUNTO_MB} MB cada uno y{" "}
              {MAX_ADJUNTOS_COMUNICADO} por comunicado.
            </p>
          </div>
          <FileUploadTrigger render={<Button type="button" variant="outline" size="sm" />}>
            <PaperclipIcon data-icon="inline-start" />
            Adjuntar
          </FileUploadTrigger>
        </FileUploadDropzone>
        <FileUploadList>
          {archivos.map((f) => (
            <FileUploadItem key={claveArchivo(f)} value={f}>
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
    </fieldset>
  )
}

/** Archivos del comunicado para quien lo lee: vista previa (imagen, PDF, video) y descarga. */
export function AdjuntosComunicadoLista({ adjuntos }: { adjuntos: AdjuntoComunicado[] }) {
  const { notify } = useNotify()
  const [viendo, setViendo] = useState<AdjuntoComunicado | null>(null)
  if (adjuntos.length === 0) return null
  const vista = viendo ? iconoArchivo(viendo.formato, viendo.nombre) : null

  return (
    <section aria-labelledby="comunicado-adjuntos" className="border-t py-3">
      <h4 id="comunicado-adjuntos" className="mb-2 flex items-center gap-1.5 text-sm font-medium">
        <PaperclipIcon aria-hidden className="size-4 text-muted-foreground" />
        Archivos adjuntos ({adjuntos.length})
      </h4>
      <ul className="grid gap-2 sm:grid-cols-2">
        {adjuntos.map((a) => {
          const { Icono, color } = iconoArchivo(a.formato, a.nombre)
          const conVista = a.formato === "IMAGEN" || a.formato === "PDF" || a.formato === "VIDEO"
          return (
            <li key={a.id} className="min-w-0">
              <Attachment className="w-full">
                <AttachmentMedia>
                  <Icono aria-hidden className={cn("size-5", color)} />
                </AttachmentMedia>
                <AttachmentContent>
                  <AttachmentTitle>{a.nombre}</AttachmentTitle>
                  <AttachmentDescription>{pesoLegible(a.peso)}</AttachmentDescription>
                </AttachmentContent>
                <AttachmentActions>
                  {conVista && (
                    <AttachmentAction aria-label={`Ver ${a.nombre}`} title="Vista previa" onClick={() => setViendo(a)}>
                      <EyeIcon />
                    </AttachmentAction>
                  )}
                  <AttachmentAction
                    aria-label={`Descargar ${a.nombre}`}
                    title="Descargar"
                    onClick={() =>
                      void descargarAdjunto(a.archivoId, a.nombre).catch((error) =>
                        notify(getErrorMessage(error), { variant: "error" }),
                      )
                    }
                  >
                    <FileDownloadOutlinedIcon />
                  </AttachmentAction>
                </AttachmentActions>
              </Attachment>
            </li>
          )
        })}
      </ul>

      {viendo && vista && (
        <Dialog open onOpenChange={(o) => !o && setViendo(null)}>
          <DialogContent className="flex max-h-[90dvh] flex-col sm:max-w-3xl">
            <DialogHeader>
              <DialogTitle className="truncate pr-6">{viendo.nombre}</DialogTitle>
            </DialogHeader>
            <VistaBinario
              archivo={viendo}
              icono={<vista.Icono aria-hidden className={cn("size-14", vista.color)} />}
              tipo={vista.tipo}
            />
          </DialogContent>
        </Dialog>
      )}
    </section>
  )
}
