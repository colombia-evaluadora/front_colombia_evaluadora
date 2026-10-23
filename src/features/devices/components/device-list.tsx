import { cerrarFrase } from "@/lib/frase"
import { format } from "date-fns"
import { es } from "date-fns/locale"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DEVICE_STATE_LABEL,
  deviceState,
  REVOKE_REASON_LABEL,
  type Device,
  type DeviceState,
} from "@/features/devices/api/types/device"

const STATE_COLOR: Record<DeviceState, "success" | "warning" | "muted" | "destructive"> = {
  activo: "success",
  vencido: "muted",
  revocado: "muted",
  "borrado-pendiente": "warning",
  borrado: "destructive",
}

function fecha(value: string | null): string {
  if (!value) return "—"
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? "—" : format(date, "d 'de' MMM yyyy, h:mm a", { locale: es })
}

/** Lista de equipos con su estado y la acción de revocar (solo a los activos). */
export function DeviceList({
  devices,
  onRevoke,
  onForget,
  emptyText,
}: {
  devices: Device[]
  onRevoke: (device: Device) => void
  onForget?: (device: Device) => void
  emptyText: string
}) {
  if (devices.length === 0) return <p className="text-sm text-muted-foreground">{emptyText}</p>

  return (
    <ul className="flex flex-col gap-2" aria-label="Equipos registrados">
      {devices.map((device) => {
        const state = deviceState(device)
        return (
          <li
            key={device.id}
            data-slot="device-row"
            className="flex flex-col gap-2 rounded-md border px-3 py-3 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="flex min-w-0 flex-col gap-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="truncate font-medium">{device.label || "Equipo sin nombre"}</span>
                {device.current && (
                  <Badge variant="soft" color="info">
                    Este equipo
                  </Badge>
                )}
                <Badge variant="soft" color={STATE_COLOR[state]}>
                  {DEVICE_STATE_LABEL[state]}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                Registrado: {fecha(device.createdAt)} · Último uso: {fecha(device.lastUsedAt)}
                {state === "activo" && <> · Vence: {fecha(device.expiresAt)}</>}
              </p>
              {device.revokedAt && (
                <p className="text-xs text-muted-foreground">
                  Revocado el {fecha(device.revokedAt)}
                  {device.revokeReason ? ` ${REVOKE_REASON_LABEL[device.revokeReason]}` : ""}
                  {state === "borrado-pendiente" && ". Borrará sus datos cuando se conecte."}
                  {state === "borrado" && `. ${cerrarFrase(`Datos borrados el ${fecha(device.wipedAt)}`)}`}
                </p>
              )}
            </div>
            {state === "activo" && (
              <div className="flex shrink-0 gap-2">
                {device.current && onForget ? (
                  <Button variant="outline" color="neutral" size="sm" onClick={() => onForget(device)}>
                    Olvidar este equipo
                  </Button>
                ) : (
                  <Button variant="outline" color="destructive" size="sm" onClick={() => onRevoke(device)}>
                    Revocar…
                  </Button>
                )}
              </div>
            )}
          </li>
        )
      })}
    </ul>
  )
}
