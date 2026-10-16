import { useEffect, useState, useSyncExternalStore } from "react"

import { Button } from "@/components/ui/button"
import { InfoIcon, WarningIcon } from "@/components/ui/icons"
import { OFFLINE_MAX_DAYS } from "@/lib/offline/limits"
import {
  canPromptInstall,
  formatBytes,
  getStorageStatus,
  promptInstall,
  requestPersistentStorage,
  storageRisks,
  subscribeInstall,
  type StorageStatus,
} from "@/lib/offline/storage-status"

const RISK_COPY: Record<Exclude<ReturnType<typeof storageRisks>[number], "ok">, string> = {
  "ios-sin-instalar":
    "En iPhone/iPad, Safari borra los datos guardados si pasas 7 días sin abrir la app. Instálala con el botón Compartir y \"Agregar a inicio\", y ábrela siempre desde ese ícono.",
  "no-persistido":
    "El navegador no garantizó guardar los datos de forma permanente y podría borrarlos si falta espacio. Instala la app y vuelve a intentarlo.",
  cuota: "El espacio de almacenamiento está casi lleno. Libera espacio o no incluyas archivos al preparar.",
}

function persistLabel(persisted: boolean | null) {
  if (persisted) return "persistente"
  return persisted === false ? "NO persistente" : "desconocido"
}

/**
 * Estado del almacenamiento para el offline de meses (D-1): persistencia,
 * cuota e instalación de la PWA. Se muestra en "Preparar para usar sin
 * conexión"; los riesgos van en rojo porque significan perder lo capturado.
 */
export function StorageStatusCard() {
  const [status, setStatus] = useState<StorageStatus | null>(null)
  const puedeInstalar = useSyncExternalStore(subscribeInstall, canPromptInstall, () => false)

  useEffect(() => {
    let cancelled = false
    void requestPersistentStorage()
      .then(getStorageStatus)
      .then((s) => {
        if (!cancelled) setStatus(s)
      })
    return () => {
      cancelled = true
    }
  }, [puedeInstalar])

  if (!status) return null
  const risks = storageRisks(status).filter((r) => r !== "ok")

  return (
    <div className="flex flex-col gap-2 rounded-md border px-3 py-2">
      <p className="flex items-center gap-2">
        <InfoIcon className="size-4 shrink-0" aria-hidden />
        <span>
          Almacenamiento {persistLabel(status.persisted)} · usado {formatBytes(status.usage)} de{" "}
          {formatBytes(status.quota)} · puedes trabajar sin conexión hasta {OFFLINE_MAX_DAYS} días.
        </span>
      </p>
      {risks.map((risk) => (
        <p key={risk} role="alert" className="flex items-start gap-2 rounded-md bg-red-22 px-2 py-1 text-red">
          <WarningIcon className="mt-0.5 size-4 shrink-0" aria-hidden />
          <span>{RISK_COPY[risk as keyof typeof RISK_COPY]}</span>
        </p>
      ))}
      {!status.installed && puedeInstalar && (
        <Button variant="outline" color="primary" className="self-start" onClick={() => void promptInstall()}>
          Instalar la app en este equipo
        </Button>
      )}
    </div>
  )
}
