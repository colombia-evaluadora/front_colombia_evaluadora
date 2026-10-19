import { useEffect, useState, useSyncExternalStore } from "react"
import { formatDistanceToNowStrict } from "date-fns"
import { es } from "date-fns/locale"

import { PrepareOfflineDialog } from "@/components/offline/prepare-offline-dialog"
import { prepareFreshness, type PrepareFreshness } from "@/components/offline/prepare-offline-plan"
import { Button } from "@/components/ui/button"
import { CloudCheckIcon, CloudOffIcon, CloudSyncIcon } from "@/components/ui/icons"
import { getOfflineMode } from "@/lib/offline/offline-mode"
import { getDeviceMode } from "@/lib/offline/query-persister"
import { cn } from "@/lib/utils"
import { prepareStore } from "@/features/offline/lib/prepare-engine"

const TONO: Record<PrepareFreshness, string> = {
  fresca: "text-green",
  envejeciendo: "text-yellow",
  vieja: "text-red",
}

/** "hace 5 minutos" (se refresca cada minuto). */
function useHaceCuanto(at: number | null): string | null {
  const [, setTick] = useState(0)
  useEffect(() => {
    if (at == null) return
    const timer = setInterval(() => setTick((n) => n + 1), 60_000)
    return () => clearInterval(timer)
  }, [at])
  if (at == null) return null
  return formatDistanceToNowStrict(at, { addSuffix: true, locale: es })
}

/**
 * Estado de los datos guardados en el header (D-14): "Datos guardados: hace
 * X" (verde < 7 días, amarillo < 30, rojo después), "Guardando datos… N %"
 * mientras corre una preparación, o "Datos sin guardar". Abre "Preparar sin
 * conexión". Solo en equipos personales con el modo offline encendido.
 */
export function OfflineDataStatus() {
  const snapshot = useSyncExternalStore(prepareStore.subscribe, prepareStore.getSnapshot, prepareStore.getSnapshot)
  const [open, setOpen] = useState(false)
  const hace = useHaceCuanto(snapshot.lastPrepareAt)
  if (getDeviceMode() !== "personal" || getOfflineMode() === "off") return null

  const porcentaje = snapshot.total ? Math.round((snapshot.done / snapshot.total) * 100) : 0
  let texto: string
  let Icon = CloudOffIcon
  let tono = "text-muted-foreground"
  if (snapshot.running) {
    texto = `Guardando datos… ${porcentaje} %`
    Icon = CloudSyncIcon
    tono = "text-blue"
  } else if (snapshot.lastPrepareAt != null && hace) {
    texto = `Datos guardados: ${hace}`
    Icon = CloudCheckIcon
    tono = TONO[prepareFreshness(snapshot.lastPrepareAt)]
  } else {
    texto = "Datos sin guardar"
  }

  return (
    <>
      <Button
        variant="ghost"
        color="neutral"
        size="sm"
        data-slot="offline-data-status"
        aria-label={`${texto}. Preparar sin conexión`}
        title={texto}
        onClick={() => setOpen(true)}
        className={cn("gap-1.5", tono)}
      >
        <Icon aria-hidden className={cn("size-5", snapshot.running && "animate-pulse motion-reduce:animate-none")} />
        <span className="hidden text-xs font-medium lg:inline">{texto}</span>
      </Button>
      <PrepareOfflineDialog open={open} onOpenChange={setOpen} />
    </>
  )
}
