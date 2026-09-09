import DocViewer, { DocViewerRenderers } from "@cyntler/react-doc-viewer"
import "@cyntler/react-doc-viewer/dist/index.css"
import YouTube from "react-youtube"

import { Button } from "@/components/ui/button"
import { GlobeIcon, InsertLinkOutlinedIcon, WarningCircleIcon } from "@/components/ui/icons"

import type { Recurso } from "@/features/planeador/api/types/actividad"
import { recursoHostLabel, resolveRecursoPreview } from "@/features/planeador/lib/recurso-preview"

/**
 * Estado vacío compartido por los 3 casos sin nada que renderizar: sin
 * fuente cargada, tipo "Archivo" (no hay almacenamiento real de archivos
 * en este entorno de prueba — el input de tipo `file` solo captura el
 * nombre) y URL que no se pudo interpretar como enlace.
 */
function RecursoPreviewVacio({ titulo, mensaje }: { titulo: string; mensaje: string }) {
  return (
    <div className="text-muted-foreground flex flex-col items-center gap-2 rounded-md border border-dashed py-16 text-center text-sm">
      <WarningCircleIcon className="size-6" />
      <p className="font-semibold text-foreground">{titulo}</p>
      <p className="max-w-md">{mensaje}</p>
    </div>
  )
}

/** Enlace que no se pudo previsualizar inline (sitio web genérico, o un
 *  link de Drive/Dropbox sin nombre de archivo reconocible): en vez de
 *  forzar un iframe a un sitio arbitrario, se ofrece abrirlo en pestaña
 *  nueva — mismo criterio que el botón "ojito" tenía antes de esta
 *  página, pero acompañado de contexto (de dónde viene el enlace). */
function EnlaceExterno({ url }: { url: string }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-md border border-dashed py-16 text-center text-sm">
      <GlobeIcon className="text-muted-foreground size-6" />
      <div>
        <p className="font-semibold">Vista previa no disponible para {recursoHostLabel(url)}</p>
        <p className="text-muted-foreground mt-1 max-w-md break-all">{url}</p>
      </div>
      <Button
        variant="outline"
        color="primary"
        size="sm"
        type="button"
        render={<a href={url} target="_blank" rel="noopener noreferrer" />}
      >
        <InsertLinkOutlinedIcon data-icon="inline-start" />
        Abrir en una pestaña nueva
      </Button>
    </div>
  )
}

/**
 * Previsualización de un recurso según su URL: YouTube embebido
 * (`react-youtube`), documentos/imágenes/video vía `@cyntler/react-doc-viewer`
 * (PDF, imágenes, mp4, y office/doc a través del visor de MS Office que la
 * propia librería integra), o un enlace externo si no se puede reconocer
 * el tipo real de archivo (p. ej. Drive sin nombre de archivo en la URL).
 *
 * Los recursos tipo "Archivo" no tienen contraparte real acá: el form solo
 * captura el nombre del archivo elegido (`<input type="file">` no expone su
 * contenido sin subirlo a un backend, que este mock no tiene), así que se
 * muestra el estado vacío en vez de intentar renderizar un nombre de
 * archivo como si fuera una URL.
 */
export function RecursoPreview({ recurso }: { recurso: Recurso }) {
  const url = recurso.url.trim()

  if (recurso.tipo === "Archivo") {
    return (
      <RecursoPreviewVacio
        titulo={url || "Archivo sin nombre"}
        mensaje="Este entorno de prueba no almacena el contenido real de los archivos subidos, solo su nombre — no hay bytes que previsualizar."
      />
    )
  }

  if (!url) {
    return (
      <RecursoPreviewVacio
        titulo="Este recurso no tiene una fuente cargada"
        mensaje="Agregá una URL en el formulario de la actividad para poder previsualizarlo acá."
      />
    )
  }

  const resolved = resolveRecursoPreview(url)

  if (!resolved) {
    return (
      <RecursoPreviewVacio
        titulo="No se pudo interpretar esta fuente como una URL"
        mensaje={url}
      />
    )
  }

  if (resolved.kind === "youtube") {
    return (
      <div className="mx-auto aspect-video w-full max-w-4xl overflow-hidden rounded-md border">
        <YouTube
          videoId={resolved.value}
          className="size-full"
          iframeClassName="size-full"
          opts={{ width: "100%", height: "100%" }}
          title={recurso.titulo || recurso.fuente || "Video de YouTube"}
        />
      </div>
    )
  }

  if (resolved.kind === "documento") {
    return (
      <div className="mx-auto w-full max-w-4xl overflow-hidden rounded-md border">
        <DocViewer
          documents={[{ uri: resolved.value, fileType: resolved.fileType }]}
          pluginRenderers={DocViewerRenderers}
          config={{ header: { disableFileName: true } }}
          style={{ minHeight: "70vh" }}
        />
      </div>
    )
  }

  return <EnlaceExterno url={resolved.value} />
}
