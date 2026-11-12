import { useEffect, useState } from "react"
import { ErrorNoticeBanner } from "@/components/notice/error-notice-banner"
import { useNotificacionesTiempoReal } from "@/features/notificaciones/hooks/use-notificaciones-tiempo-real"
import { useQueryClient } from "@tanstack/react-query"
import { Link, useNavigate } from "@tanstack/react-router"

import { paths } from "@/config/paths"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { BellIcon, ChatCircleTextIcon, CloudOffIcon, GearIcon, InboxIcon } from "@/components/ui/icons"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Spinner } from "@/components/ui/spinner"
import { OnlineOnlyTooltip } from "@/components/offline/online-only-tooltip"
import { getErrorMessage } from "@/lib/api-client"
import { cn } from "@/lib/utils"
import { useConnectivity } from "@/lib/offline/use-connectivity"
import { useOnlineOnly } from "@/lib/offline/use-online-only"
import { useMarcarTodasLeidas } from "@/features/notificaciones/api/mutations/marcar-todas-leidas"
import { useContadorQuery } from "@/features/notificaciones/api/query/use-contador-query"
import { useNotificacionesInfiniteQuery } from "@/features/notificaciones/api/query/use-notificaciones-query"
import { NotificacionItem } from "@/features/notificaciones/components/notificacion-item"
import { useAbrirNotificacion } from "@/features/notificaciones/hooks/use-abrir-notificacion"
import { formatContador, safeDeepLink } from "@/features/notificaciones/lib/deep-link"
import { onSwPushMessage, SW_PUSH_MESSAGES } from "@/features/notificaciones/push/lib/push-client"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { MensajesCampana } from "@/features/notificaciones/components/mensajes-campana"
import { useConversacionesCampana, useTieneChat } from "@/features/notificaciones/hooks/use-mensajes-campana"
import { noLeidosCampana } from "@/features/notificaciones/lib/mensajes-campana"

/** La campana muestra las 10 más recientes (spec "Campana y página"). */
const RECIENTES = 10

