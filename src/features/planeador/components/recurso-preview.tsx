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

/**
 * Un archivo local (`blob:`) que ya no se puede leer, o uno cuyo códec este
 * navegador no soporta. Son dos causas distintas con el mismo síntoma —el
 * elemento dispara `error` y no suena/no se ve nada—, así que el mensaje
 * nombra las dos en vez de adivinar.
 *
 * El caso del blob perdido es real y fácil de provocar: la vista previa es
 * una ruta aparte y el archivo vive en memoria de ESTA pestaña, así que
 * recargar la página o abrir el enlace en otra pestaña lo deja sin bytes.
 * Sin este aviso, el usuario ve un reproductor mudo y no sabe si el problema
 * es su archivo.
 */
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

/**
 * Video. Se usa `<video>` nativo y no `ReactPlayer` cuando la fuente es un
 * archivo propio: el player está para las plataformas (YouTube y compañía) y
 * para un `blob:` solo agrega una capa que no aporta nada. El nativo además
 * da el evento `error`, que es lo que deja avisar cuando el códec no va.
 */
function VideoPreview({ url, nombre }: { url: string; nombre?: string }) {
  const [error, setError] = useState(false)
  if (error) return <MedioNoReproducible url={url} nombre={nombre} />
  return (
    <div className="mx-auto aspect-video w-full max-w-4xl overflow-hidden rounded-md border bg-black">
      <video
        src={url}
        controls
        // `metadata` y no `auto`: con un video grande, precargarlo entero
        // para una vista previa que capaz nadie reproduce es tráfico
        // regalado. Alcanza para pintar la duración y el primer cuadro.
        preload="metadata"
        className="h-full w-full"
        onError={() => setError(true)}
      >
        Tu navegador no puede reproducir este video.
      </video>
    </div>
  )
}

/**
 * Audio. No tiene "lienzo" que mostrar, así que la caja la ocupan el nombre
 * del archivo y la barra de reproducción — un `<audio>` suelto en el medio de
 * una pantalla vacía se lee como si algo hubiera fallado.
 */
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

/** Botón de escape para las vistas que viven dentro de un iframe.
 *
 *  Un iframe hacia otro dominio no avisa cuando lo rechazan: si el servidor
 *  manda `X-Frame-Options` o el archivo es privado, el marco queda en blanco
 *  y no hay evento que lo delate (leer su contenido sería cruzar el origen).
 *  Por eso el enlace se ofrece siempre, no como reacción a un error que no
 *  podemos detectar. */
function AbrirAparte({ url, etiqueta }: { url: string; etiqueta: string }) {
  return (
    <div className="mt-2 flex justify-end">
      <Button
        variant="ghost"
        color="neutral"
        size="sm"
        type="button"
        render={<a href={url} target="_blank" rel="noopener noreferrer" />}
      >
        <InsertLinkOutlinedIcon data-icon="inline-start" />
        {etiqueta}
      </Button>
    </div>
  )
}

/** PDF: el browser lo renderiza nativamente dentro del iframe si el servidor
 *  lo expone con `Content-Type: application/pdf`. Si no, el iframe queda en
 *  blanco o muestra el error del browser — preferible a un placeholder que
 *  mienta sobre el contenido. */
function PdfPreview({ url }: { url: string }) {
  return (
    <div className="mx-auto w-full max-w-4xl">
      <div className="bg-card overflow-hidden rounded-md border">
        <iframe
          src={url}
          title="Vista previa del PDF"
          className="h-[80vh] w-full"
        />
      </div>
      {!url.startsWith("blob:") && <AbrirAparte url={url} etiqueta="Abrir el PDF aparte" />}
    </div>
  )
}

/**
 * Visor del propio repositorio (Google Drive, Docs) embebido.
 *
 * Es lo que resuelve el caso que no se puede resolver de otra forma: un
 * enlace de Drive no dice si del otro lado hay un PDF, una foto, un video o
 * un audio, y su visor sí lo sabe. Delegar le pasa los cuatro casos a quien
 * tiene la información.
 *
 * No lleva `sandbox`. Un visor de Drive necesita scripts y su propio origen
 * para andar, y `allow-scripts` + `allow-same-origin` juntos dejan al marco
 * quitarse el sandbox solo, así que la restricción sería más declarativa que
 * real — y a cambio arriesga dejarlo en blanco. Es el mismo trato que el
 * embebido de YouTube de más arriba.
 */
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
          // `allow` es lo que habilita que el reproductor de Drive pueda
          // sonar y ponerse en pantalla completa desde adentro del marco.
          allow="autoplay; encrypted-media; fullscreen"
        />
      </div>
      <AbrirAparte url={urlOriginal} etiqueta={`Abrir en ${proveedor}`} />
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

/**
 * Plataforma de video o audio que `react-player` ya sabe embeber: Vimeo,
 * Twitch, Wistia, Spotify, TikTok, streams HLS/DASH.
 *
 * La lista no se escribe acá a mano: se le pregunta a la librería con
 * `ReactPlayer.canPlay`, que es la misma función con la que decide internamente
 * qué reproductor usar. Escribir nuestra propia lista de dominios significaría
 * mantenerla sincronizada con la suya para siempre, y quedar cortos cada vez
 * que agreguen una plataforma.
 *
 * La consulta vive en el componente y no en `resolveRecursoPreview` a
 * propósito: ese archivo es lógica pura y lo importa también el formulario
 * (por `RECURSO_ARCHIVO_ACCEPT`), así que meterle un import de `react-player`
 * arrastraría el reproductor entero al bundle de una pantalla que no lo usa.
 */
