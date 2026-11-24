import { useEffect, useState, useSyncExternalStore, type ReactNode } from "react"
import { useQueryClient } from "@tanstack/react-query"

import { Button } from "@/components/ui/button"
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { PinInput } from "@/components/offline/pin-input"
import { scheduleSync } from "@/lib/offline/outbox/engine"
import { clearOutbox, reload as reloadOutbox } from "@/lib/offline/outbox/store"
import { clearUserData, getActivePersistUser, restoreUserQueries } from "@/lib/offline/query-persister"
import { toDigitsOnly } from "@/lib/text-input"
import { destroyVault, isBoxedPin, unlockVault, vaultStore } from "@/lib/offline/vault"

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
  // PIN de casillas: se abre solo al completarlo. Los viejos conservan el campo y el botón.
  const [casillas, setCasillas] = useState<boolean | null>(null)
  useEffect(() => {
    if (sub) void isBoxedPin(sub).then(setCasillas)
  }, [sub])

  async function afterOpen() {
    if (!sub) return
    await restoreUserQueries(queryClient, sub)
    await reloadOutbox()
    scheduleSync(0)
  }

  async function submit(valor = pin) {
    if (!sub || busy) return
    setBusy(true)
    setError(null)
    const result = await unlockVault(sub, valor, async () => {
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
        ? "Demasiados intentos: se borraron los datos guardados de este equipo. Sus cambios pendientes siguen protegidos."
        : `PIN incorrecto. Le quedan ${result.remaining} intentos.`,
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
      <h1 className="text-lg font-semibold">Escriba su PIN</h1>
      <p className="text-muted-foreground text-sm">
        Son los números que eligió al preparar este equipo.
      </p>
      <form
        className="flex flex-col gap-3"
        onSubmit={(event) => {
          event.preventDefault()
          void submit()
        }}
      >
        {casillas && (
          <>
            <PinInput
              id="vault-pin"
              label="PIN"
              value={pin}
              invalid={error != null}
              disabled={busy}
              onChange={setPin}
              onComplete={(v) => void submit(v)}
            />
            {busy && <p className="text-center text-sm text-muted-foreground">Abriendo…</p>}
            {error && <FieldError>{error}</FieldError>}
          </>
        )}
        {casillas === false && (
          <>
        <Field variant="outlined" data-invalid={error ? true : undefined}>
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
          </>
        )}
      </form>
      {olvido ? (
        <div role="alert" className="flex flex-col gap-2 rounded-md border border-red-stroke bg-red-22 p-3 text-sm text-red">
          <p>
            Se borrará lo guardado en este equipo y entrará de nuevo con internet y su contraseña. Lo que ya se envió no
            se pierde; los cambios sin enviar sí.
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