/** Segmento de las pestañas Notificaciones / Mensajes (Figma "Segmentado"). */
const SEGMENTO =
  "h-auto flex-1 rounded-full px-3 py-1.5 text-sm font-normal tracking-normal normal-case text-muted-foreground after:hidden data-active:bg-card data-active:font-medium data-active:text-foreground data-active:shadow-[0_1px_4px_0_rgba(0,0,0,0.1)]"

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
  // Pestaña "Mensajes" (HU "acceder a Mensajes desde la campana"): solo con el chat en el menú.
  const tieneChat = useTieneChat()
  const [pestana, setPestana] = useState<"notificaciones" | "mensajes">("notificaciones")
  const verMensajes = tieneChat && pestana === "mensajes"
  const mensajes = useConversacionesCampana(open && tieneChat)
  const mensajesSinLeer = noLeidosCampana(mensajes.data)
  const irA = (href: string) => {
    setOpen(false)
    void navigate({ href: safeDeepLink(href) })
  }

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
        {/* Figma "Layout/Cabecera" › btn_top: ícono de 22px (el default de
            `Button` es 14px y se veía muy chico). */}
        <BellIcon className="size-5.5" />
        {noLeidas > 0 && (
          <Badge
            aria-hidden
            variant="fill"
            color="destructive"
            className="absolute -top-1.5 -right-1.5 h-4.5 min-w-4.5 rounded-full px-1 tracking-normal tabular-nums"
          >
            {etiqueta}
          </Badge>
        )}
      </PopoverTrigger>
      {/* Anuncio accesible de cambios del contador (spec "Anuncio accesible"). */}
      <span className="sr-only" aria-live="polite">
        {noLeidas > 0 ? `${etiqueta} notificaciones sin leer` : ""}
      </span>
      {/* Figma "Notificaciones/Panel de la campana": 392px, encabezado sin línea,
          pestañas segmentadas (pastilla) y entradas de 12px separadas por líneas. */}
      <PopoverContent align="end" className="w-98 max-w-[calc(100vw-2rem)] gap-0 p-0">
        {/* `px-3`: el botón `link` no tiene padding (`!p-0`), así que el margen
            derecho de Figma (12px) lo pone el contenedor. */}
        <div className="flex min-w-0 items-center gap-2 px-3 pt-3 pb-2">
          <h2 className="text-sm font-medium">Notificaciones</h2>
          {noLeidas > 0 && (
            <Badge
              variant="soft"
              color="primary"
              className="rounded-full border-primary-stroke font-medium tracking-normal text-foreground"
            >
              <span aria-hidden className="size-1.5 rounded-full bg-primary" />
              {etiqueta} sin leer
            </Badge>
          )}
          <span className="flex-1" />
          <OnlineOnlyTooltip tooltip={onlineOnly.tooltip}>
            <Button
              variant="link"
              size="xs"
              className="shrink-0 text-xs font-medium no-underline hover:underline"
              disabled={onlineOnly.disabled || noLeidas === 0 || marcarTodas.isPending}
              onClick={() => marcarTodas.mutate({})}
            >
              Marcar todas como leídas
            </Button>
          </OnlineOnlyTooltip>
        </div>

        {status === "offline" && (
          <p role="status" className="flex items-center gap-2 border-b bg-yellow-22 px-4 py-2 text-xs text-foreground">
            <CloudOffIcon aria-hidden className="size-4 text-yellow" />
            Sin conexión: se muestran las notificaciones guardadas.
          </p>
        )}
        <ErrorNoticeBanner error={marcarTodas.isError ? marcarTodas.error : null} className="mx-4 my-2" />

        {tieneChat && (
          <Tabs
            value={pestana}
            onValueChange={(v) => setPestana(v === "mensajes" ? "mensajes" : "notificaciones")}
            className="px-3 pb-3"
          >
            {/* Segmentado de Figma: pastilla gris con la pestaña activa en blanco
                y sombra; sin el subrayado ni las versalitas de `Tabs`. */}
            <TabsList className="gap-1 rounded-full border-0 bg-sidebar p-1 group-data-horizontal/tabs:h-auto">
              <TabsTrigger value="notificaciones" className={SEGMENTO}>
                Notificaciones{noLeidas > 0 && ` (${etiqueta})`}
              </TabsTrigger>
              <TabsTrigger value="mensajes" className={SEGMENTO}>
                Mensajes
                {mensajesSinLeer > 0 && (
                  <>
                    <span className="sr-only">, sin leer:</span> ({formatContador(mensajesSinLeer)})
                  </>
                )}
              </TabsTrigger>
            </TabsList>
          </Tabs>
        )}
        <div className="h-px bg-border" />

        {verMensajes ? (
          <div className="max-h-96 overflow-y-auto">
            <MensajesCampana query={mensajes} onAbrir={irA} />
          </div>
        ) : (
        <div className="max-h-96 overflow-y-auto">
          {lista.isPending ? (
            <div className="grid place-items-center py-8">
              <Spinner />
            </div>
          ) : lista.isError && recientes.length === 0 ? (
            <Empty className="py-8">
              <EmptyHeader>
                <EmptyTitle>No se pudieron cargar las notificaciones</EmptyTitle>
                <EmptyDescription>{getErrorMessage(lista.error)}</EmptyDescription>
              </EmptyHeader>
              <Button size="sm" variant="link" onClick={() => void lista.refetch()}>
                Reintentar
              </Button>
            </Empty>
          ) : recientes.length === 0 ? (
            <Empty className="py-8">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <InboxIcon />
                </EmptyMedia>
                <EmptyTitle>No tiene notificaciones</EmptyTitle>
              </EmptyHeader>
            </Empty>
          ) : (
            <ul className="divide-y">
              {recientes.map((n) => (
                // Mismo patrón que la bandeja: sin leer en blanco, leídas en gris `muted-22`.
                <li key={n.id} className={cn("hover:bg-muted/50", n.leida && "bg-muted-22")}>
                  <NotificacionItem
                    compact
                    notificacion={n}
                    onAccion={() => setOpen(false)}
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
        )}

        {/* `px-1`: al hacer hover el fondo de los botones no queda a ras del borde. */}
        <div className="flex items-center justify-between border-t px-1 py-1">
          {verMensajes ? (
            <Button
              variant="ghost"
              size="xs"
              className="text-xs font-medium text-primary"
              onClick={() => irA(paths.app.comunicacionesChat.getHref())}
            >
              <ChatCircleTextIcon data-icon="inline-start" className="size-4" />
              Ir al chat
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="xs"
              className="text-xs font-medium text-primary"
              nativeButton={false}
              render={<Link to={paths.app.notificaciones.getHref()} onClick={() => setOpen(false)} />}
            >
              Ver todas
            </Button>
          )}
          <Button
            variant="ghost"
            size="xs"
            color="neutral"
            className="text-xs font-medium"
            nativeButton={false}
            render={<Link to={paths.app.notificacionesPreferencias.getHref()} onClick={() => setOpen(false)} />}
          >
            <GearIcon data-icon="inline-start" className="size-4" />
            Preferencias
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}
