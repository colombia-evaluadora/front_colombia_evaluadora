import { useEffect, useState } from "react"

import { Button } from "@/components/ui/button"
import { WarningIcon, XIcon } from "@/components/ui/icons"
import { getDeviceMode } from "@/lib/offline/query-persister"
import { getStorageStatus, storageRisks, type StorageRisk } from "@/lib/offline/storage-status"

const DISMISS_KEY = "offline:storage-warning-dismissed"

const COPY: Record<Exclude<StorageRisk, "ok">, string> = {
  "ios-sin-instalar":
    "Este iPhone/iPad puede borrar tus datos sin conexión a los 7 días. Instala la app (Compartir y \"Agregar a inicio\") y ábrela siempre desde ese ícono.",
  "no-persistido":
    "El navegador puede borrar los datos guardados en este equipo. Instala la app y abre \"Preparar para usar sin conexión\" para protegerlos.",
  cuota: "El almacenamiento de este equipo está casi lleno: podrías perder datos sin conexión.",
}

function readDismissed(): boolean {
  try {
    return sessionStorage.getItem(DISMISS_KEY) === "1"
  } catch {
    return false
  }
}

/**
 * Aviso global (offline de meses, D-1): en un equipo personal, si el
 * almacenamiento no es persistente, está casi lleno o es iOS sin la PWA
 * instalada, el docente puede perder meses de trabajo. Se puede cerrar por
 * sesión, pero vuelve a aparecer al abrir la app.
 */
export function StorageWarningBanner() {
  const [risk, setRisk] = useState<Exclude<StorageRisk, "ok"> | null>(null)
  const [dismissed, setDismissed] = useState(readDismissed)

  useEffect(() => {
    if (getDeviceMode() !== "personal") return
    let alive = true
    void getStorageStatus().then((status) => {
      const first = storageRisks(status)[0]
      if (alive && first !== "ok") setRisk(first)
    })
    return () => {
      alive = false
    }
  }, [])

  if (!risk || dismissed) return null
  return (
    <div role="alert" className="flex items-start gap-2 bg-red-22 px-4 py-2 text-sm text-red">
      <WarningIcon className="mt-0.5 size-4 shrink-0" aria-hidden />
      <p className="grow">{COPY[risk]}</p>
      <Button
        variant="ghost"
        color="destructive"
        aria-label="Cerrar aviso de almacenamiento"
        onClick={() => {
          try {
            sessionStorage.setItem(DISMISS_KEY, "1")
          } catch {
            // Sin sessionStorage: se cierra solo en memoria.
          }
          setDismissed(true)
        }}
      >
        <XIcon />
      </Button>
    </div>
  )
}
