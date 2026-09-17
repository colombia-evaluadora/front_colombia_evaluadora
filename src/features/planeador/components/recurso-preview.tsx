import { useEffect, useState } from "react"
import ReactPlayer from "react-player"
import Microlink, { fetchFromApi } from "@microlink/react"

import { Button } from "@/components/ui/button"
import {
  GlobeIcon,
  InsertLinkOutlinedIcon,
  WarningCircleIcon,
} from "@/components/ui/icons"

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

function VideoPreview({ url }: { url: string }) {
  return (
    <div className="mx-auto aspect-video w-full max-w-4xl overflow-hidden rounded-md border bg-black">
      <ReactPlayer src={url} controls width="100%" height="100%" />
    </div>
  )
}

function ImagePreview({ url }: { url: string }) {
  return (
    <div className="mx-auto flex max-h-[80vh] w-full max-w-4xl items-center justify-center overflow-hidden rounded-md border bg-card">
      <img
        src={url}
        alt=""
        className="max-h-full max-w-full object-contain"
      />
    </div>
  )
}

/** PDF: el browser lo renderiza nativamente dentro del iframe si el servidor
 *  lo expone con `Content-Type: application/pdf`. Si no, el iframe queda en
 *  blanco o muestra el error del browser — preferible a un placeholder que
 *  mienta sobre el contenido. */
function PdfPreview({ url }: { url: string }) {
  return (
    <div className="mx-auto w-full max-w-4xl overflow-hidden rounded-md border bg-card">
      <iframe
        src={url}
        title="Vista previa del PDF"
        className="h-[80vh] w-full"
      />
    </div>
  )
}

/** .docx / .doc: mammoth los parsea client-side (sin MS Office online, sin
 *  servicios externos) y devuelve HTML ya saneado (sólo deja p/h1-h6/ul/ol/
 *  table). El import dinámico evita que el bundle de mammoth entre al
 *  initial load: solo se carga cuando realmente hay un docx para ver. */
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
  // mammoth sanitiza el HTML antes de devolverlo (sólo deja los tags que
  // sabe mapear desde .docx); no se expone dangerouslySetInnerHTML a HTML
  // externo no controlado.
  return (
    <div className="mx-auto w-full max-w-4xl rounded-md border bg-card p-6">
      <div
        className="space-y-3 text-sm leading-relaxed"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  )
}

/** Sitio web genérico / link sin extensión reconocible: pedimos un PNG de
 *  la página al servicio de Microlink. Si la API no puede (intranets, links
 *  detrás de login), caemos al componente `<Microlink>` que muestra una
 *  card con metadata, y si tampoco puede, su `fallback` da "abrir en
 *  pestaña nueva". */
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

/* ───── componente principal ────────────────────────────────────────── */

/**
 * Previsualización de un recurso según su URL/tipo:
 * - YouTube  → reproductor embebido (`react-player`)
 * - Video    → mismo reproductor para `.mp4`/`.webm`/`.mov`/`.m4v`
 * - Imagen   → `<img>` plano
 * - PDF      → `<iframe>` (el browser lo renderiza nativo)
 * - .docx    → `mammoth.convertToHtml` (parseo client-side, sin MS Office)
 * - Web      → screenshot vía `fetchFromApi`, con fallback a `<Microlink>`
 *
 * Los recursos tipo "Archivo" no tienen contraparte acá: el `<input
 * type="file">` del form sólo expone el nombre (no los bytes), así que
 * no hay contenido que previsualizar — se muestra el estado vacío.
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

  // `fuente` es el nombre del archivo (cuando es un blob URL local) o la
  // etiqueta que el usuario tipeó; lo pasamos al resolver para que pueda
  // detectar la extensión de archivos locales.
  const resolved = resolveRecursoPreview(url, recurso.fuente)

  if (!resolved) {
    return (
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
    return <VideoPreview url={resolved.value} />
  }
  if (resolved.kind === "image") {
    return <ImagePreview url={resolved.value} />
  }
  if (resolved.kind === "documento") {
    const ft = resolved.fileType
    if (ft === ".docx" || ft === ".doc") {
      return <DocxPreview url={resolved.value} />
    }
    if (ft === ".pdf") {
      return <PdfPreview url={resolved.value} />
    }
    // Otros formatos que `resolveRecursoPreview` conoce (csv, xls, …) no
    // se renderizan inline — caemos al preview web (screenshot).
    return <WebPreview url={resolved.value} />
  }
  // "web": enlace sin extensión reconocible (Drive, sitio genérico).
  return <WebPreview url={resolved.value} />
}
