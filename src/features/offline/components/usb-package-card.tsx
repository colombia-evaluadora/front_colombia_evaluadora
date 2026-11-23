import { useState } from "react"

import { Button } from "@/components/ui/button"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { CaretDownIcon } from "@/components/ui/icons"
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
 * Respaldo por USB (D-9), presentado como «Pasar mis cambios a otro equipo» y
 * cerrado por defecto (quien usa un solo equipo no lo necesita): exportar desde el equipo sin internet (funciona sin
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
      setOk(`Paquete con ${count} cambios descargado. Cópielo a una memoria USB e impórtelo en un equipo con internet; en este equipo los cambios siguen pendientes.`)
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
      setOk(`Se agregaron ${result.agregados} cambios a la cola${result.yaEstaban ? ` (${result.yaEstaban} ya estaban)` : ""}. Enviando a la plataforma…`)
      void syncNow()
    } catch (e) {
      setError(mensaje(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <section aria-label="Pasar mis cambios a otro equipo" className="min-w-0 rounded-md border text-sm">
    <Collapsible className="flex min-w-0 flex-col">
      <CollapsibleTrigger
        render={<Button variant="ghost" color="neutral" className="group w-full justify-between rounded-md px-3" />}
      >
        Opciones avanzadas: pasar mis cambios a otro equipo
        <CaretDownIcon data-icon="inline-end" className="transition-transform group-data-[panel-open]:rotate-180" />
      </CollapsibleTrigger>
      <CollapsibleContent className="flex min-w-0 flex-col gap-3 px-3 pt-1 pb-3">
      <p className="text-muted-foreground">
        Úselo solo si este equipo nunca tiene internet. Si su equipo se conecta de vez en cuando, no lo necesita:
        sus cambios se envían solos al volver la conexión.
      </p>
      <ol className="text-muted-foreground flex list-decimal flex-col gap-1 pl-5">
        <li>
          En este equipo escriba una frase secreta y pulse «Exportar paquete». Se descarga un archivo protegido con
          sus cambios pendientes; cópielo a una memoria USB.
        </li>
        <li>
          En un equipo con internet, inicie sesión con su misma cuenta, abra esta pantalla, escriba la misma frase,
          elija el archivo y pulse «Importar paquete». Los cambios se envían a la plataforma.
        </li>
        <li>En este equipo los cambios siguen apareciendo como pendientes; no se borran.</li>
      </ol>
      <Field variant="outlined" data-invalid={error ? true : undefined}>
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
      </CollapsibleContent>
    </Collapsible>
    </section>
  )
}
