import { useEffect, useState } from "react"

import { AudioIcon } from "@/components/ui/icons"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import { fetchArchivoViewUrl } from "@/lib/files"
import { mimeAudio } from "@/features/comunicaciones/chat/lib/archivo-adjunto"

/**
 * Reproductor inline de un audio adjunto (nota de voz). No se apunta el `<audio>` directo al
 * token de vista: file-service no responde rangos (Safari no reproduce sin `206`) y sirve los
 * audios como `octet-stream`. Se baja el binario completo (máx. 20 MB) recién al pulsar
 * "Escuchar" y se reproduce desde un `blob:` con el MIME correcto. Escuchar no cuenta como
 * descarga (igual que la vista previa de un video): el autor puede seguir quitándolo.
 */
export function ReproductorAudio({
  archivoId,
  nombre,
  className,
}: {
  archivoId: number | null | undefined
  nombre: string
  className?: string
}) {
  const [estado, setEstado] = useState<"inactivo" | "cargando" | "error">("inactivo")
  const [url, setUrl] = useState<string | null>(null)
  useEffect(() => () => {
    if (url) URL.revokeObjectURL(url)
  }, [url])

  if (archivoId == null) return null
  const cargar = async () => {
    setEstado("cargando")
    try {
      const { url: vista } = await fetchArchivoViewUrl(archivoId)
      const respuesta = await fetch(vista, { credentials: "include" })
      if (!respuesta.ok) throw new Error(String(respuesta.status))
      const binario = await respuesta.blob()
      const blob = new Blob([binario], { type: mimeAudio(nombre) || binario.type })
      setUrl(URL.createObjectURL(blob))
      setEstado("inactivo")
    } catch {
      setEstado("error")
    }
  }

  if (url) return <ReproductorLocal src={url} nombre={nombre} autoPlay className={className} />
  if (estado === "cargando") return <Skeleton className={cn("h-10 w-full rounded-full", className)} />
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <button
        type="button"
        onClick={() => void cargar()}
        aria-label={`Escuchar ${nombre}`}
        className="inline-flex h-9 items-center gap-2 rounded-full border bg-card px-3 text-sm font-medium text-primary hover:bg-primary/10 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
      >
        <AudioIcon aria-hidden className="size-5" />
        Escuchar
      </button>
      {estado === "error" && (
        <span role="alert" className="text-xs text-red">
          No se pudo cargar el audio. Inténtalo de nuevo o descárgalo.
        </span>
      )}
    </div>
  )
}

/** `<audio>` nativo (teclado, velocidad y lector de pantalla los da el navegador). */
export function ReproductorLocal({
  src,
  nombre,
  autoPlay,
  className,
}: {
  src: string
  nombre: string
  autoPlay?: boolean
  className?: string
}) {
  return (
    <audio
      src={src}
      controls
      autoPlay={autoPlay}
      preload="metadata"
      aria-label={`Reproducir ${nombre}`}
      className={cn("h-10 w-full min-w-56", className)}
    />
  )
}
