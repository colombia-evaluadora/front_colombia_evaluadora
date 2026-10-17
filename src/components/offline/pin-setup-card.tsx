import { useState, useSyncExternalStore } from "react"

import { Button } from "@/components/ui/button"
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { resealOutbox } from "@/lib/offline/outbox/store"
import { getActivePersistUser, resealUserQueries } from "@/lib/offline/query-persister"
import { toDigitsOnly } from "@/lib/text-input"
import { createVault, isValidPin, PIN_MIN_LENGTH, vaultStore } from "@/lib/offline/vault"

/**
 * "Proteger con PIN" (D-4/D-8) dentro de Preparar. Al crearlo, todo lo
 * guardado en el equipo se re-escribe cifrado (AES-GCM) y desde ahí cada vez
 * que se abra la app se pide el PIN. Default revisable: opcional pero
 * recomendado (P6 pendiente).
 */
export function PinSetupCard() {
  const state = useSyncExternalStore(vaultStore.subscribe, vaultStore.get, () => "sin-pin" as const)
  const [pin, setPin] = useState("")
  const [confirm, setConfirm] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  if (state === "abierta") {
    return (
      <p className="rounded-md bg-green-22 px-3 py-2 text-green">
        Datos de este equipo cifrados con tu PIN. Lo pediremos cada vez que abras la app.
      </p>
    )
  }
  if (state !== "sin-pin") return null

  async function crear() {
    const sub = getActivePersistUser()
    if (!sub) return
    if (!isValidPin(pin)) return setError(`El PIN debe tener al menos ${PIN_MIN_LENGTH} dígitos.`)
    if (pin !== confirm) return setError("Los PIN no coinciden.")
    setBusy(true)
    setError(null)
    try {
      await createVault(sub, pin)
      await resealUserQueries(sub)
      await resealOutbox()
    } catch (e) {
      setError(e instanceof Error ? e.message : "No pudimos crear el PIN.")
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex flex-col gap-2 rounded-md border px-3 py-2">
      <p className="font-semibold">Proteger con PIN (recomendado)</p>
      <p className="text-muted-foreground text-xs">
        Cifra en este equipo las notas, la asistencia y los datos de tus estudiantes. Si lo olvidas, se pierde lo
        que no hayas sincronizado.
      </p>
      <div className="grid gap-2 sm:grid-cols-2">
        <Field data-invalid={error ? true : undefined}>
          <FieldLabel htmlFor="pin-nuevo">PIN ({PIN_MIN_LENGTH}+ dígitos)</FieldLabel>
          <Input
            id="pin-nuevo"
            type="password"
            inputMode="numeric"
            autoComplete="new-password"
            value={pin}
            onChange={(e) => setPin(toDigitsOnly(e.target.value, 12))}
          />
        </Field>
        <Field data-invalid={error ? true : undefined}>
          <FieldLabel htmlFor="pin-confirmar">Confirmar PIN</FieldLabel>
          <Input
            id="pin-confirmar"
            type="password"
            inputMode="numeric"
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(toDigitsOnly(e.target.value, 12))}
          />
        </Field>
      </div>
      {error && <FieldError>{error}</FieldError>}
      <Button variant="outline" color="primary" className="self-start" disabled={busy} onClick={() => void crear()}>
        {busy ? "Cifrando…" : "Crear PIN"}
      </Button>
    </div>
  )
}
