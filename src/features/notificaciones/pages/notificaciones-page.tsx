"use no memo"

import type { ReactNode } from "react"
import { Link } from "@tanstack/react-router"

import { paths } from "@/config/paths"
import {
  TableScreen,
  TableScreenActions,
  TableScreenBody,
  TableScreenHeader,
  TableScreenTitle,
  TableScreenToolbar,
} from "@/components/layout/table-screen"
import { NoticeProvider, useNotify } from "@/components/notice/notice-context"
import { DatosDelBadge } from "@/components/offline/datos-del-badge"
import { OfflineEmptyState } from "@/components/offline/offline-empty-state"
import { OnlineOnlyTooltip } from "@/components/offline/online-only-tooltip"
import { Button } from "@/components/ui/button"
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { ArchiveIcon, ChatReadIcon, ChatUnreadIcon, CheckIcon, GearIcon, InboxIcon } from "@/components/ui/icons"
import { Skeleton } from "@/components/ui/skeleton"
import { Spinner } from "@/components/ui/spinner"
import { Table, TableBody, TableCell, TableHead, TableRow } from "@/components/ui/table"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { ACTIONS_CELL_CLASS, actionsOverlayClass, actionsSpacerCell } from "@/components/table-row-actions"
import { getErrorMessage } from "@/lib/api-client"
import { cn } from "@/lib/utils"
import { TTL_OFFLINE } from "@/lib/offline/query-meta"
import { useConnectivity } from "@/lib/offline/use-connectivity"
import { useOnlineOnly } from "@/lib/offline/use-online-only"

import { useArchivarNotificacion } from "@/features/notificaciones/api/mutations/archivar-notificacion"
import { useMarcarLeida } from "@/features/notificaciones/api/mutations/marcar-leida"
import { useMarcarTodasLeidas } from "@/features/notificaciones/api/mutations/marcar-todas-leidas"
import { useContadorQuery } from "@/features/notificaciones/api/query/use-contador-query"
import { useNotificacionesInfiniteQuery } from "@/features/notificaciones/api/query/use-notificaciones-query"
import type { Notificacion } from "@/features/notificaciones/api/types"
import { NotificacionItem } from "@/features/notificaciones/components/notificacion-item"
import { SearchNotificaciones } from "@/features/notificaciones/components/search/search-notificaciones"
import { useAbrirNotificacion } from "@/features/notificaciones/hooks/use-abrir-notificacion"
import { useNotificacionesFilters } from "@/features/notificaciones/hooks/use-notificaciones-filters"
import { agruparPorDia } from "@/features/notificaciones/lib/agrupar-por-dia"

export function NotificacionesPage() {
  return (
    <NoticeProvider>
      <NotificacionesContent />
    </NoticeProvider>
  )
}

