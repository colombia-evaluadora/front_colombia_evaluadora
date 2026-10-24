import { useState, type ReactNode } from "react"
import { Link } from "@tanstack/react-router"

import { paths } from "@/config/paths"
import {
  TableScreen,
  TableScreenBody,
  TableScreenFooter,
  TableScreenHeader,
  TableScreenTitle,
} from "@/components/layout/table-screen"
import { NoticeOutlet, NoticeProvider, useNotify } from "@/components/notice/notice-context"
import { OnlineOnlyTooltip } from "@/components/offline/online-only-tooltip"
import { Button } from "@/components/ui/button"
import { ArrowLeftIcon } from "@/components/ui/icons"
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty"
import { Skeleton } from "@/components/ui/skeleton"
import { Spinner } from "@/components/ui/spinner"
import { getErrorMessage } from "@/lib/api-client"
import { useOnlineOnly } from "@/lib/offline/use-online-only"

import { useUpdatePreferencias } from "@/features/notificaciones/api/mutations/update-preferencias"
import { usePreferenciasQuery } from "@/features/notificaciones/api/query/use-preferencias-query"
import { FormPreferencias, PREFERENCIAS_FORM_ID } from "@/features/notificaciones/components/form-preferencias"
import { PushToggleSlot } from "@/features/notificaciones/components/push-toggle-slot"
import { SilencioConversaciones } from "@/features/notificaciones/components/silencio-conversaciones"
import { AjustesChatSeccion } from "@/features/notificaciones/components/ajustes-chat"

/**
 * `/app/notificaciones/preferencias`. `pushToggle` es el punto de montaje del
 * `<PushToggle/>` de `features/notificaciones/push` (ver `PushToggleSlot`).
 */
export function PreferenciasNotificacionesPage({ pushToggle }: { pushToggle?: ReactNode } = {}) {
  return (
    <NoticeProvider>
      <PreferenciasContent pushToggle={pushToggle} />
    </NoticeProvider>
  )
}

function PreferenciasContent({ pushToggle }: { pushToggle?: ReactNode }) {
  const { notify } = useNotify()
  const onlineOnly = useOnlineOnly("Las preferencias de notificaciones necesitan conexión.")
  const preferencias = usePreferenciasQuery()
  const [dirty, setDirty] = useState(false)
  const update = useUpdatePreferencias({
    mutationConfig: {
      onSuccess: () => notify("Preferencias de notificaciones actualizadas."),
      onError: (error) => notify(getErrorMessage(error), { variant: "error" }),
    },
  })

  return (
    <TableScreen>
      <TableScreenHeader>
        <TableScreenTitle
          description="Elige por dónde quieres enterarte de cada tipo de notificación."
          action={
            <Button
              variant="ghost"
              color="muted"
              nativeButton={false}
              render={<Link to={paths.app.notificaciones.getHref()} />}
            >
              <ArrowLeftIcon data-icon="inline-start" />
              Volver
            </Button>
          }
        >
          Preferencias de notificaciones
        </TableScreenTitle>
      </TableScreenHeader>
      <TableScreenBody className="rounded-b-none border-b-0">
        <div className="flex flex-col gap-6 py-4">
          <NoticeOutlet />
          {preferencias.isPending ? (
            <div className="flex flex-col gap-3">
              <Skeleton className="h-6 w-72" />
              <Skeleton className="h-64 w-full" />
            </div>
          ) : preferencias.isError ? (
            <Empty className="py-16">
              <EmptyHeader>
                <EmptyTitle>No se pudieron cargar las preferencias</EmptyTitle>
                <EmptyDescription>{getErrorMessage(preferencias.error)}</EmptyDescription>
              </EmptyHeader>
              <Button size="sm" variant="link" onClick={() => void preferencias.refetch()}>
                Reintentar
              </Button>
            </Empty>
          ) : (
            <FormPreferencias
              // Re-monta al recargar del servidor: `defaultValues` se leen una vez.
              key={preferencias.dataUpdatedAt}
              preferencias={preferencias.data}
              disabled={onlineOnly.disabled || update.isPending}
              onDirtyChange={setDirty}
              onSubmit={(values) => update.mutate(values)}
            />
          )}
          <PushToggleSlot>{pushToggle}</PushToggleSlot>
          <AjustesChatSeccion disabled={onlineOnly.disabled} />
          <SilencioConversaciones disabled={onlineOnly.disabled} />
        </div>
      </TableScreenBody>
      <TableScreenFooter>
        <span className="text-xs text-muted-foreground">
          {dirty ? "Tienes cambios sin guardar." : "La bandeja de la aplicación siempre está activa."}
        </span>
        <OnlineOnlyTooltip tooltip={onlineOnly.tooltip}>
          <Button
            type="submit"
            form={PREFERENCIAS_FORM_ID}
            disabled={onlineOnly.disabled || update.isPending || !dirty || !preferencias.data}
          >
            {update.isPending && <Spinner data-icon="inline-start" />}
            Guardar
          </Button>
        </OnlineOnlyTooltip>
      </TableScreenFooter>
    </TableScreen>
  )
}
