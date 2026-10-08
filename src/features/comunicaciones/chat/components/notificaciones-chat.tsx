import { useState } from "react"
import { useNavigate } from "@tanstack/react-router"

import { Button } from "@/components/ui/button"
import { BellIcon } from "@/components/ui/icons"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { useNotificacionesQuery } from "@/features/comunicaciones/chat/api/query/use-notificaciones-query"
import { ICONO_CATEGORIA } from "@/features/comunicaciones/chat/api/ui-mappings"
import { horaMensaje } from "@/features/comunicaciones/chat/lib/chat-format"

// Campana del encabezado: avisa de las elecciones abiertas y lleva al canal para votar.
export function NotificacionesChat() {
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()
  const { data: avisos = [] } = useNotificacionesQuery()
  const pendientes = avisos.length > 0

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            variant="outline"
            size="icon"
            color="muted"
            aria-label={pendientes ? `Notificaciones: ${avisos.length} sin leer` : "Notificaciones"}
            className="relative bg-background"
          />
        }
      >
        <BellIcon />
        {pendientes && (
          <span
            aria-hidden
            className="absolute right-1.5 bottom-1.5 size-2.5 rounded-full border-2 border-background bg-orange"
          />
        )}
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 gap-0 p-0">
        <h2 className="px-4 pt-3 pb-2 text-sm text-muted-foreground">Mensajes directos</h2>
        {avisos.length === 0 ? (
          <p className="px-4 pb-4 text-sm text-muted-foreground">No tienes notificaciones nuevas.</p>
        ) : (
          <ul className="pb-2">
            {avisos.map((a) => {
              const Icono = ICONO_CATEGORIA[a.categoria]
              return (
                <li key={a.id}>
                  <button
                    type="button"
                    onClick={() => {
                      setOpen(false)
                      void navigate({ to: "/app/comunicaciones/chat", search: { canal: a.conversacionId } })
                    }}
                    className="flex w-full items-center gap-3 px-4 py-2 text-left hover:bg-muted/50 focus-visible:bg-muted/50 focus-visible:outline-none"
                  >
                    <span className="grid size-10 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground">
                      <Icono aria-hidden className="size-5" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-baseline gap-2">
                        <span className="min-w-0 flex-1 truncate font-medium">{a.titulo}</span>
                        <time dateTime={a.fecha} className="shrink-0 text-xs text-muted-foreground">
                          {horaMensaje(a.fecha)}
                        </time>
                      </span>
                      <span className="flex items-center gap-2">
                        <span className="min-w-0 flex-1 truncate text-sm text-muted-foreground">{a.texto}</span>
                        <span className="grid h-5 min-w-5 place-items-center rounded-full bg-orange px-1.5 text-xs font-medium text-white tabular-nums">
                          {a.pendientes}
                        </span>
                      </span>
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </PopoverContent>
    </Popover>
  )
}
