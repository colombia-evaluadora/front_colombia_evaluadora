import { useState, useSyncExternalStore, type ReactNode } from "react"
import { useQueryClient } from "@tanstack/react-query"

import { Button } from "@/components/ui/button"
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { scheduleSync } from "@/lib/offline/outbox/engine"
import { clearOutbox, reload as reloadOutbox } from "@/lib/offline/outbox/store"
import { clearUserData, getActivePersistUser, restoreUserQueries } from "@/lib/offline/query-persister"
import { toDigitsOnly } from "@/lib/text-input"
import { destroyVault, unlockVault, vaultStore } from "@/lib/offline/vault"

/**
 * Pantalla de desbloqueo (D-4): con PIN creado, al abrir la app nada de lo
 * guardado se lee hasta escribirlo. El layout se ve (menú en cache), pero el
 * contenido queda tapado por esta pantalla.
 */
export function VaultGate({ children }: { children: ReactNode }) {
  const state = useSyncExternalStore(vaultStore.subscribe, vaultStore.get, () => "sin-pin" as const)
  if (state !== "bloqueada") return children
  return <PinUnlock />
}

function PinUnlock() {
  const queryClient = useQueryClient()
  const [pin, setPin] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [olvido, setOlvido] = useState(false)
  const sub = getActivePersistUser()

  async function afterOpen() {
    if (!sub) return
    await restoreUserQueries(queryClient, sub)
    await reloadOutbox()
    scheduleSync(0)
  }

  async function submit() {
    if (!sub) return
    setBusy(true)
    setError(null)
    const result = await unlockVault(sub, pin, async () => {
      // Agotados los intentos: se borran los datos guardados, NO los cambios
      // pendientes (siguen cifrados; con el PIN correcto se recuperan).
      await clearUserData(sub)
    })
    setBusy(false)
    setPin("")
    if (result.ok) {
      await afterOpen()
      return
    }
    setError(
      result.wiped
        ? "Demasiados intentos: se borraron los datos guardados de este equipo. Tus cambios pendientes siguen protegidos."
        : `PIN incorrecto. Te quedan ${result.remaining} intentos.`,
    )
  }

  async function olvideMiPin() {
    if (!sub) return
    // Sin el PIN no hay forma de descifrar: se pierde lo guardado y lo pendiente.
    await clearUserData(sub)
    await clearOutbox(sub)
    await destroyVault(sub)
    window.location.href = "/login"
  }

  return (
    <div className="mx-auto flex w-full max-w-sm flex-col gap-4 p-6">
      <h1 className="text-lg font-semibold">Escribe tu PIN</h1>
      <p className="text-muted-foreground text-sm">
        Tus datos sin conexión están cifrados en este equipo. Escribe el PIN que creaste para abrirlos.
      </p>
      <form
        className="flex flex-col gap-3"
        onSubmit={(event) => {
          event.preventDefault()
          void submit()
        }}
      >
        <Field data-invalid={error ? true : undefined}>
          <FieldLabel htmlFor="vault-pin">PIN</FieldLabel>
          <Input
            id="vault-pin"
            type="password"
            inputMode="numeric"
            autoComplete="off"
            autoFocus
            value={pin}
            onChange={(event) => setPin(toDigitsOnly(event.target.value, 12))}
            aria-invalid={error ? true : undefined}
          />
          {error && <FieldError>{error}</FieldError>}
        </Field>
        <Button type="submit" disabled={busy || pin.length === 0}>
          {busy ? "Abriendo…" : "Abrir"}
        </Button>
      </form>
      {olvido ? (
        <div role="alert" className="flex flex-col gap-2 rounded-md bg-red-22 p-3 text-sm text-red">
          <p>
            Sin el PIN no se pueden recuperar los datos ni los cambios que no se han sincronizado: se borrarán de
            este equipo y tendrás que iniciar sesión con conexión.
          </p>
          <div className="flex gap-2">
            <Button variant="fill" color="destructive" onClick={() => void olvideMiPin()}>
              Borrar y volver a empezar
            </Button>
            <Button variant="ghost" color="neutral" onClick={() => setOlvido(false)}>
              Cancelar
            </Button>
          </div>
        </div>
      ) : (
        <Button variant="link" color="neutral" className="self-start" onClick={() => setOlvido(true)}>
          Olvidé mi PIN
        </Button>
      )}
    </div>
  )
}
