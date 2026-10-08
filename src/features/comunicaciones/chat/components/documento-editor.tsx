import { useState } from "react"

import { ConfirmDiscardDialog } from "@/components/confirm-discard-dialog"
import { Skeleton } from "@/components/ui/skeleton"
import {
  ArrowLeftIcon,
  FileDownloadOutlinedIcon,
  FloppyDiskIcon,
  SpinnerIcon,
} from "@/components/ui/icons"
import { useNotify } from "@/components/notice/notice-context"
import { getErrorMessage } from "@/lib/api-client"
import type { ArchivoCompartido } from "@/features/comunicaciones/chat/api/types"
import { useDocumentoQuery } from "@/features/comunicaciones/chat/api/query/use-documento-query"
import { useGuardarDocumento } from "@/features/comunicaciones/chat/api/mutations/use-acciones-archivo"
import { EditorTexto } from "@/features/comunicaciones/chat/components/editor-texto"
import { descargarDocumento, imprimirHtml } from "@/features/comunicaciones/chat/lib/documento"
import { htmlSeguro } from "@/features/comunicaciones/chat/lib/html-seguro"

// Edición de un documento de Archivos a pantalla completa dentro del panel.
export function DocumentoEditor({
  archivo: a,
  onVolver,
}: {
  archivo: ArchivoCompartido
  onVolver: () => void
}) {
  const documento = useDocumentoQuery(a.id)

  return (
    <>
      {documento.isPending ? (
        <>
          <Encabezado archivo={a} onVolver={onVolver} />
          <div className="flex-1 space-y-4 p-6" aria-busy>
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-72 w-full" />
          </div>
        </>
      ) : documento.isError ? (
        <>
          <Encabezado archivo={a} onVolver={onVolver} />
          <div className="grid flex-1 place-items-center text-center text-sm">
            <div className="space-y-2">
              <p className="text-muted-foreground">No se pudo abrir el documento.</p>
              <button
                type="button"
                onClick={() => void documento.refetch()}
                className="font-medium text-primary underline"
              >
                Reintentar
              </button>
            </div>
          </div>
        </>
      ) : (
        // Se monta con el contenido ya cargado: el editor lee el valor inicial una vez.
        <Edicion key={a.id} archivo={a} inicial={documento.data ?? ""} onVolver={onVolver} />
      )}
    </>
  )
}

function Edicion({
  archivo: a,
  inicial,
  onVolver,
}: {
  archivo: ArchivoCompartido
  inicial: string
  onVolver: () => void
}) {
  const { notify } = useNotify()
  const guardar = useGuardarDocumento()
  const [html, setHtml] = useState(inicial)
  const [guardado, setGuardado] = useState(inicial)
  const [descartar, setDescartar] = useState(false)
  const sucio = html !== guardado

  const salvar = () =>
    guardar.mutate(
      { archivoId: a.id, html: htmlSeguro(html) },
      {
        onSuccess: () => {
          setGuardado(html)
          notify(`Se guardaron los cambios de ${a.nombre}.`)
        },
        onError: (error) => notify(getErrorMessage(error), { variant: "error" }),
      },
    )

  return (
    <>
      <Encabezado
        archivo={a}
        onVolver={() => (sucio ? setDescartar(true) : onVolver())}
        sucio={sucio}
        guardando={guardar.isPending}
        onGuardar={salvar}
        onDescargar={() => descargarDocumento(a.nombre, html)}
      />
      <div
        className="flex min-h-0 flex-1 flex-col"
        onKeyDown={(e) => {
          if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
            e.preventDefault()
            if (sucio && !guardar.isPending) salvar()
          }
        }}
      >
        <EditorTexto
          documento
          etiqueta={`Contenido de ${a.nombre}`}
          valor={inicial}
          onCambio={setHtml}
          onImprimir={() => imprimirHtml(a.nombre, html)}
        />
      </div>
      <ConfirmDiscardDialog
        open={descartar}
        onOpenChange={setDescartar}
        onConfirm={() => {
          setDescartar(false)
          onVolver()
        }}
      />
    </>
  )
}

function Encabezado({
  archivo: a,
  onVolver,
  sucio,
  guardando,
  onGuardar,
  onDescargar,
}: {
  archivo: ArchivoCompartido
  onVolver: () => void
  sucio?: boolean
  guardando?: boolean
  onGuardar?: () => void
  onDescargar?: () => void
}) {
  return (
    <header className="flex h-16 shrink-0 items-center gap-3 border-b px-3 md:px-5">
      <button
        type="button"
        onClick={onVolver}
        aria-label="Volver a Archivos"
        title="Volver a Archivos"
        className="grid size-9 shrink-0 place-items-center rounded-full hover:bg-muted/60 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
      >
        <ArrowLeftIcon className="size-5" />
      </button>
      <h2 className="min-w-0 truncate text-lg font-semibold" title={a.nombre}>
        {a.nombre}
      </h2>
      {sucio && <span className="shrink-0 text-xs text-muted-foreground">Cambios sin guardar</span>}
      <div className="ml-auto flex shrink-0 items-center gap-1">
        {onGuardar && (
          <button
            type="button"
            onClick={onGuardar}
            disabled={!sucio || guardando}
            aria-label="Guardar (Ctrl+S)"
            title="Guardar (Ctrl+S)"
            className="grid size-9 place-items-center rounded-full text-primary hover:bg-primary/10 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none disabled:text-muted-foreground disabled:hover:bg-transparent"
          >
            {guardando ? (
              <SpinnerIcon className="size-5 animate-spin" />
            ) : (
              <FloppyDiskIcon className="size-5" />
            )}
          </button>
        )}
        {onDescargar && (
          <button
            type="button"
            onClick={onDescargar}
            aria-label="Descargar"
            title="Descargar"
            className="grid size-9 place-items-center rounded-full text-primary hover:bg-primary/10 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
          >
            <FileDownloadOutlinedIcon className="size-5" />
          </button>
        )}
      </div>
    </header>
  )
}
