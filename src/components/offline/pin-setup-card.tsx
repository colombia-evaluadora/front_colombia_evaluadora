import { useState } from "react"

import { PinInput } from "@/components/offline/pin-input"
import { FieldError } from "@/components/ui/field"
import { resealDeviceToken } from "@/lib/offline/device-token"
import { resealOutbox } from "@/lib/offline/outbox/store"
import { getActivePersistUser, resealUserQueries } from "@/lib/offline/query-persister"
import { createVault, isEasyPin, PIN_LENGTH } from "@/lib/offline/vault"

/**
 * Crear el PIN del equipo, obligatorio para preparar (decisión del líder,
 * 2026-11): se escribe y se repite, sin botones. Al crearlo, todo lo guardado
 * se re-escribe cifrado (AES-GCM) y se llama `onCreated`.
 */
export function PinSetupCard({ onCreated }: { onCreated: () => void }) {
  const [primero, setPrimero] = useState<string | null>(null)
  const [pin, setPin] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function completar(valor: string) {
    if (busy) return
    if (primero == null) {
      setPin("")
      if (isEasyPin(valor)) {
        setError("Ese PIN es muy fácil de adivinar. Elija otros números.")
        return
      }
      setError(null)
      setPrimero(valor)
      return
    }
    const reiniciar = (mensaje: string) => {
      setPin("")
      setPrimero(null)
      setError(mensaje)
    }
    if (valor !== primero) {
      reiniciar("Los números no coinciden. Empecemos de nuevo.")
      return
    }
    const sub = getActivePersistUser()
    if (!sub) {
      reiniciar("Inicie sesión con internet para crear su PIN.")
      return
    }
    setBusy(true)
    setError(null)
    try {
      await createVault(sub, valor)
      await resealUserQueries(sub)
      await resealOutbox()
      // El token del equipo pasa a sellarse con la DEK del PIN.
      await resealDeviceToken(sub)
      onCreated()
    } catch (e) {
      reiniciar(e instanceof Error ? e.message : "No pudimos crear el PIN. Intente de nuevo.")
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex min-w-0 flex-col gap-3 rounded-md border px-3 py-4 text-center" data-slot="pin-setup">
      <p className="text-base font-semibold" aria-live="polite">
        {busy
          ? "Protegiendo sus datos…"
          : primero == null
            ? `Cree un PIN de ${PIN_LENGTH} números`
            : "Repita el mismo PIN"}
      </p>
      <p className="text-muted-foreground">
        {primero == null
          ? "Protege la información de sus estudiantes si alguien más usa o se lleva este equipo. Se le pedirá al abrir la aplicación."
          : "Así confirmamos que lo escribió bien."}
      </p>
      <PinInput
        key={primero == null ? "crear" : "repetir"}
        id="pin-equipo"
        label={primero == null ? "PIN nuevo" : "Repetir PIN"}
        value={pin}
        invalid={error != null}
        disabled={busy}
        onChange={setPin}
        onComplete={(v) => void completar(v)}
      />
      {error && <FieldError className="text-center">{error}</FieldError>}
      <p className="text-xs text-muted-foreground">
        Elija números que recuerde. Si lo olvida, entra de nuevo con internet y su contraseña; solo se pierde lo que
        no se haya enviado.
      </p>
    </div>
  )
}
