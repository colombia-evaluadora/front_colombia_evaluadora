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
import { ICONO_ARCHIVO } from "@/features/comunicaciones/chat/api/ui-mappings"
import { fetchDocumento, useDocumentoQuery } from "@/features/comunicaciones/chat/api/query/use-documento-query"
import { useEliminarArchivo } from "@/features/comunicaciones/chat/api/mutations/use-acciones-archivo"
import { descargarDocumento } from "@/features/comunicaciones/chat/lib/documento"
import { CLASES_HTML, htmlSeguro } from "@/features/comunicaciones/chat/lib/html-seguro"

const SIN_SERVICIO = "Disponible cuando se conecte el servicio de archivos"

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
  const [viendo, setViendo] = useState(false)

  // Los documentos editables se descargan con su contenido actual; el resto
  // necesita el file-service.
  const descargar = async () => {
    try {
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
        titulo={a.editable ? "Descargar" : SIN_SERVICIO}
        disabled={!a.editable}
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
      {a.esPropio && (
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
  const { Icono, color, tipo } = ICONO_ARCHIVO[a.formato]

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
          <div className="grid place-items-center gap-3 rounded-lg border border-dashed py-12 text-center">
            <Icono aria-hidden className={cn("size-14", color)} />
            <p className="max-w-sm text-sm text-muted-foreground">
              La vista previa de {tipo.toLowerCase()} estará disponible cuando se conecte el
              servicio de archivos.
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
