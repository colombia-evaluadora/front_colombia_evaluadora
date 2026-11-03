import { useState } from "react"
import { ErrorNoticeBanner } from "@/components/notice/error-notice-banner"
import { useQueryClient } from "@tanstack/react-query"

import { Button } from "@/components/ui/button"
import { Field, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { NoticeOutlet, NoticeProvider, useNotify } from "@/components/notice/notice-context"
import { getErrorMessage } from "@/lib/api-client"
import { useUser } from "@/lib/auth"
import { deviceCredentialEnabled, forgetThisDevice, registerThisDevice } from "@/lib/offline/device-session"
import { toEmailInput } from "@/lib/text-input"
import { useRevokeDevice } from "@/features/devices/api/mutations/revoke-device"
import { useAdminDevicesQuery, useMyDevicesQuery } from "@/features/devices/api/query/use-devices-query"
import type { Device } from "@/features/devices/api/types/device"
import { DeviceList } from "@/features/devices/components/device-list"
import { RevokeDeviceDialog } from "@/features/devices/components/revoke-device-dialog"

/**
 * "Mis dispositivos" (`add-offline-meses-pwa`, D-3/D-8): equipos registrados
 * para sincronizar sin contraseña, con su último uso y vencimiento. Revocar
 * corta la credencial del equipo; con "Borrar los datos..." además el equipo
 * borra lo guardado al conectarse (borrado remoto). El super administrador
 * busca los equipos de otro usuario por correo. Solo en línea.
 */
export function MisDispositivosPage() {
  return (
    <NoticeProvider>
      <MisDispositivosContent />
    </NoticeProvider>
  )
}

function MisDispositivosContent() {
  const { notify } = useNotify()
  const queryClient = useQueryClient()
  const { data: user } = useUser()
  const sub = user?.id ?? null
  const devices = useMyDevicesQuery(sub)
  const [target, setTarget] = useState<{ device: Device; admin: boolean } | null>(null)
  const [dialogError, setDialogError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const revoke = useRevokeDevice()
  const personal = deviceCredentialEnabled()
  const current = devices.data?.find((d) => d.current && !d.revokedAt)

  async function registrar() {
    if (!sub) return
    setBusy(true)
    try {
      await registerThisDevice(sub)
      await queryClient.invalidateQueries({ queryKey: ["devices"] })
      notify("Equipo registrado: podrá sincronizar sin pedirte la contraseña.", { variant: "success" })
    } catch (error) {
      notify(getErrorMessage(error), { variant: "error" })
    } finally {
      setBusy(false)
    }
  }

  async function olvidar(device: Device) {
    if (!sub) return
    setBusy(true)
    try {
      await revoke.mutateAsync({ id: device.id, wipe: false })
      await forgetThisDevice(sub)
      notify("Este equipo ya no sincroniza sin contraseña. Los datos guardados se conservan.", { variant: "success" })
    } catch (error) {
      notify(getErrorMessage(error), { variant: "error" })
    } finally {
      setBusy(false)
    }
  }

  function confirmar(wipe: boolean) {
    if (!target) return
    setDialogError(null)
    revoke.mutate(
      { id: target.device.id, wipe, admin: target.admin },
      {
        onSuccess: () => {
          setTarget(null)
          notify(
            wipe
              ? "Equipo revocado. Borrará sus datos la próxima vez que se conecte."
              : "Equipo revocado. Ya no puede sincronizar sin contraseña.",
            { variant: "success" },
          )
        },
        onError: (error) => setDialogError(getErrorMessage(error)),
      },
    )
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 p-4">
      <h1 className="text-xl font-semibold">Mis dispositivos</h1>
      <p className="text-sm text-muted-foreground">
        Los equipos registrados sincronizan lo que hiciste sin conexión hasta 6 meses sin volver a pedirte la
        contraseña. Si perdiste un equipo o ya no lo usas, revócalo; si lo perdiste o te lo robaron, pide además que
        borre sus datos.
      </p>
      <NoticeOutlet />

      {personal && !devices.isPending && !current && (
        <div className="flex flex-col gap-2 rounded-md border border-dashed px-3 py-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm">Este equipo no está registrado para sincronizar sin contraseña.</p>
          <Button variant="fill" color="primary" size="sm" disabled={busy} onClick={() => void registrar()}>
            Registrar este equipo
          </Button>
        </div>
      )}

      {devices.isPending ? (
        <p className="text-sm text-muted-foreground">Cargando equipos…</p>
      ) : devices.isError ? (
        <ErrorNoticeBanner
          error={devices.error}
          action={{ label: "Reintentar", onClick: () => void devices.refetch() }}
        />
      ) : (
        <DeviceList
          devices={devices.data ?? []}
          emptyText="No tienes equipos registrados."
          onRevoke={(device) => setTarget({ device, admin: false })}
          onForget={(device) => void olvidar(device)}
        />
      )}

      {user?.isSuperAdmin && <AdminDevicesSection onRevoke={(device) => setTarget({ device, admin: true })} />}

      <RevokeDeviceDialog
        key={target?.device.id ?? "cerrado"}
        device={target?.device ?? null}
        pending={revoke.isPending}
        error={dialogError}
        onClose={() => {
          setTarget(null)
          setDialogError(null)
        }}
        onConfirm={confirmar}
      />
    </div>
  )
}

/** Super administrador: equipos de cualquier usuario (por correo). */
function AdminDevicesSection({ onRevoke }: { onRevoke: (device: Device) => void }) {
  const [input, setInput] = useState("")
  const [email, setEmail] = useState("")
  const devices = useAdminDevicesQuery(email)

  return (
    <section className="flex flex-col gap-3 border-t pt-4" aria-labelledby="dispositivos-admin">
      <h2 id="dispositivos-admin" className="font-semibold">
        Equipos de otro usuario
      </h2>
      <form
        className="flex flex-col gap-2 sm:flex-row sm:items-end"
        onSubmit={(event) => {
          event.preventDefault()
          setEmail(toEmailInput(input).trim().toLowerCase())
        }}
      >
        <Field variant="outlined" className="min-w-0 flex-1">
          <FieldLabel htmlFor="dispositivos-correo">Correo del usuario</FieldLabel>
          <Input
            id="dispositivos-correo"
            type="email"
            value={input}
            onChange={(event) => setInput(event.target.value)}
            autoComplete="off"
          />
        </Field>
        <Button type="submit" variant="outline" color="primary" disabled={!input.trim()}>
          Buscar
        </Button>
      </form>
      {email &&
        (devices.isPending ? (
          <p className="text-sm text-muted-foreground">Buscando…</p>
        ) : devices.isError ? (
          <ErrorNoticeBanner error={devices.error} />
        ) : (
          <DeviceList
            devices={devices.data ?? []}
            emptyText="Ese usuario no tiene equipos registrados."
            onRevoke={onRevoke}
          />
        ))}
    </section>
  )
}
