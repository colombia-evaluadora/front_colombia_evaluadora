import { useState } from "react"

import { Avatar, AvatarBadge, AvatarFallback, AvatarGroup } from "@/components/ui/avatar"
import { ArrowLeftIcon } from "@/components/ui/icons"
import type { Conversacion, Mensaje } from "@/features/comunicaciones/chat/api/types"
import { ICONO_CATEGORIA } from "@/features/comunicaciones/chat/api/ui-mappings"
import { BellSlashIcon } from "@/components/ui/icons"
import { ConversacionAcciones } from "@/features/comunicaciones/chat/components/conversacion-acciones"
import { formatoMiembros, iniciales } from "@/features/comunicaciones/chat/lib/chat-format"
import { BuscadorMensajes } from "@/features/comunicaciones/chat/components/buscador-mensajes"
import { useMiembrosQuery } from "@/features/comunicaciones/chat/api/query/use-miembros-query"
import { ETIQUETA_PERFIL } from "@/features/comunicaciones/chat/lib/estado-mensaje"
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
  const directo = c.tipo === "DIRECTO"

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

      {directo ? (
        <EncabezadoDirecto conversacion={c} />
      ) : (
        <h2 className="flex min-w-0 flex-1 items-center gap-2 text-lg font-semibold">
          <Icono aria-hidden className="size-5 shrink-0" />
          <span className="truncate">{c.nombre}</span>
          {c.silenciadoHasta && (
            <BellSlashIcon aria-label="Silenciado" className="size-4 shrink-0 text-muted-foreground" />
          )}
        </h2>
      )}

      <BuscadorMensajes mensajes={mensajes} valor={busqueda} onValor={onBusqueda} onIr={onIrAMensaje} />

      {/* En un mensaje directo no hay contador de miembros (diseño 4428:64360). */}
      {!directo && (
      <button
        type="button"
        onClick={() => setMiembros(true)}
        aria-label={`Ver los ${formatoMiembros(c.totalMiembros)} miembros`}
        title="Ver miembros"
        className="flex shrink-0 items-center gap-2 rounded-full py-1 pr-2 pl-1 hover:bg-muted/60 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
      >
        {/* Fondo opaco (bg-card) bajo el tono suave: con el relleno translúcido las iniciales del
            avatar de atrás se transparentaban y se leía "DRMJP". */}
        <AvatarGroup className="max-sm:hidden">
          {c.miembrosDestacados.slice(0, 3).map((nombre) => (
            <Avatar key={nombre} className="bg-card">
              <AvatarFallback className="bg-navy-22 text-[10px] leading-none font-semibold text-navy">
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
      )}
      {!directo && <MiembrosDialog conversacion={c} open={miembros} onClose={() => setMiembros(false)} />}

      <ConversacionAcciones conversacion={c} variante="encabezado" activa onSalida={onVolver} />
    </header>
  )
}

// Mensaje directo: avatar, nombre y perfil de la otra persona (diseño 4428:64360), sin contador.
function EncabezadoDirecto({ conversacion: c }: { conversacion: Conversacion }) {
  // En un DM comms-service devuelve solo a la otra persona.
  const otro = useMiembrosQuery(c.esBot ? undefined : c.id).data?.[0]
  const subtitulo = c.esBot ? "Asistente virtual" : otro?.perfil ? ETIQUETA_PERFIL[otro.perfil] : null
  return (
    <div className="flex min-w-0 flex-1 items-center gap-3">
      <Avatar size="lg">
        <AvatarFallback className="bg-navy-22 text-xs font-semibold text-navy">{iniciales(c.nombre)}</AvatarFallback>
        {otro?.enLinea && (
          <AvatarBadge className="bg-green">
            <span className="sr-only">En línea</span>
          </AvatarBadge>
        )}
      </Avatar>
      <div className="min-w-0 leading-tight">
        <h2 className="flex items-center gap-2 text-lg leading-tight font-semibold">
          <span className="truncate">{c.nombre}</span>
          {c.silenciadoHasta && (
            <BellSlashIcon aria-label="Silenciado" className="size-4 shrink-0 text-muted-foreground" />
          )}
        </h2>
        {subtitulo && <p className="truncate text-sm text-muted-foreground">{subtitulo}</p>}
      </div>
    </div>
  )
}