function NotificacionesContent() {
  const { notify } = useNotify()
  const { status } = useConnectivity()
  const onlineOnly = useOnlineOnly()
  const { filters, queryFilters, applyFilters, clearAllFilters, activeFilterCount } = useNotificacionesFilters()
  const lista = useNotificacionesInfiniteQuery(queryFilters)
  const contador = useContadorQuery()
  const abrir = useAbrirNotificacion()

  const onError = (error: Error) => notify(getErrorMessage(error), { variant: "error" })
  const marcarLeida = useMarcarLeida({ mutationConfig: { onError } })
  const archivar = useArchivarNotificacion({
    mutationConfig: { onSuccess: () => notify("Notificación archivada."), onError },
  })
  const marcarTodas = useMarcarTodasLeidas({
    mutationConfig: { onSuccess: () => notify("Todas las notificaciones quedaron leídas."), onError },
  })

  const items = (lista.data?.pages ?? []).flatMap((p) => p.items)
  const grupos = agruparPorDia(items)
  const noLeidas = contador.data ?? 0

  const acciones = (n: Notificacion) => (
    <>
      <AccionFila
        label={n.leida ? "Marcar como no leída" : "Marcar como leída"}
        tooltip={onlineOnly.tooltip}
        disabled={onlineOnly.disabled || marcarLeida.isPending}
        onClick={() => marcarLeida.mutate({ id: n.id, leida: !n.leida })}
      >
        {n.leida ? <ChatUnreadIcon /> : <ChatReadIcon />}
      </AccionFila>
      <AccionFila
        label="Archivar"
        tooltip={onlineOnly.tooltip}
        disabled={onlineOnly.disabled || archivar.isPending}
        onClick={() => archivar.mutate({ id: n.id })}
      >
        <ArchiveIcon />
      </AccionFila>
    </>
  )

  return (
    <TableScreen>
      <TableScreenHeader>
        <TableScreenTitle
          description={noLeidas > 0 ? `${noLeidas} sin leer` : "Estás al día"}
          action={<DatosDelBadge updatedAt={lista.dataUpdatedAt} ttl={TTL_OFFLINE.detalle} />}
        >
          Notificaciones
        </TableScreenTitle>
        <TableScreenToolbar>
          <SearchNotificaciones
            filters={filters}
            applyFilters={applyFilters}
            onClearAll={clearAllFilters}
            activeFilterCount={activeFilterCount}
          />
          <TableScreenActions>
            <OnlineOnlyTooltip tooltip={onlineOnly.tooltip}>
              <Button
                variant="outline"
                color="primary"
                disabled={onlineOnly.disabled || noLeidas === 0 || marcarTodas.isPending}
                onClick={() => marcarTodas.mutate({ categoria: queryFilters.categoria })}
              >
                <CheckIcon data-icon="inline-start" />
                {queryFilters.categoria ? "Marcar estas como leídas" : "Marcar todas como leídas"}
              </Button>
            </OnlineOnlyTooltip>
            <Button
              variant="ghost"
              color="muted"
              nativeButton={false}
              render={<Link to={paths.app.notificacionesPreferencias.getHref()} />}
            >
              <GearIcon data-icon="inline-start" />
              Preferencias
            </Button>
          </TableScreenActions>
        </TableScreenToolbar>
      </TableScreenHeader>
      <TableScreenBody>
        {lista.isError && items.length === 0 && status === "offline" ? (
          <OfflineEmptyState kind="sinDatosGuardados" />
        ) : !lista.isPending && !lista.isError && items.length === 0 ? (
          <Empty className="py-16">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <InboxIcon />
              </EmptyMedia>
              <EmptyTitle>No hay notificaciones</EmptyTitle>
              <EmptyDescription>
                {activeFilterCount > 0 || filters.texto
                  ? "Ninguna notificación coincide con la búsqueda."
                  : "Cuando algo requiera tu atención aparecerá aquí."}
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          // Misma anatomía que `DataTable`: filas `group/row`, esqueletos al
          // cargar, error con "Reintentar" y columna de acciones en overlay al
          // hover (`table-row-actions`). No usa `DataTable` porque la bandeja
          // pagina por cursor ("Cargar más") y agrupa por día (D-2.3).
          <div className="flex flex-col gap-4 py-4">
            <Table containerClassName="border">
              <TableBody>
                {lista.isPending ? (
                  Array.from({ length: 6 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell colSpan={3}>
                        <Skeleton className="h-10 w-full" />
                      </TableCell>
                    </TableRow>
                  ))
                ) : lista.isError && items.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="h-24 text-center">
                      {getErrorMessage(lista.error)}{" "}
                      <Button size="sm" variant="link" onClick={() => void lista.refetch()}>
                        Reintentar
                      </Button>
                    </TableCell>
                  </TableRow>
                ) : (
                  grupos.map((grupo) => (
                    <GrupoDia key={grupo.dia} dia={grupo.dia} etiqueta={grupo.etiqueta}>
                      {grupo.items.map((n) => (
                        <TableRow key={n.id} className={cn("group/row", !n.leida && "bg-blue-22/40")}>
                          <TableCell className="whitespace-normal">
                            <NotificacionItem notificacion={n} onOpen={abrir} />
                          </TableCell>
                          {actionsSpacerCell}
                          <TableCell className={ACTIONS_CELL_CLASS}>
                            <div className={actionsOverlayClass(false, "background")}>{acciones(n)}</div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </GrupoDia>
                  ))
                )}
              </TableBody>
            </Table>
            {lista.hasNextPage && (
              <div className="flex justify-center">
                <Button
                  variant="outline"
                  color="neutral"
                  disabled={lista.isFetchingNextPage || status === "offline"}
                  onClick={() => void lista.fetchNextPage()}
                >
                  {lista.isFetchingNextPage && <Spinner data-icon="inline-start" />}
                  Cargar más
                </Button>
              </div>
            )}
          </div>
        )}
      </TableScreenBody>
    </TableScreen>
  )
}

function AccionFila({
  label,
  tooltip,
  disabled,
  onClick,
  children,
}: {
  label: string
  tooltip: string | null
  disabled: boolean
  onClick: () => void
  children: ReactNode
}) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            variant="ghost"
            size="icon-sm"
            color="muted"
            aria-label={label}
            disabled={disabled}
            onClick={onClick}
          />
        }
      >
        {children}
      </TooltipTrigger>
      <TooltipContent>{tooltip ?? label}</TooltipContent>
    </Tooltip>
  )
}

/** Encabezado de día con la apariencia del `TableHeader` del sistema. */
function GrupoDia({ dia, etiqueta, children }: { dia: string; etiqueta: string; children: ReactNode }) {
  return (
    <>
      <TableRow className="bg-muted/50 hover:bg-muted/50">
        <TableHead id={`notif-dia-${dia}`} colSpan={3} scope="colgroup" className="h-9 text-foreground">
          {etiqueta}
        </TableHead>
      </TableRow>
      {children}
    </>
  )
}
