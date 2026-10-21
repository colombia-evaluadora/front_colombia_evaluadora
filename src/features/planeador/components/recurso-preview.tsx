import { useEffect, useState } from "react"
import ReactPlayer from "react-player"
import Microlink, { fetchFromApi } from "@microlink/react"

import { Button } from "@/components/ui/button"
import {
  AudioIcon,
  GlobeIcon,
  InsertLinkOutlinedIcon,
  WarningCircleIcon,
} from "@/components/ui/icons"

import { useArchivoViewUrl } from "@/features/files/api/query/use-archivo-view-url"
import type { Recurso } from "@/features/planeador/api/types/actividad"
import {
  recursoHostLabel,
  resolveRecursoPreview,
} from "@/features/planeador/lib/recurso-preview"

/* ───── estados compartidos ──────────────────────────────────────────── */

function RecursoPreviewVacio({
  titulo,
  mensaje,
}: {
  titulo: string
  mensaje: string
}) {
  return (
    <div className="text-muted-foreground flex flex-col items-center gap-2 rounded-md border border-dashed py-16 text-center text-sm">
      <WarningCircleIcon className="size-6" />
      <p className="font-semibold text-foreground">{titulo}</p>
      <p className="max-w-md">{mensaje}</p>
    </div>
  )
}

function RecursoPreviewCargando() {
  return (
    <div className="text-muted-foreground flex items-center justify-center rounded-md border border-dashed py-16 text-sm">
      <p>Cargando vista previa…</p>
    </div>
  )
}

/** Enlace no previsualizable inline: se ofrece abrirlo en pestaña nueva en vez de forzar un iframe. */
function EnlaceExterno({ url }: { url: string }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-md border border-dashed py-16 text-center text-sm">
      <GlobeIcon className="text-muted-foreground size-6" />
      <div>
        <p className="font-semibold">
          Vista previa no disponible para {recursoHostLabel(url)}
        </p>
        <p className="text-muted-foreground mt-1 max-w-md break-all">{url}</p>
      </div>
      <Button
        variant="outline"
        color="primary"
        size="sm"
        type="button"
        nativeButton={false}
        render={
          <a href={url} target="_blank" rel="noopener noreferrer" />
        }
      >
        <InsertLinkOutlinedIcon data-icon="inline-start" />
        Abrir en una pestaña nueva
      </Button>
    </div>
  )
}

/** Blob perdido (recarga/otra pestaña) o códec no soportado: mismo síntoma, el mensaje nombra ambos. */
function MedioNoReproducible({
  url,
  nombre,
}: {
  url: string
  nombre?: string
}) {
  const esLocal = url.startsWith("blob:")
  return (
    <div className="flex flex-col items-center gap-3 rounded-md border border-dashed py-16 text-center text-sm">
      <WarningCircleIcon className="text-muted-foreground size-6" />
      <div>
        <p className="font-semibold">No se pudo reproducir este archivo</p>
        <p className="text-muted-foreground mt-1 max-w-md">
          {esLocal
            ? "El archivo todavía no está guardado: vive en la pestaña donde lo seleccionaste. Si recargaste esta página o la abriste en otra pestaña, volvé al formulario de la actividad y probá de nuevo desde ahí."
            : "Puede que este navegador no soporte el formato. Descargalo para abrirlo con otra aplicación."}
        </p>
        {nombre && (
          <p className="text-muted-foreground mt-1 max-w-md break-all text-xs">{nombre}</p>
        )}
      </div>
      {!esLocal && (
        <Button
          variant="outline"
          color="primary"
          size="sm"
          type="button"
          nativeButton={false}
          render={<a href={url} download target="_blank" rel="noopener noreferrer" />}
        >
          <InsertLinkOutlinedIcon data-icon="inline-start" />
          Descargar el archivo
        </Button>
      )}
    </div>
  )
}

/* ───── renderers por tipo ──────────────────────────────────────────── */

function YoutubePreview({ videoId }: { videoId: string }) {
  return (
    <div className="mx-auto aspect-video w-full max-w-4xl overflow-hidden rounded-md border bg-black">
      <ReactPlayer
        src={`https://www.youtube.com/watch?v=${videoId}`}
        controls
        width="100%"
        height="100%"
      />
    </div>
  )
}

