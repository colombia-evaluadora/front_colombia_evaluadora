import { useEffect, useState } from "react"
import { useNotificacionesTiempoReal } from "@/features/notificaciones/hooks/use-notificaciones-tiempo-real"
import { useQueryClient } from "@tanstack/react-query"
import { Link, useNavigate } from "@tanstack/react-router"

import { paths } from "@/config/paths"
import { Button } from "@/components/ui/button"
import { BellIcon, CloudOffIcon, GearIcon } from "@/components/ui/icons"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Spinner } from "@/components/ui/spinner"
import { OnlineOnlyTooltip } from "@/components/offline/online-only-tooltip"
import { getErrorMessage } from "@/lib/api-client"
import { useConnectivity } from "@/lib/offline/use-connectivity"
import { useOnlineOnly } from "@/lib/offline/use-online-only"
import { useMarcarTodasLeidas } from "@/features/notificaciones/api/mutations/marcar-todas-leidas"
import { useContadorQuery } from "@/features/notificaciones/api/query/use-contador-query"
import { useNotificacionesInfiniteQuery } from "@/features/notificaciones/api/query/use-notificaciones-query"
import { NotificacionItem } from "@/features/notificaciones/components/notificacion-item"
import { useAbrirNotificacion } from "@/features/notificaciones/hooks/use-abrir-notificacion"
import { formatContador, safeDeepLink } from "@/features/notificaciones/lib/deep-link"
import { onSwPushMessage, SW_PUSH_MESSAGES } from "@/features/notificaciones/push/lib/push-client"

/** La campana muestra las 10 más recientes (spec "Campana y página"). */
const RECIENTES = 10

/**
 * Campana global del header (D-2.6). Comparte la cache de la lista sin filtros
 * con `/app/notificaciones`; sin conexión muestra lo cacheado y deshabilita
 * "Marcar todas como leídas" (D-2.7).
 */
export function CampanaNotificaciones() {
  // La campana vive en el layout de /app: suscribe la bandeja al tópico personal.
  useNotificacionesTiempoReal()
  const [open, setOpen] = useState(false)
  const queryClient = useQueryClient()
  const navigate = useNavigate()

  // Mensajes del SW de push: un push recibido refresca bandeja y contador; un
  // clic en la notificación del sistema además lleva a su deep link.
  useEffect(
    () =>
      onSwPushMessage((message) => {
        if (message.type !== SW_PUSH_MESSAGES.received && message.type !== SW_PUSH_MESSAGES.clicked) return
        void queryClient.invalidateQueries({ queryKey: ["notificaciones"] })
        if (message.type === SW_PUSH_MESSAGES.clicked && message.url) {
          void navigate({ href: safeDeepLink(message.url) })
        }
      }),
    [queryClient, navigate],
  )
  const { status } = useConnectivity()
  const onlineOnly = useOnlineOnly()
  const contador = useContadorQuery()
  // Sin red la bandeja de la campana solo se pide al abrirla: cerrada no es
  // parte de la pantalla, y el banner offline no debe decir que falta.
  const lista = useNotificacionesInfiniteQuery({}, { enabled: open || status !== "offline" })
  const abrir = useAbrirNotificacion()
  const marcarTodas = useMarcarTodasLeidas()

  const noLeidas = contador.data ?? 0
  const recientes = (lista.data?.pages ?? []).flatMap((p) => p.items).slice(0, RECIENTES)
  const etiqueta = formatContador(noLeidas)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            variant="outline"
            size="icon"
            color="muted"
            aria-label={noLeidas > 0 ? `Notificaciones: ${etiqueta} sin leer` : "Notificaciones"}
            className="relative bg-background"
          />
        }
      >
        <BellIcon />
        {noLeidas > 0 && (
          <span
            aria-hidden
            className="absolute -top-1.5 -right-1.5 grid h-4.5 min-w-4.5 place-items-center rounded-full bg-red px-1 text-[10px] font-semibold text-white tabular-nums"
          >
            {etiqueta}
          </span>
        )}
      </PopoverTrigger>
      {/* Anuncio accesible de cambios del contador (spec "Anuncio accesible"). */}
      <span className="sr-only" aria-live="polite">
        {noLeidas > 0 ? `${etiqueta} notificaciones sin leer` : ""}
      </span>
      <PopoverContent align="end" className="w-96 max-w-[calc(100vw-2rem)] gap-0 p-0">
        <div className="flex items-center gap-2 border-b px-4 py-2">
          <h2 className="flex-1 text-sm font-medium">Notificaciones</h2>
          <OnlineOnlyTooltip tooltip={onlineOnly.tooltip}>
            <Button
              variant="link"
              size="sm"
              disabled={onlineOnly.disabled || noLeidas === 0 || marcarTodas.isPending}
              onClick={() => marcarTodas.mutate({})}
            >
              Marcar todas como leídas
            </Button>
          </OnlineOnlyTooltip>
        </div>

        {status === "offline" && (
          <p role="status" className="flex items-center gap-2 bg-yellow-22 px-4 py-2 text-xs">
            <CloudOffIcon aria-hidden className="size-4" />
            Sin conexión: se muestran las notificaciones guardadas.
          </p>
        )}
        {marcarTodas.isError && (
          <p role="alert" className="px-4 py-2 text-xs text-red">
            {getErrorMessage(marcarTodas.error)}
          </p>
        )}

        <div className="max-h-96 overflow-y-auto">
          {lista.isPending ? (
            <div className="grid place-items-center py-8">
              <Spinner />
            </div>
          ) : lista.isError && recientes.length === 0 ? (
            <p className="px-4 py-6 text-sm text-muted-foreground">No se pudieron cargar las notificaciones.</p>
          ) : recientes.length === 0 ? (
            <p className="px-4 py-6 text-sm text-muted-foreground">No tienes notificaciones.</p>
          ) : (
            <ul>
              {recientes.map((n) => (
                <li key={n.id}>
                  <NotificacionItem
                    compact
                    notificacion={n}
                    onOpen={(item) => {
                      setOpen(false)
                      abrir(item)
                    }}
                  />
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="flex items-center justify-between border-t px-2 py-1">
          <Button
            variant="ghost"
            size="sm"
            nativeButton={false}
            render={<Link to={paths.app.notificaciones.getHref()} onClick={() => setOpen(false)} />}
          >
            Ver todas
          </Button>
          <Button
            variant="ghost"
            size="sm"
            color="muted"
            nativeButton={false}
            render={<Link to={paths.app.notificacionesPreferencias.getHref()} onClick={() => setOpen(false)} />}
          >
            <GearIcon data-icon="inline-start" />
            Preferencias
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}
