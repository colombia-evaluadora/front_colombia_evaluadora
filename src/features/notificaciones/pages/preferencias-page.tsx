import { useState, type ReactNode } from "react"
import { useNavigate } from "@tanstack/react-router"

import { paths } from "@/config/paths"
import { ConfirmDiscardDialog } from "@/components/confirm-discard-dialog"
import { TableScreen, TableScreenBody, TableScreenHeader, TableScreenTitle } from "@/components/layout/table-screen"
import { NoticeProvider, useNotify } from "@/components/notice/notice-context"
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
  const navigate = useNavigate()
  const onlineOnly = useOnlineOnly("Las preferencias de notificaciones necesitan conexión.")
  const preferencias = usePreferenciasQuery()
  const [dirty, setDirty] = useState(false)
  const [confirmarSalida, setConfirmarSalida] = useState(false)
  const update = useUpdatePreferencias({
    mutationConfig: {
      onSuccess: () => notify("Preferencias guardadas. Los cambios aplican desde ahora."),
      onError: (error) => notify(getErrorMessage(error), { variant: "error" }),
    },
  })
  const volver = () => void navigate({ href: paths.app.notificaciones.getHref() })

  return (
    <TableScreen>
      <TableScreenHeader>
        {/* Figma "Notificaciones/Preferencias": solo el título, con Volver y
            Guardar arriba a la derecha (antes Guardar iba en un pie fijo). */}
        <TableScreenTitle
          action={
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                color="neutral"
                // Con cambios sin guardar, Volver pregunta antes (Figma "Salir sin guardar").
                onClick={() => (dirty ? setConfirmarSalida(true) : volver())}
              >
                <ArrowLeftIcon data-icon="inline-start" className="size-4" />
                Volver
              </Button>
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
            </div>
          }
        >
          Preferencias de notificaciones
        </TableScreenTitle>
      </TableScreenHeader>
      <ConfirmDiscardDialog
        open={confirmarSalida}
        onOpenChange={setConfirmarSalida}
        onConfirm={volver}
        title="¿Salir sin guardar?"
        description="Tienes cambios en tus preferencias que no se han guardado. Si sales ahora, se pierden."
        confirmLabel="Descartar cambios"
        cancelLabel="Seguir editando"
      />
      <TableScreenBody>
        <div className="flex flex-col gap-6 py-4">
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
    </TableScreen>
  )
}
