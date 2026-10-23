import { useState, type ReactNode } from "react"
import { useQueryClient } from "@tanstack/react-query"

import { ConfirmRemoveButton } from "@/components/confirm-remove-button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { EyeIcon, FileDownloadOutlinedIcon, PencilSimpleIcon } from "@/components/ui/icons"
import { Skeleton } from "@/components/ui/skeleton"
import { useNotify } from "@/components/notice/notice-context"
import { getErrorMessage } from "@/lib/api-client"
import { cn } from "@/lib/utils"
import type { ArchivoCompartido } from "@/features/comunicaciones/chat/api/types"
import { chatKeys } from "@/features/comunicaciones/chat/api/query-keys"
import { iconoArchivo } from "@/features/comunicaciones/chat/api/ui-mappings"
import { fetchDocumento, useDocumentoQuery } from "@/features/comunicaciones/chat/api/query/use-documento-query"
import { useEliminarArchivo } from "@/features/comunicaciones/chat/api/mutations/use-acciones-archivo"
import { useRegistrarDescarga } from "@/features/comunicaciones/chat/api/mutations/use-acciones-mensaje"
import { descargarDocumento } from "@/features/comunicaciones/chat/lib/documento"
import { AVISO_YA_DESCARGADO, descargarAdjunto } from "@/features/comunicaciones/chat/lib/archivo-adjunto"
import { useArchivoViewUrl } from "@/features/files/api/query/use-archivo-view-url"
import { CLASES_HTML, htmlSeguro } from "@/features/comunicaciones/chat/lib/html-seguro"

const SIN_COPIA = "Archivo sin copia en el servidor"

// Barra que aparece sobre la tarjeta al pasar el cursor: descargar, editar, ver, eliminar.
export function ArchivoAcciones({
  archivo: a,
  onEditar,
  className,
}: {
  archivo: ArchivoCompartido
  onEditar: () => void
  className?: string
}) {
  const { notify } = useNotify()
  const queryClient = useQueryClient()
  const eliminar = useEliminarArchivo()
  const registrar = useRegistrarDescarga()
  const [viendo, setViendo] = useState(false)

  // Los documentos editables (mock) se descargan con su contenido actual; el
  // resto, el binario de file-service. Un archivo ajeno registra la descarga antes
  // (desde ahí quien lo compartió ya no puede eliminarlo).
  const descargar = async () => {
    try {
      if (!a.esPropio && a.adjuntoId != null && a.mensajeId != null) {
        await registrar.mutateAsync({ mensajeId: a.mensajeId, adjuntoId: a.adjuntoId })
        if (!a.descargado) void queryClient.invalidateQueries({ queryKey: chatKeys.archivos })
      }
      if (a.archivoId != null) {
        await descargarAdjunto(a.archivoId, a.nombre)
        return
      }
      const html = await queryClient.fetchQuery({
        queryKey: chatKeys.documento(a.id),
        queryFn: () => fetchDocumento(a.id),
      })
      descargarDocumento(a.nombre, html)
    } catch (error) {
      notify(getErrorMessage(error), { variant: "error" })
    }
  }

  return (
    <div
      role="toolbar"
      aria-label={`Acciones de ${a.nombre}`}
      className={cn("flex items-center rounded-md border bg-card shadow-xs", className)}
    >
      <Accion
        etiqueta={`Descargar ${a.nombre}`}
        titulo={a.editable || a.archivoId != null ? "Descargar" : SIN_COPIA}
        disabled={!a.editable && a.archivoId == null}
        onClick={() => void descargar()}
      >
        <FileDownloadOutlinedIcon />
      </Accion>
      {a.editable && (
        <Accion etiqueta={`Editar ${a.nombre}`} titulo="Editar" onClick={onEditar}>
          <PencilSimpleIcon />
        </Accion>
      )}
      <Accion etiqueta={`Ver ${a.nombre}`} titulo="Ver" onClick={() => setViendo(true)}>
        <EyeIcon />
      </Accion>
      {a.esPropio && a.descargado && (
        // Deshabilitado con la razón: un botón `disabled` no recibe el puntero, el título va afuera.
        <span title={AVISO_YA_DESCARGADO} className="grid size-8 place-items-center">
          <ConfirmRemoveButton
            label={`Eliminar ${a.nombre}. ${AVISO_YA_DESCARGADO}`}
            description={AVISO_YA_DESCARGADO}
            onConfirm={() => false}
            disabled
            className="size-8 rounded-none text-muted-foreground"
          />
        </span>
      )}
      {a.esPropio && !a.descargado && (
        <ConfirmRemoveButton
          label={`Eliminar ${a.nombre}`}
          title="Eliminar archivo"
          description={
            <>
              Se eliminará <strong>{a.nombre}</strong> para todos. En el mensaje donde lo
              compartiste quedará el aviso «Archivo eliminado».
            </>
          }
          disabled={eliminar.isPending}
          onConfirm={() =>
            eliminar
              .mutateAsync(a.id)
              .then(() => notify(`Se eliminó ${a.nombre}.`))
              .catch((error) => {
                notify(getErrorMessage(error), { variant: "error" })
                return false
              })
          }
          className="size-8 rounded-none text-muted-foreground hover:text-red"
        />
      )}

      {viendo && <VistaPrevia archivo={a} onClose={() => setViendo(false)} />}
    </div>
  )
}