function puedeReactPlayer(url: string): boolean {
  // `canPlay` está declarado como opcional en los tipos de react-player v3
  // (`Partial<{...}>`), así que se comprueba antes de llamarlo en vez de
  // confiar en que siempre viene.
  return typeof ReactPlayer.canPlay === "function" && ReactPlayer.canPlay(url)
}

function PlataformaPreview({ url }: { url: string }) {
  return (
    <div className="mx-auto aspect-video w-full max-w-4xl overflow-hidden rounded-md border bg-black">
      <ReactPlayer src={url} controls width="100%" height="100%" />
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

/**
 * Un material de tipo "Archivo" YA GUARDADO, que se pide por su
 * `PK_TARCHIVO`.
 *
 * No se puede apuntar un `<img>`/`<video>` directo al archivo: esas etiquetas
 * no mandan el header `Authorization`, así que el backend tiene un paso
 * previo — se acuña un token de un solo archivo y de vida corta, y la URL que
 * vuelve ya lo lleva en el query-string. `useArchivoViewUrl` lo resuelve y lo
 * renueva antes de que expire; es el mismo mecanismo que ya usan matrícula y
 * asistencia para sus imágenes.
 *
 * El TIPO no sale de esa URL sino del nombre del archivo, que el detalle
 * completa desde `GET .../materiales/archivos` (V427). Por eso el resolver
 * recibe la URL ya firmada junto con el nombre: la URL no tiene extensión en
 * el path, igual que un blob.
 */
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

  // Sin nombre no hay extensión y no hay forma de saber qué renderizar. Pasa
  // con materiales guardados antes de que el detalle trajera los nombres.
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

/**
 * Previsualización de un recurso según su URL/tipo:
 * - YouTube  → reproductor embebido (`react-player`)
 * - Video    → `<video controls>` para `.mp4`/`.webm`/`.mov`/`.m4v`
 * - Audio    → `<audio controls>` para `.mp3`/`.wav`/`.ogg`/`.m4a`…
 * - Imagen   → `<img>` plano
 * - PDF      → `<iframe>` (el browser lo renderiza nativo)
 * - .docx    → `mammoth.convertToHtml` (parseo client-side, sin MS Office)
 * - Drive    → el visor del propio repositorio, embebido (ver `EmbedPreview`)
 * - Plataforma → `react-player`, para lo que esa librería ya sabe embeber
 * - Web      → screenshot vía `fetchFromApi`, con fallback a `<Microlink>`
 *
 * Los recursos tipo "Archivo" pasan por el mismo camino que el resto. Antes
 * se descartaban de entrada con un estado vacío que decía que no había bytes
 * que mostrar, y eso ya no es cierto: el form guarda el archivo elegido como
 * `blob:` URL y su nombre en `fuente` (ver `RecursoForm`), que es
 * exactamente lo que `resolveRecursoPreview` necesita para decidir el tipo
 * — el `blob:` no trae extensión en el path, pero el nombre sí.
 *
 * Esos bytes viven en la memoria de ESTA pestaña, así que el enlace sirve
 * mientras no se recargue: si se pierden, el elemento dispara `error` y se
 * muestra `MedioNoReproducible`, que lo explica en vez de dejar un
 * reproductor mudo.
 */
export function RecursoPreview({ recurso }: { recurso: Recurso }) {
  const url = recurso.url.trim()
  // Para un archivo local, `fuente` es el nombre original; para un enlace, la
  // etiqueta que tipeó el usuario. En los dos casos es el mejor rótulo que
  // hay para el reproductor.
  const nombre = recurso.fuente?.trim() || undefined

  // Un archivo ya guardado se resuelve por su id, no por la url: el detalle
  // no devuelve ninguna (el binario vive detrás de un token de vista). Se
  // comprueba ANTES que `url` porque un recurso recién reemplazado en el
  // formulario puede tener las dos cosas, y ahí manda el blob: es lo que el
  // usuario acaba de elegir.
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

  // `fuente` es el nombre del archivo (cuando es un blob URL local) o la
  // etiqueta que el usuario tipeó; lo pasamos al resolver para que pueda
  // detectar la extensión de archivos locales.
  const resolved = resolveRecursoPreview(url, recurso.fuente)

  if (!resolved) {
    // Un archivo local cuyo nombre no dice nada reconocible (sin extensión,
    // o una que no está en las listas) no se puede clasificar a ciegas: no
    // hay URL que pedirle al servidor ni tipo que adivinar sin leer bytes.
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
    // Otros formatos que `resolveRecursoPreview` conoce (csv, xls, …) no se
    // renderizan inline. Para un enlace se cae al screenshot; para un archivo
    // local NO, porque un `blob:` no es una página que Microlink pueda ir a
    // visitar — pedírselo sería garantizar un error con otro nombre.
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
  // "web": no se reconoció nada por la URL. Antes del screenshot se le
  // pregunta a react-player, que cubre plataformas (Vimeo, Spotify, Twitch…)
  // cuyas URLs tampoco tienen extensión y que hasta ahora terminaban como una
  // captura de pantalla en vez de un reproductor.
  if (puedeReactPlayer(resolved.value)) {
    return <PlataformaPreview url={resolved.value} />
  }
  return <WebPreview url={resolved.value} />
}
