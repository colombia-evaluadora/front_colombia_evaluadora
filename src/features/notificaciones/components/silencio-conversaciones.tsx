import { Badge } from "@/components/ui/badge"
import { ErrorNoticeBanner } from "@/components/notice/error-notice-banner"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { BellIcon, BellSlashIcon } from "@/components/ui/icons"
import { Skeleton } from "@/components/ui/skeleton"
import { useNotify } from "@/components/notice/notice-context"
import { getErrorMessage } from "@/lib/api-client"

import { useSilenciarConversacion } from "@/features/comunicaciones/chat/api/mutations/use-acciones-conversacion"
import { useConversacionesQuery } from "@/features/comunicaciones/chat/api/query/use-conversaciones-query"
import { SILENCIOS, describirSilencio } from "@/features/comunicaciones/chat/lib/silencios"
import { MEDIOS_ALERTA, alertasDe, describirAlertas } from "@/features/comunicaciones/chat/lib/alertas"
import { useAlertasConversacion } from "@/features/comunicaciones/chat/api/mutations/use-ajustes-chat"

/**
 * Panel de configuración de mensajería: lista las conversaciones del chat con su estado de
 * notificaciones y permite silenciarlas (1 hora, fin del día en hora Colombia, hasta reactivar)
 * o activarlas (`NINGUNA`) sin abrir cada conversación. Usa la misma mutación que el menú de la
 * conversación, así la lista del chat queda sincronizada.
 */

export function SilencioConversaciones({ disabled }: { disabled?: boolean }) {
  const { notify } = useNotify()
  const conversaciones = useConversacionesQuery()
  const silenciar = useSilenciarConversacion()
  const cambiarAlertas = useAlertasConversacion()
  const onError = (error: unknown) => notify(getErrorMessage(error), { variant: "error" })
  const lista = (conversaciones.data ?? []).filter((c) => !c.archivada)

  return (
    <section className="flex flex-col gap-3" aria-labelledby="silencio-conversaciones-titulo">
      <div>
        <h2 id="silencio-conversaciones-titulo" className="text-base font-semibold">
          Conversaciones del chat
        </h2>
        <p className="text-sm text-muted-foreground">
          Silencia o activa las notificaciones de cada conversación y elige por qué medios te avisa.
        </p>
      </div>
      {conversaciones.isPending ? (
        <Skeleton className="h-24 w-full" />
      ) : conversaciones.isError ? (
        <ErrorNoticeBanner error={conversaciones.error} />
      ) : lista.length === 0 ? (
        <p className="text-sm text-muted-foreground">No tienes conversaciones.</p>
      ) : (
        <ul className="divide-y rounded-md border">
          {lista.map((c) => {
            const silenciada = Boolean(c.silenciadoHasta)
            const alertas = alertasDe(c)
            return (
              <li key={c.id} className="flex items-center gap-3 px-3 py-2">
                {silenciada ? (
                  <BellSlashIcon className="size-5 shrink-0 text-muted-foreground" aria-hidden />
                ) : (
                  <BellIcon className="size-5 shrink-0 text-primary" aria-hidden />
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{c.nombre}</p>
                  <p className="text-xs text-muted-foreground">
                    {describirSilencio(c.silenciadoHasta)}
                    {!silenciada && ` · ${describirAlertas(alertas)}`}
                  </p>
                </div>
                {!silenciada && (
                  <Badge variant="soft" color="success" className="hidden sm:inline-flex">
                    Activas
                  </Badge>
                )}
                {silenciada && (
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={disabled || silenciar.isPending}
                    onClick={() =>
                      silenciar.mutate(
                        { id: c.id, duracion: "NINGUNA" },
                        { onSuccess: () => notify(`Notificaciones activadas en ${c.nombre}.`), onError },
                      )
                    }
                  >
                    Activar
                  </Button>
                )}
                <DropdownMenu>
                  <DropdownMenuTrigger
                    disabled={disabled || cambiarAlertas.isPending}
                    render={
                      <Button size="sm" variant="ghost" color="neutral" aria-label={`Tipo de alerta de ${c.nombre}`} />
                    }
                  >
                    Alertas
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {MEDIOS_ALERTA.map((medio) => (
                      <DropdownMenuCheckboxItem
                        key={medio.clave}
                        checked={alertas[medio.clave]}
                        disabled={medio.clave === "sonido" && !alertas.campana}
                        onCheckedChange={(v) => {
                          const nuevas = { ...alertas, [medio.clave]: v }
                          cambiarAlertas.mutate(
                            { id: c.id, alertas: nuevas },
                            {
                              onSuccess: () =>
                                notify(`Alertas de ${c.nombre}: ${describirAlertas(nuevas).toLowerCase()}.`),
                              onError,
                            },
                          )
                        }}
                      >
                        {medio.etiqueta}
                      </DropdownMenuCheckboxItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
                <DropdownMenu>
                  <DropdownMenuTrigger
                    disabled={disabled || silenciar.isPending}
                    render={
                      <Button size="sm" variant="outline" color="neutral" aria-label={`Silenciar ${c.nombre}`} />
                    }
                  >
                    {silenciada ? "Cambiar" : "Silenciar"}
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {SILENCIOS.map((s) => (
                      <DropdownMenuItem
                        key={s.valor}
                        onClick={() =>
                          silenciar.mutate(
                            { id: c.id, duracion: s.valor },
                            { onSuccess: () => notify(`${s.aviso.replace(/\.$/, "")} en ${c.nombre}.`), onError },
                          )
                        }
                      >
                        {s.etiqueta}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
