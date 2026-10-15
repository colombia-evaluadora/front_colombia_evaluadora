import { useEffect, useState, type ReactNode } from "react"

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Skeleton } from "@/components/ui/skeleton"
import { ImagenEmoji } from "@/features/comunicaciones/chat/components/imagen-emoji"
import {
  REACCIONES_RAPIDAS,
  buscarEmojis,
  cargarGruposEmojis,
  type EmojiCatalogo,
  type GrupoEmojis,
} from "@/features/comunicaciones/chat/lib/emojis"

interface SelectorEmojiProps {
  etiqueta: string
  onElegir: (emoji: string) => void
  // Contenido del botón que abre el selector.
  children: ReactNode
  className?: string
  side?: "top" | "bottom"
  align?: "start" | "center" | "end"
  // Muestra arriba las reacciones frecuentes (para reaccionar a mensajes).
  rapidos?: boolean
}

// Popover con buscador y los emojis por categoría; se cierra al elegir uno.
export function SelectorEmoji({
  etiqueta,
  onElegir,
  children,
  className,
  side = "top",
  align = "start",
  rapidos = false,
}: SelectorEmojiProps) {
  const [abierto, setAbierto] = useState(false)

  const elegir = (emoji: string) => {
    onElegir(emoji)
    setAbierto(false)
  }

  return (
    <Popover open={abierto} onOpenChange={setAbierto}>
      <PopoverTrigger aria-label={etiqueta} title={etiqueta} className={className}>
        {children}
      </PopoverTrigger>
      <PopoverContent side={side} align={align} className="w-80 gap-2 p-2">
        {rapidos && (
          <div aria-label="Reacciones frecuentes" className="flex justify-between border-b pb-2">
            {REACCIONES_RAPIDAS.map((emoji) => (
              <BotonEmoji key={emoji} emoji={emoji} grande onClick={() => elegir(emoji)} />
            ))}
          </div>
        )}
        {/* Se monta al abrir: así el catálogo se carga solo cuando hace falta. */}
        {abierto && <Catalogo onElegir={elegir} />}
      </PopoverContent>
    </Popover>
  )
}

function Catalogo({ onElegir }: { onElegir: (emoji: string) => void }) {
  const [grupos, setGrupos] = useState<GrupoEmojis[] | null>(null)
  const [error, setError] = useState(false)
  const [grupoId, setGrupoId] = useState<string | null>(null)
  const [busqueda, setBusqueda] = useState("")

  useEffect(() => {
    let vivo = true
    cargarGruposEmojis().then(
      (g) => vivo && setGrupos(g),
      () => vivo && setError(true),
    )
    return () => {
      vivo = false
    }
  }, [])

  if (error) {
    return <p className="p-3 text-center text-sm text-muted-foreground">No se pudieron cargar los emojis.</p>
  }
  if (!grupos) {
    return (
      <div aria-busy className="space-y-2">
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    )
  }

  const grupo = grupos.find((g) => g.id === grupoId) ?? grupos[0]
  const buscando = busqueda.trim().length > 0
  const resultados = buscando ? buscarEmojis(grupos, busqueda) : grupo.emojis

  return (
    <>
      <input
        type="search"
        autoFocus
        value={busqueda}
        onChange={(e) => setBusqueda(e.target.value)}
        placeholder="Buscar en inglés: smile, book, heart…"
        aria-label="Buscar emoji"
        className="h-9 w-full rounded-md border bg-transparent px-3 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20"
      />
      {!buscando && (
        <div role="tablist" aria-label="Categorías de emojis" className="flex justify-between border-b pb-1">
          {grupos.map((g) => (
            <button
              key={g.id}
              type="button"
              role="tab"
              aria-selected={g.id === grupo.id}
              aria-label={g.nombre}
              title={g.nombre}
              onClick={() => setGrupoId(g.id)}
              className="grid size-8 place-items-center rounded-md hover:bg-muted/60 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none aria-selected:bg-primary/10"
            >
              <ImagenEmoji emoji={g.icono} className="size-5" />
            </button>
          ))}
        </div>
      )}
      <p className="px-1 text-xs font-medium text-muted-foreground">
        {buscando ? `${resultados.length} resultados` : grupo.nombre}
      </p>
      <Rejilla emojis={resultados} onElegir={onElegir} />
    </>
  )
}

function Rejilla({ emojis, onElegir }: { emojis: EmojiCatalogo[]; onElegir: (emoji: string) => void }) {
  if (emojis.length === 0) {
    return <p className="p-4 text-center text-sm text-muted-foreground">Ningún emoji coincide. Prueba con otra palabra.</p>
  }
  return (
    <div className="grid h-56 grid-cols-8 content-start overflow-y-auto">
      {emojis.map((e) => (
        <BotonEmoji key={e.emoji} emoji={e.emoji} titulo={e.nombres[0]} onClick={() => onElegir(e.emoji)} />
      ))}
    </div>
  )
}

function BotonEmoji({
  emoji,
  titulo,
  grande = false,
  onClick,
}: {
  emoji: string
  titulo?: string
  grande?: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      aria-label={titulo ? `${emoji} ${titulo}` : emoji}
      title={titulo?.replaceAll("_", " ")}
      onClick={onClick}
      className={
        grande
          ? "grid size-10 place-items-center rounded-full hover:bg-muted/60 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none motion-safe:hover:scale-110"
          : "grid size-9 place-items-center rounded-md hover:bg-muted/60 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
      }
    >
      <ImagenEmoji emoji={emoji} className={grande ? "size-7 text-2xl" : "size-6 text-xl"} />
    </button>
  )
}
