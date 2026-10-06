import { Avatar, AvatarFallback, AvatarGroup } from "@/components/ui/avatar"
import { ArrowLeftIcon, MagnifyingGlassIcon, XIcon } from "@/components/ui/icons"
import type { Conversacion } from "@/features/comunicaciones/chat/api/types"
import { ICONO_CATEGORIA } from "@/features/comunicaciones/chat/api/ui-mappings"
import { BellSlashIcon } from "@/components/ui/icons"
import { ConversacionAcciones } from "@/features/comunicaciones/chat/components/conversacion-acciones"
import { formatoMiembros, iniciales } from "@/features/comunicaciones/chat/lib/chat-format"

interface ChatHeaderProps {
  conversacion: Conversacion
  busqueda: string
  onBusqueda: (valor: string) => void
  onVolver: () => void
}

export function ChatHeader({ conversacion: c, busqueda, onBusqueda, onVolver }: ChatHeaderProps) {
  const Icono = ICONO_CATEGORIA[c.categoria]

  return (
    <header className="flex h-16 shrink-0 items-center gap-3 border-b px-3 md:px-5">
      <button
        type="button"
        onClick={onVolver}
        aria-label="Volver a conversaciones"
        className="grid size-9 shrink-0 place-items-center rounded-full hover:bg-muted/60 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none md:hidden"
      >
        <ArrowLeftIcon className="size-5" />
      </button>

      <h2 className="flex min-w-0 items-center gap-2 text-lg font-semibold">
        <Icono aria-hidden className="size-5 shrink-0" />
        <span className="truncate">{c.nombre}</span>
        {c.silenciadoHasta && (
          <BellSlashIcon aria-label="Silenciado" className="size-4 shrink-0 text-muted-foreground" />
        )}
      </h2>

      <label className="ml-auto hidden h-10 w-full max-w-xs items-center gap-2 rounded-lg border px-3 focus-within:ring-2 focus-within:ring-primary lg:flex">
        <MagnifyingGlassIcon aria-hidden className="size-5 shrink-0 text-muted-foreground" />
        <span className="sr-only">Buscar en la conversación</span>
        <input
          value={busqueda}
          onChange={(e) => onBusqueda(e.target.value)}
          onKeyDown={(e) => e.key === "Escape" && onBusqueda("")}
          placeholder="Buscar"
          className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        />
        {busqueda && (
          <button type="button" aria-label="Limpiar búsqueda" onClick={() => onBusqueda("")}>
            <XIcon className="size-4 text-muted-foreground" />
          </button>
        )}
      </label>

      <div
        className="ml-auto flex shrink-0 items-center gap-2 lg:ml-2"
        title={`${formatoMiembros(c.totalMiembros)} miembros`}
      >
        <AvatarGroup className="max-sm:hidden">
          {c.miembrosDestacados.slice(0, 3).map((nombre) => (
            <Avatar key={nombre} size="sm">
              <AvatarFallback className="bg-navy-22 text-[9px] font-semibold text-navy">
                {iniciales(nombre)}
              </AvatarFallback>
            </Avatar>
          ))}
        </AvatarGroup>
        <span className="text-sm font-medium tabular-nums">
          {formatoMiembros(c.totalMiembros)}
          <span className="sr-only"> miembros</span>
        </span>
      </div>

      <ConversacionAcciones conversacion={c} variante="encabezado" activa onSalida={onVolver} />
    </header>
  )
}