/** `<video>` nativo para archivos propios: da el evento `error` para avisar si el códec falla. */
function VideoPreview({ url, nombre }: { url: string; nombre?: string }) {
  const [error, setError] = useState(false)
  if (error) return <MedioNoReproducible url={url} nombre={nombre} />
  return (
    <div className="mx-auto aspect-video w-full max-w-4xl overflow-hidden rounded-md border bg-black">
      <video
        src={url}
        controls
        // `metadata`: evita precargar el video entero solo para la vista previa.
        preload="metadata"
        className="h-full w-full"
        onError={() => setError(true)}
      >
        Tu navegador no puede reproducir este video.
      </video>
    </div>
  )
}

/** Audio: nombre + barra, para que no parezca una pantalla vacía rota. */
function AudioPreview({ url, nombre }: { url: string; nombre?: string }) {
  const [error, setError] = useState(false)
  if (error) return <MedioNoReproducible url={url} nombre={nombre} />
  return (
    <div className="bg-card mx-auto flex w-full max-w-2xl flex-col items-center gap-4 rounded-md border p-8">
      <AudioIcon className="text-muted-foreground size-10" />
      {nombre && <p className="max-w-full truncate text-sm font-semibold">{nombre}</p>}
      <audio
        src={url}
        controls
        preload="metadata"
        className="w-full"
        onError={() => setError(true)}
      >
        Tu navegador no puede reproducir este audio.
      </audio>
    </div>
  )
}

function ImagePreview({ url, nombre }: { url: string; nombre?: string }) {
  const [error, setError] = useState(false)
  if (error) return <MedioNoReproducible url={url} nombre={nombre} />
  return (
    <div className="bg-card mx-auto flex max-h-[80vh] w-full max-w-4xl items-center justify-center overflow-hidden rounded-md border">
      <img
        src={url}
        alt={nombre || ""}
        className="max-h-full max-w-full object-contain"
        onError={() => setError(true)}
      />
    </div>
  )
}

/** Enlace siempre visible: un iframe rechazado (X-Frame-Options) queda en blanco sin evento detectable. */
function AbrirAparte({ url, etiqueta }: { url: string; etiqueta: string }) {
  return (
    <div className="mt-2 flex justify-end">
      <Button
        variant="ghost"
        color="neutral"
        size="sm"
        type="button"
        nativeButton={false}
        render={<a href={url} target="_blank" rel="noopener noreferrer" />}
      >
        <InsertLinkOutlinedIcon data-icon="inline-start" />
        {etiqueta}
      </Button>
    </div>
  )
}

/** PDF: la URL firmada trae `X-Frame-Options: DENY` del gateway, así que se baja con `fetch`
 * y se sirve como `blob:` al iframe. */
function PdfPreview({ url }: { url: string }) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null)
  const [error, setError] = useState(false)
  const esLocal = url.startsWith("blob:")

  useEffect(() => {
    if (esLocal) return
    let cancelled = false
    let objectUrl: string | null = null
    setBlobUrl(null)
    setError(false)
    fetch(url)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.blob()
      })
      .then((blob) => {
        if (cancelled) return
        objectUrl = URL.createObjectURL(blob)
        setBlobUrl(objectUrl)
      })
      .catch(() => {
        if (!cancelled) setError(true)
      })
    return () => {
      cancelled = true
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [url, esLocal])

  if (!esLocal && error) return <EnlaceExterno url={url} />
  if (!esLocal && blobUrl === null) return <RecursoPreviewCargando />

  return (
    <div className="mx-auto w-full max-w-4xl">
      <div className="bg-card overflow-hidden rounded-md border">
        <iframe
          src={esLocal ? url : (blobUrl ?? undefined)}
          title="Vista previa del PDF"
          className="h-[80vh] w-full"
        />
      </div>
      {!esLocal && <AbrirAparte url={url} etiqueta="Abrir el PDF aparte" />}
    </div>
  )
}

