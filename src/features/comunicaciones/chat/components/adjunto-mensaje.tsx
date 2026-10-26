import { useId, useState } from "react"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import {
  CheckCircleIcon,
  EyeIcon,
  FileDownloadOutlinedIcon,
  TrashIcon,
} from "@/components/ui/icons"
import { useNotify } from "@/components/notice/notice-context"
import { getErrorMessage } from "@/lib/api-client"
import { cn } from "@/lib/utils"
import type { AdjuntoMensaje, Mensaje } from "@/features/comunicaciones/chat/api/types"
import { iconoArchivo } from "@/features/comunicaciones/chat/api/ui-mappings"
import {
  useEliminarAdjunto,
  useRegistrarDescarga,
} from "@/features/comunicaciones/chat/api/mutations/use-acciones-mensaje"
import { VistaBinario } from "@/features/comunicaciones/chat/components/archivo-acciones"
import {
  AVISO_YA_DESCARGADO,
  adjuntosDe,
  descargarAdjunto,
  esAudio,
  pesoLegible,
} from "@/features/comunicaciones/chat/lib/archivo-adjunto"
import { horaMensaje } from "@/features/comunicaciones/chat/lib/chat-format"
import { ArchivoImage } from "@/features/files/components/archivo-image"
import { ReproductorAudio } from "@/features/comunicaciones/chat/components/reproductor-audio"

const BOTON =
  "grid size-8 shrink-0 place-items-center rounded-full text-foreground hover:bg-muted/60 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none disabled:opacity-40 disabled:hover:bg-transparent"

/**
 * Archivos de un mensaje del chat (hasta 10, en orden): miniatura de las imágenes, vista
 * previa de imagen/PDF/video, descarga con token de vista y, para el autor (`propio`),
 * quitar cada archivo mientras nadie más lo haya descargado. La descarga de un archivo
 * ajeno se registra en comms-service antes de bajarlo: es lo que bloquea que el autor lo
 * quite después (HU "Eliminar archivos adjuntos en mensajes").
 */
export function AdjuntosMensaje({
  mensaje: m,
  propio = false,
  className,
}: {
  mensaje: Mensaje
  propio?: boolean
  className?: string
}) {
  const adjuntos = adjuntosDe(m)
  if (adjuntos.length === 0) return null

  // Un solo archivo quitado: el aviso ocupa el pie de la burbuja, como antes.
  if (adjuntos.length === 1 && adjuntos[0].eliminadoEn) {
    return (
      <p
        className={cn(
          "mt-3 -mx-4 -mb-3 flex items-center gap-2 rounded-b-xl border-t bg-green-22 px-4 py-2 text-xs text-green",
          className,
        )}
      >
        <CheckCircleIcon aria-hidden className="size-5" />
        <span className="font-medium">Archivo eliminado</span>
        <time dateTime={adjuntos[0].eliminadoEn}>{horaMensaje(adjuntos[0].eliminadoEn)}</time>
      </p>
    )
  }

  return (
    <ul
      aria-label={adjuntos.length > 1 ? `${adjuntos.length} archivos adjuntos` : "Archivo adjunto"}
      className={cn("mt-3 flex w-full max-w-sm flex-col gap-2", className)}
    >
      {adjuntos.map((a, i) => (
        <li key={a.id ?? `${a.nombre}-${i}`}>
          {a.eliminadoEn ? (
            <p className="flex items-center gap-2 rounded-lg bg-green-22 px-3 py-2 text-xs text-green">
              <CheckCircleIcon aria-hidden className="size-5 shrink-0" />
              <span className="min-w-0 truncate">
                <span className="font-medium">Archivo eliminado</span>
                <span className="sr-only">: {a.nombre}</span>
              </span>
              <time dateTime={a.eliminadoEn} className="ml-auto shrink-0">
                {horaMensaje(a.eliminadoEn)}
              </time>
            </p>
          ) : (
            <TarjetaAdjunto mensaje={m} adjunto={a} propio={propio} />
          )}
        </li>
      ))}
    </ul>
  )
}

function TarjetaAdjunto({
  mensaje: m,
  adjunto,
  propio,
}: {
  mensaje: Mensaje
  adjunto: AdjuntoMensaje
  propio: boolean
}) {
  const [viendo, setViendo] = useState(false)
  const { notify } = useNotify()
  const eliminar = useEliminarAdjunto()
  const avisoId = useId()
  const { Icono, color, tipo } = iconoArchivo(adjunto.formato, adjunto.nombre)
  const conVista =
    adjunto.archivoId != null &&
    (adjunto.formato === "IMAGEN" || adjunto.formato === "PDF" || adjunto.formato === "VIDEO")
  const bloqueado = propio && !!adjunto.descargado
  return (
    <div className="w-full">
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
        <DescargarAdjunto mensaje={m} adjunto={adjunto} />
        {propio && (
          <button
            type="button"
            aria-label={`Eliminar ${adjunto.nombre}`}
            aria-describedby={bloqueado ? avisoId : undefined}
            title={bloqueado ? AVISO_YA_DESCARGADO : "Eliminar archivo"}
            disabled={eliminar.isPending || bloqueado}
            onClick={() =>
              eliminar.mutate(
                { mensajeId: m.id, adjuntoId: adjunto.id },
                { onError: (error) => notify(getErrorMessage(error), { variant: "error" }) },
              )
            }
            className={cn(BOTON, "-ml-2")}
          >
            <TrashIcon className="size-5" />
          </button>
        )}
      </div>
      {esAudio(adjunto.nombre) && (
        <ReproductorAudio archivoId={adjunto.archivoId} nombre={adjunto.nombre} className="mt-2" />
      )}
      {bloqueado && (
        <p id={avisoId} className="mt-1 text-xs text-muted-foreground">
          {AVISO_YA_DESCARGADO}
        </p>
      )}

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

// Descarga con un token de vista de file-service, pedido al hacer clic. Sin `archivoId`
// (adjuntos viejos o del mock sin binario) no hay nada que bajar. En un mensaje ajeno la
// descarga se registra primero: si no se pudo registrar, no se baja (el autor podría
// quitar un archivo que ya circula).
function DescargarAdjunto({ mensaje: m, adjunto }: { mensaje: Mensaje; adjunto: AdjuntoMensaje }) {
  const { notify } = useNotify()
  const registrar = useRegistrarDescarga()
  const sinArchivo = adjunto.archivoId == null
  const descargar = async () => {
    if (!m.esPropio && adjunto.id != null) {
      await registrar.mutateAsync({ mensajeId: m.id, adjuntoId: adjunto.id })
    }
    await descargarAdjunto(adjunto.archivoId as number, adjunto.nombre)
  }
  return (
    <button
      type="button"
      disabled={sinArchivo || registrar.isPending}
      aria-label={`Descargar ${adjunto.nombre}`}
      title={sinArchivo ? "Archivo sin copia en el servidor" : "Descargar"}
      onClick={() =>
        void descargar().catch((error) => notify(getErrorMessage(error), { variant: "error" }))
      }
      className={BOTON}
    >
      <FileDownloadOutlinedIcon className="size-5" />
    </button>
  )
}