function Accion({
  etiqueta,
  titulo,
  onClick,
  disabled,
  children,
}: {
  etiqueta: string
  titulo: string
  onClick: () => void
  disabled?: boolean
  children: ReactNode
}) {
  return (
    <button
      type="button"
      aria-label={etiqueta}
      title={titulo}
      disabled={disabled}
      onClick={onClick}
      className="grid size-8 place-items-center text-muted-foreground hover:bg-muted/60 hover:text-foreground focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none focus-visible:ring-inset disabled:opacity-40 disabled:hover:bg-transparent [&_svg]:size-5"
    >
      {children}
    </button>
  )
}

function VistaPrevia({ archivo: a, onClose }: { archivo: ArchivoCompartido; onClose: () => void }) {
  const documento = useDocumentoQuery(a.editable ? a.id : undefined)
  const { Icono, color, tipo } = iconoArchivo(a.formato, a.nombre)

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="flex max-h-[90dvh] flex-col sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle className="truncate pr-6">{a.nombre}</DialogTitle>
        </DialogHeader>
        {a.editable ? (
          documento.isPending ? (
            <Skeleton className="h-80 w-full" />
          ) : documento.isError ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              No se pudo abrir el documento.
            </p>
          ) : (
            <div
              className={cn("min-h-0 flex-1 overflow-y-auto rounded-lg border px-6 py-6", CLASES_HTML)}
              // Saneado con DOMPurify.
              dangerouslySetInnerHTML={{ __html: htmlSeguro(documento.data ?? "") }}
            />
          )
        ) : (
          <VistaBinario archivo={a} icono={<Icono aria-hidden className={cn("size-14", color)} />} tipo={tipo} />
        )}
      </DialogContent>
    </Dialog>
  )
}

// Imagen, PDF y video se ven en el navegador con un token de vista; el resto
// (Word, Excel…) solo se descarga.
export function VistaBinario({
  archivo: a,
  icono,
  tipo,
}: {
  archivo: Pick<ArchivoCompartido, "formato" | "nombre"> & { archivoId?: number | null }
  icono: ReactNode
  tipo: string
}) {
  const visible = a.archivoId != null && (a.formato === "IMAGEN" || a.formato === "PDF" || a.formato === "VIDEO")
  const { data: url, isPending, isError } = useArchivoViewUrl(visible ? a.archivoId : null)
  if (visible && isPending) return <Skeleton className="h-80 w-full" />
  if (!visible || isError || !url) {
    return (
      <div className="grid place-items-center gap-3 rounded-lg border border-dashed py-12 text-center">
        {icono}
        <p className="max-w-sm text-sm text-muted-foreground">
          {a.archivoId == null
            ? "Este archivo no tiene copia en el servidor."
            : isError
              ? "No se pudo abrir el archivo."
              : `La vista previa de ${tipo.toLowerCase()} no está disponible; descárgalo para abrirlo.`}
        </p>
      </div>
    )
  }
  if (a.formato === "IMAGEN") {
    return <img src={url} alt={a.nombre} className="max-h-[70dvh] w-full rounded-lg object-contain" />
  }
  if (a.formato === "VIDEO") {
    return <video src={url} controls className="max-h-[70dvh] w-full rounded-lg" />
  }
  return <iframe src={url} title={a.nombre} className="h-[70dvh] w-full rounded-lg border" />
}
