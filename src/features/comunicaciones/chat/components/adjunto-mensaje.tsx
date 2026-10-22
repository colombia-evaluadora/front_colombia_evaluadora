import { useState } from "react"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { CheckCircleIcon, EyeIcon, FileDownloadOutlinedIcon, TrashIcon } from "@/components/ui/icons"
import { useNotify } from "@/components/notice/notice-context"
import { getErrorMessage } from "@/lib/api-client"
import { cn } from "@/lib/utils"
import type { Mensaje } from "@/features/comunicaciones/chat/api/types"
import { ICONO_ARCHIVO } from "@/features/comunicaciones/chat/api/ui-mappings"
import { VistaBinario } from "@/features/comunicaciones/chat/components/archivo-acciones"
import { descargarAdjunto, pesoLegible } from "@/features/comunicaciones/chat/lib/archivo-adjunto"
import { horaMensaje } from "@/features/comunicaciones/chat/lib/chat-format"
import { ArchivoImage } from "@/features/files/components/archivo-image"

const BOTON =
  "grid size-8 shrink-0 place-items-center rounded-full text-foreground hover:bg-muted/60 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none disabled:opacity-40 disabled:hover:bg-transparent"

/**
 * Tarjeta del archivo de un mensaje del chat: miniatura
 * de la imagen, vista previa de imagen/PDF/video en un diálogo, descarga con token
 * de vista y, si `onEliminar`, quitar el archivo. Quién puede quitarlo lo decide
 * quien la usa (en el chat, el autor).
 */
export function AdjuntoMensaje({
  mensaje: m,
  onEliminar,
  eliminando = false,
  className,
}: {
  mensaje: Mensaje
  onEliminar?: () => void
  eliminando?: boolean
  className?: string
}) {
  const [viendo, setViendo] = useState(false)
  const adjunto = m.adjunto
  if (!adjunto) return null

  if (adjunto.eliminadoEn) {
    return (
      <p
        className={cn(
          "mt-3 -mx-4 -mb-3 flex items-center gap-2 rounded-b-xl border-t bg-green-22 px-4 py-2 text-xs text-green",
          className,
        )}
      >
        <CheckCircleIcon aria-hidden className="size-5" />
        <span className="font-medium">Archivo eliminado</span>
        <time dateTime={adjunto.eliminadoEn}>{horaMensaje(adjunto.eliminadoEn)}</time>
      </p>
    )
  }

  const { Icono, color, tipo } = ICONO_ARCHIVO[adjunto.formato]
  const conVista =
    adjunto.archivoId != null &&
    (adjunto.formato === "IMAGEN" || adjunto.formato === "PDF" || adjunto.formato === "VIDEO")
  return (
    <div className={cn("mt-3 w-full max-w-sm", className)}>
      {adjunto.formato === "IMAGEN" && adjunto.archivoId != null && (
        <button
          type="button"
          onClick={() => setViendo(true)}
          aria-label={`Ver ${adjunto.nombre}`}
          className="mb-2 block w-full rounded-lg focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
        >
          <ArchivoImage
            archivoId={adjunto.archivoId}
            alt={adjunto.nombre}
            className="max-h-64 w-full rounded-lg border bg-muted/30 object-contain"
            fallback={<span />}
          />
        </button>
      )}
      <div className="flex w-full items-center gap-3 rounded-lg border bg-card px-3 py-3 shadow-xs">
        <Icono aria-hidden className={cn("size-8 shrink-0", color)} />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold">{adjunto.nombre}</span>
          {adjunto.peso != null && (
            <span className="block text-xs text-muted-foreground">{pesoLegible(adjunto.peso)}</span>
          )}
        </span>
        {conVista && (
          <button
            type="button"
            aria-label={`Ver ${adjunto.nombre}`}
            title="Vista previa"
            onClick={() => setViendo(true)}
            className={BOTON}
          >
            <EyeIcon className="size-5" />
          </button>
        )}
        <DescargarAdjunto archivoId={adjunto.archivoId} nombre={adjunto.nombre} />
        {onEliminar && (
          <button
            type="button"
            aria-label={`Eliminar ${adjunto.nombre}`}
            title="Eliminar archivo"
            disabled={eliminando}
            onClick={onEliminar}
            className={cn(BOTON, "-ml-2")}
          >
            <TrashIcon className="size-5" />
          </button>
        )}
      </div>

      {viendo && (
        <Dialog open onOpenChange={(o) => !o && setViendo(false)}>
          <DialogContent className="flex max-h-[90dvh] flex-col sm:max-w-3xl">
            <DialogHeader>
              <DialogTitle className="truncate pr-6">{adjunto.nombre}</DialogTitle>
            </DialogHeader>
            <VistaBinario
              archivo={adjunto}
              icono={<Icono aria-hidden className={cn("size-14", color)} />}
              tipo={tipo}
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}

// Descarga con un token de vista de file-service, pedido al hacer clic. Sin
// `archivoId` (adjuntos viejos o del mock sin binario) no hay nada que bajar.
function DescargarAdjunto({ archivoId, nombre }: { archivoId: number | null | undefined; nombre: string }) {
  const { notify } = useNotify()
  const sinArchivo = archivoId == null
  return (
    <button
      type="button"
      disabled={sinArchivo}
      aria-label={`Descargar ${nombre}`}
      title={sinArchivo ? "Archivo sin copia en el servidor" : "Descargar"}
      onClick={() =>
        void descargarAdjunto(archivoId as number, nombre).catch((error) =>
          notify(getErrorMessage(error), { variant: "error" }),
        )
      }
      className={BOTON}
    >
      <FileDownloadOutlinedIcon className="size-5" />
    </button>
  )
}