/** Visor de Drive embebido: sabe qué tipo hay detrás del enlace. Sin `sandbox` (lo necesita para andar). */
function EmbedPreview({
  url,
  proveedor,
  urlOriginal,
}: {
  url: string
  proveedor: string
  urlOriginal: string
}) {
  return (
    <div className="mx-auto w-full max-w-4xl">
      <div className="bg-card overflow-hidden rounded-md border">
        <iframe
          src={url}
          title={`Vista previa en ${proveedor}`}
          className="h-[80vh] w-full"
          // Permite sonido y pantalla completa dentro del marco.
          allow="autoplay; encrypted-media; fullscreen"
        />
      </div>
      <AbrirAparte url={urlOriginal} etiqueta={`Abrir en ${proveedor}`} />
    </div>
  )
}

/** .docx vía mammoth client-side; import dinámico para no cargarlo en el bundle inicial. */
function DocxPreview({ url }: { url: string }) {
  const [html, setHtml] = useState<string | null>(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    let cancelled = false
    setHtml(null)
    setError(false)
    fetch(url)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.arrayBuffer()
      })
      .then((buffer) =>
        import("mammoth").then((mammoth) =>
          mammoth.convertToHtml({ arrayBuffer: buffer }),
        ),
      )
      .then((result) => {
        if (!cancelled) setHtml(result.value)
      })
      .catch(() => {
        if (!cancelled) setError(true)
      })
    return () => {
      cancelled = true
    }
  }, [url])

  if (error) return <EnlaceExterno url={url} />
  if (html === null) return <RecursoPreviewCargando />
  // mammoth ya devuelve HTML saneado.
  return (
    <div className="mx-auto w-full max-w-4xl rounded-md border bg-card p-6">
      <div
        className="space-y-3 text-sm leading-relaxed"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  )
}

/** Plataformas que `ReactPlayer.canPlay` sabe embeber. Vive aquí y no en `resolveRecursoPreview`
 * para no arrastrar react-player al bundle del formulario. */
function puedeReactPlayer(url: string): boolean {
  // `canPlay` es opcional en los tipos de react-player v3.
  return typeof ReactPlayer.canPlay === "function" && ReactPlayer.canPlay(url)
}

function PlataformaPreview({ url }: { url: string }) {
  return (
    <div className="mx-auto aspect-video w-full max-w-4xl overflow-hidden rounded-md border bg-black">
      <ReactPlayer src={url} controls width="100%" height="100%" />
    </div>
  )
}

