import { useEffect, useState } from "react"
import { format } from "date-fns"
import { es } from "date-fns/locale"

import { Button } from "@/components/ui/button"
import { TrashIcon } from "@/components/ui/icons"
import {
  useDeletePushSuscripcion,
  usePushSuscripcionesQuery,
} from "@/features/notificaciones/push/api/use-push-subscriptions"
import { getCurrentSubscription } from "@/features/notificaciones/push/lib/push-client"
import { getErrorMessage } from "@/lib/api-client"

function formatFecha(value: string | null) {
  if (!value) return "—"
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? "—" : format(date, "d MMM yyyy, HH:mm", { locale: es })
}

/** Dispositivos con push activo del usuario (spec: "aparece en su lista"). */
export function PushDevicesList() {
  const query = usePushSuscripcionesQuery()
  const remove = useDeletePushSuscripcion()
  const [currentEndpoint, setCurrentEndpoint] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    void getCurrentSubscription().then((s) => {
      if (alive) setCurrentEndpoint(s?.endpoint ?? null)
    })
    return () => {
      alive = false
    }
  }, [query.data])

  if (query.isPending) return null
  if (query.isError) {
    return <p className="text-sm text-muted-foreground">No se pudo cargar la lista de dispositivos.</p>
  }
  if (query.data.length === 0) return null

  return (
    <div className="flex flex-col gap-2">
      <h4 className="text-sm font-medium">Dispositivos con notificaciones activas</h4>
      <ul className="flex flex-col divide-y rounded-md border">
        {query.data.map((device) => {
          const isThis = device.endpoint === currentEndpoint
          return (
            <li key={device.id} className="flex items-center justify-between gap-3 px-3 py-2">
              <div className="flex min-w-0 flex-col">
                <span className="text-sm">
                  {device.plataforma}
                  {isThis && <span className="text-muted-foreground"> · este dispositivo</span>}
                </span>
                <span className="truncate text-xs text-muted-foreground">
                  Activado {formatFecha(device.creadaEn)} · último uso{" "}
                  {formatFecha(device.ultimoUso)}
                </span>
              </div>
              {!isThis && (
                <Button
                  variant="ghost"
                  color="destructive"
                  size="icon"
                  aria-label={`Quitar ${device.plataforma}`}
                  disabled={remove.isPending}
                  onClick={() => remove.mutate(device.id)}
                >
                  <TrashIcon />
                </Button>
              )}
            </li>
          )
        })}
      </ul>
      {remove.isError && (
        <p role="alert" className="text-sm text-red">
          {getErrorMessage(remove.error)}
        </p>
      )}
    </div>
  )
}
