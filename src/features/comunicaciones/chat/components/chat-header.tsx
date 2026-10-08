import { useState } from "react"

import { Avatar, AvatarFallback, AvatarGroup } from "@/components/ui/avatar"
import { ArrowLeftIcon } from "@/components/ui/icons"
import type { Conversacion, Mensaje } from "@/features/comunicaciones/chat/api/types"
import { ICONO_CATEGORIA } from "@/features/comunicaciones/chat/api/ui-mappings"
import { BellSlashIcon } from "@/components/ui/icons"
import { ConversacionAcciones } from "@/features/comunicaciones/chat/components/conversacion-acciones"
import { formatoMiembros, iniciales } from "@/features/comunicaciones/chat/lib/chat-format"
import { BuscadorMensajes } from "@/features/comunicaciones/chat/components/buscador-mensajes"
import { useChatAccess } from "@/features/comunicaciones/chat/api/use-chat-access"
import { MiembrosDialog } from "@/features/comunicaciones/chat/components/miembros-dialog"

interface ChatHeaderProps {
  conversacion: Conversacion
  mensajes: Mensaje[]
  busqueda: string
  onBusqueda: (valor: string) => void
  onIrAMensaje: (id: number) => void
  onVolver: () => void
}

export function ChatHeader({
  conversacion: c,
  mensajes,
  busqueda,
  onBusqueda,
  onIrAMensaje,
  onVolver,
}: ChatHeaderProps) {
  const Icono = ICONO_CATEGORIA[c.categoria]
  const [miembros, setMiembros] = useState(false)
  const { puedeGestionar } = useChatAccess()

  return (
    <header className="flex h-16 shrink-0 items-center gap-3 border-b px-3 md:px-5">
      <button
        type="button"
        onClick={onVolver}
        aria-label="Volver a conversaciones"
        className="grid size-9 shrink-0 place-items-center rounded-full enabled:hover:bg-muted/60 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none md:hidden"
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

      <BuscadorMensajes mensajes={mensajes} valor={busqueda} onValor={onBusqueda} onIr={onIrAMensaje} />

      <button
        type="button"
        onClick={() => setMiembros(true)}
        disabled={!puedeGestionar}
        aria-label={`Ver los ${formatoMiembros(c.totalMiembros)} miembros`}
        title="Ver miembros"
        className="ml-auto flex shrink-0 items-center gap-2 rounded-full py-1 pr-2 pl-1 hover:bg-muted/60 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none lg:ml-2"
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
      </button>
      {puedeGestionar && <MiembrosDialog conversacion={c} open={miembros} onClose={() => setMiembros(false)} />}

      <ConversacionAcciones conversacion={c} variante="encabezado" activa onSalida={onVolver} />
    </header>
  )
}