/** Web genérica: screenshot de Microlink, con fallback a la card `<Microlink>`. */
function WebPreview({ url }: { url: string }) {
  const [screenshot, setScreenshot] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setScreenshot(null)
    fetchFromApi(url, { screenshot: true })
      .then((data) => {
        if (cancelled) return
        const shotUrl = data.screenshot?.url
        if (shotUrl) setScreenshot(shotUrl)
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [url])

  if (loading) return <RecursoPreviewCargando />
  if (screenshot) {
    return (
      <div className="mx-auto w-full max-w-4xl overflow-hidden rounded-md border bg-card">
        <img src={screenshot} alt="" className="w-full" />
      </div>
    )
  }
  return (
    <div className="mx-auto w-full max-w-4xl rounded-md border bg-card p-4">
      <Microlink url={url} fallback={<EnlaceExterno url={url} />} />
    </div>
  )
}

/** Archivo ya guardado (`PK_TARCHIVO`): URL con token de vista vía `useArchivoViewUrl`; el tipo sale
 * del nombre (V427) porque la URL no tiene extensión. */
function ArchivoGuardadoPreview({
  archivoId,
  nombre,
}: {
  archivoId: number
  nombre?: string
}) {
  const { data: url, isPending, isError } = useArchivoViewUrl(archivoId)

  if (isPending) return <RecursoPreviewCargando />

  if (isError || !url) {
    return (
      <RecursoPreviewVacio
        titulo={nombre || `Archivo ${archivoId}`}
        mensaje="No se pudo obtener el permiso de lectura de este archivo. Puede que ya no exista o que tu sesión no alcance a verlo."
      />
    )
  }

  // Materiales guardados antes de que el detalle trajera nombres.
  const resuelto = resolveRecursoPreview(url, nombre)
  if (!resuelto) {
    return (
      <RecursoPreviewVacio
        titulo={nombre || `Archivo ${archivoId}`}
        mensaje="No se reconoce el tipo de este archivo por su nombre. La vista previa admite imágenes, audio, video y PDF."
      />
    )
  }

  if (resuelto.kind === "video") return <VideoPreview url={resuelto.value} nombre={nombre} />
  if (resuelto.kind === "audio") return <AudioPreview url={resuelto.value} nombre={nombre} />
  if (resuelto.kind === "image") return <ImagePreview url={resuelto.value} nombre={nombre} />
  if (resuelto.kind === "documento" && resuelto.fileType === ".pdf") {
    return <PdfPreview url={resuelto.value} />
  }
  if (resuelto.kind === "documento" && (resuelto.fileType === ".docx" || resuelto.fileType === ".doc")) {
    return <DocxPreview url={resuelto.value} />
  }
  return (
    <RecursoPreviewVacio
      titulo={nombre || `Archivo ${archivoId}`}
      mensaje={`No hay vista previa para los archivos ${resuelto.fileType ?? "de este tipo"}. La vista previa admite imágenes, audio, video y PDF.`}
    />
  )
}

/* ───── componente principal ────────────────────────────────────────── */

/** Previsualización según URL/tipo. Los `blob:` solo viven en esta pestaña; si se pierden se muestra `MedioNoReproducible`. */
export function RecursoPreview({ recurso }: { recurso: Recurso }) {
  const url = recurso.url.trim()
  const nombre = recurso.fuente?.trim() || undefined

  // Va antes que `url`: si el recurso se reemplazó en el form, manda el blob recién elegido.
  if (recurso.archivoId !== undefined && !url.startsWith("blob:")) {
    return <ArchivoGuardadoPreview archivoId={recurso.archivoId} nombre={nombre} />
  }

  if (!url) {
    return (
      <RecursoPreviewVacio
        titulo="Este recurso no tiene una fuente cargada"
        mensaje={
          recurso.tipo === "Archivo"
            ? "Elegí un archivo en el formulario de la actividad para poder previsualizarlo acá."
            : "Agregá una URL en el formulario de la actividad para poder previsualizarlo acá."
        }
      />
    )
  }

  // `fuente` da la extensión de archivos locales.
  const resolved = resolveRecursoPreview(url, recurso.fuente)

  if (!resolved) {
    // Archivo local sin extensión reconocible: no se puede clasificar.
    return recurso.tipo === "Archivo" ? (
      <RecursoPreviewVacio
        titulo={nombre || "Archivo sin nombre"}
        mensaje="No se reconoce el tipo de este archivo por su nombre. La vista previa admite imágenes, audio, video y PDF."
      />
    ) : (
      <RecursoPreviewVacio
        titulo="No se pudo interpretar esta fuente como una URL"
        mensaje={url}
      />
    )
  }

  if (resolved.kind === "youtube") {
    return <YoutubePreview videoId={resolved.value} />
  }
  if (resolved.kind === "video") {
    return <VideoPreview url={resolved.value} nombre={nombre} />
  }
  if (resolved.kind === "audio") {
    return <AudioPreview url={resolved.value} nombre={nombre} />
  }
  if (resolved.kind === "image") {
    return <ImagePreview url={resolved.value} nombre={nombre} />
  }
  if (resolved.kind === "documento") {
    const ft = resolved.fileType
    if (ft === ".docx" || ft === ".doc") {
      return <DocxPreview url={resolved.value} />
    }
    if (ft === ".pdf") {
      return <PdfPreview url={resolved.value} />
    }
    // Otros formatos: enlace → screenshot; blob local no, Microlink no puede visitarlo.
    if (resolved.value.startsWith("blob:")) {
      return (
        <RecursoPreviewVacio
          titulo={nombre || "Archivo sin vista previa"}
          mensaje={`No hay vista previa para los archivos ${ft}. La vista previa admite imágenes, audio, video y PDF.`}
        />
      )
    }
    return <WebPreview url={resolved.value} />
  }
  if (resolved.kind === "embed") {
    return (
      <EmbedPreview
        url={resolved.value}
        proveedor={resolved.proveedor ?? "el repositorio"}
        urlOriginal={resolved.urlOriginal ?? url}
      />
    )
  }
  // Antes del screenshot se prueba react-player (Vimeo, Spotify, Twitch…).
  if (puedeReactPlayer(resolved.value)) {
    return <PlataformaPreview url={resolved.value} />
  }
  return <WebPreview url={resolved.value} />
}
