import { useState } from "react"

import { Button } from "@/components/ui/button"
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { syncNow } from "@/lib/offline/outbox/engine"
import { getOutboxUser } from "@/lib/offline/outbox/store"
import { useConnectivity } from "@/lib/offline/use-connectivity"
import {
  exportSyncPackage,
  importSyncPackage,
  PASSPHRASE_MIN_LENGTH,
  SyncPackageError,
} from "@/lib/offline/sync-package"

function mensaje(error: unknown): string {
  return error instanceof SyncPackageError ? error.message : "No pudimos procesar el paquete."
}

/**
 * Respaldo por USB (D-9): exportar desde el equipo sin internet (funciona sin
 * red) e importar en otro equipo con internet, con la misma cuenta.
 */
export function UsbPackageCard() {
  const { status } = useConnectivity()
  const [frase, setFrase] = useState("")
  const [archivo, setArchivo] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [ok, setOk] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const sub = getOutboxUser()

  async function exportar() {
    if (!sub) return
    setBusy(true)
    setError(null)
    setOk(null)
    try {
      const { blob, count } = await exportSyncPackage(sub, frase)
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `sincronizacion-${new Date().toISOString().slice(0, 10)}.cesync.json`
      a.click()
      URL.revokeObjectURL(url)
      setOk(`Paquete con ${count} cambios descargado. Cópialo a una memoria USB; en este equipo los cambios siguen pendientes.`)
    } catch (e) {
      setError(mensaje(e))
    } finally {
      setBusy(false)
    }
  }

  async function importar() {
    if (!sub || !archivo) return
    setBusy(true)
    setError(null)
    setOk(null)
    try {
      const result = await importSyncPackage(await archivo.text(), frase, sub)
      setOk(`Se agregaron ${result.agregados} cambios a la cola${result.yaEstaban ? ` (${result.yaEstaban} ya estaban)` : ""}. Enviando…`)
      void syncNow()
    } catch (e) {
      setError(mensaje(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <section aria-label="Paquete USB" className="flex flex-col gap-3 rounded-md border p-3 text-sm">
      <p className="font-semibold">¿Este equipo nunca tiene internet? Usa un paquete USB</p>
      <p className="text-muted-foreground">
        Exporta tus cambios pendientes a un archivo cifrado y llévalo a un equipo con internet. Allí inicia sesión con
        tu misma cuenta, abre esta pantalla e impórtalo con la misma frase.
      </p>
      <Field data-invalid={error ? true : undefined}>
        <FieldLabel htmlFor="usb-frase">Frase del paquete ({PASSPHRASE_MIN_LENGTH}+ caracteres)</FieldLabel>
        <Input id="usb-frase" type="password" autoComplete="off" value={frase} onChange={(e) => setFrase(e.target.value)} />
      </Field>
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="outline" color="primary" disabled={busy || frase.length < PASSPHRASE_MIN_LENGTH} onClick={() => void exportar()}>
          Exportar paquete
        </Button>
        <Input
          type="file"
          accept=".json,application/json"
          aria-label="Archivo de paquete"
          className="max-w-xs"
          onChange={(e) => setArchivo(e.target.files?.[0] ?? null)}
        />
        <Button
          variant="outline"
          color="primary"
          disabled={busy || !archivo || frase.length < PASSPHRASE_MIN_LENGTH || status === "offline"}
          onClick={() => void importar()}
        >
          Importar paquete
        </Button>
      </div>
      {error && <FieldError>{error}</FieldError>}
      {ok && <p className="text-green">{ok}</p>}
    </section>
  )
}
