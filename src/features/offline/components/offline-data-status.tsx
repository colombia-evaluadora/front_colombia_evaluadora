import { useEffect, useRef, useState, useSyncExternalStore } from "react"
import { formatDistanceToNowStrict } from "date-fns"
import { es } from "date-fns/locale"
import { useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

import {
  BACKGROUND_TOAST,
  PrepareFailedList,
  PrepareOfflineDialog,
} from "@/components/offline/prepare-offline-dialog"
import { prepareFreshness, type PrepareFreshness } from "@/components/offline/prepare-offline-plan"
import { Button } from "@/components/ui/button"
import { CloudCheckIcon, CloudOffIcon, CloudSyncIcon } from "@/components/ui/icons"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Progress } from "@/components/ui/progress"
import { getOfflineMode } from "@/lib/offline/offline-mode"
import { getDeviceMode } from "@/lib/offline/query-persister"
import { useOnlineOnly } from "@/lib/offline/use-online-only"
import { cn } from "@/lib/utils"
import {
  cancelPrepare,
  listenPrepareChannel,
  prepareStore,
  preparePercent,
  type PrepareSnapshot,
} from "@/features/offline/lib/prepare-engine"
import { retryFailedPrepare } from "@/features/offline/lib/prepare-job"
import { failedCountText } from "@/features/offline/lib/prepare-labels"

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
 * Aviso al terminar una corrida de ESTA pestaña: siempre si fue a mano o la
 * primera automática; las automáticas siguientes son calladas salvo que algo
 * falle. "Parcial" lleva "Ver detalles", que abre el diálogo con la lista.
 */
function useCompletionToast(snapshot: PrepareSnapshot, onDetails: () => void) {
  const prev = useRef(snapshot)
  useEffect(() => {
    const antes = prev.current
    prev.current = snapshot
    if (!antes.running || snapshot.running) return
    const avisar = antes.origin === "manual" || antes.firstRun
    switch (snapshot.lastOutcome) {
      case "ok":
        if (avisar) toast.success("Listo. Este equipo puede usarse sin conexión.")
        break
      case "parcial":
        toast.warning(failedCountText(snapshot.failed.length), {
          description: "Lo demás quedó guardado.",
          action: { label: "Ver detalles", onClick: onDetails },
          duration: 15_000,
        })
        break
      case "sin-conexion":
        if (avisar)
          toast.error('Preparación detenida sin conexión. Usa "Continuar" cuando vuelva la red.')
        break
      case "sin-espacio":
        toast.error("No se terminó de preparar: el almacenamiento del equipo está casi lleno.")
        break
      case "cancelada":
        toast.info("Preparación cancelada. Lo descargado quedó guardado.")
        break
    }
  }, [snapshot, onDetails])
}

/**
 * Estado de los datos guardados en el header (D-14). Sin corrida: "Datos
 * guardados: hace X" (verde < 7 días, amarillo < 30, rojo después) o "Datos
 * sin guardar", y abre "Preparar sin conexión". Con una corrida en segundo
 * plano (de esta pestaña u otra): "Preparando… 45 %" con un popover de
 * detalle y "Cancelar", sin bloquear nada. Al terminar avisa con un toast.
 * Solo en equipos personales con el modo offline encendido.
 */
export function OfflineDataStatus() {
  const queryClient = useQueryClient()
  const snapshot = useSyncExternalStore(
    prepareStore.subscribe,
    prepareStore.getSnapshot,
    prepareStore.getSnapshot,
  )
  const [open, setOpen] = useState(false)
  const [popoverOpen, setPopoverOpen] = useState(false)
  const onlineOnly = useOnlineOnly()
  const hace = useHaceCuanto(snapshot.lastPrepareAt)
  useEffect(() => listenPrepareChannel(), [])
  useCompletionToast(snapshot, () => setOpen(true))
  if (getDeviceMode() !== "personal" || getOfflineMode() === "off") return null

  const enCurso = snapshot.running || snapshot.remote != null
  const porcentaje = preparePercent(snapshot)
  const progreso = snapshot.remote ?? snapshot
  let texto: string
  let Icon = CloudOffIcon
  let tono = "text-muted-foreground"
  if (enCurso) {
    texto = snapshot.paused
      ? `En pausa sin conexión… ${porcentaje} %`
      : `Preparando… ${porcentaje} %`
    Icon = CloudSyncIcon
    tono = "text-blue"
  } else if (snapshot.lastPrepareAt != null && hace) {
    texto = `Datos guardados: ${hace}`
    Icon = CloudCheckIcon
    tono = TONO[prepareFreshness(snapshot.lastPrepareAt)]
  } else {
    texto = "Datos sin guardar"
  }

  const chipProps = {
    variant: "ghost",
    color: "neutral",
    size: "sm",
    "data-slot": "offline-data-status",
    "aria-label": `Estado de los datos del equipo: ${texto}`,
    title: texto,
    className: cn("gap-1.5", tono),
  } as const
  const contenido = (
    <>
      <Icon
        aria-hidden
        className={cn("size-5", enCurso && "animate-pulse motion-reduce:animate-none")}
      />
      <span className="hidden text-xs font-medium tabular-nums lg:inline">{texto}</span>
      {enCurso && (
        <span aria-hidden className="text-xs font-medium tabular-nums lg:hidden">
          {porcentaje}%
        </span>
      )}
    </>
  )

  let control
  if (enCurso) {
    control = (
      <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
        <PopoverTrigger render={<Button {...chipProps} />}>{contenido}</PopoverTrigger>
        <PopoverContent
          align="end"
          className="w-80 max-w-[calc(100vw-2rem)]"
          data-slot="prepare-popover"
        >
          <div className="flex min-w-0 flex-col gap-2">
            <p className="font-semibold">Preparando sin conexión</p>
            <Progress value={porcentaje} aria-label="Progreso de la preparación">
              <span className="text-xs text-muted-foreground tabular-nums">
                {progreso.done} de {progreso.total}
                {snapshot.remote ? " · en otra pestaña" : ""}
                {snapshot.paused ? " · esperando conexión" : ""}
              </span>
            </Progress>
            <p className="text-xs text-muted-foreground">
              Corre en segundo plano: puedes seguir trabajando. Te avisamos al terminar.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                color="neutral"
                size="sm"
                onClick={() => {
                  setPopoverOpen(false)
                  setOpen(true)
                }}
              >
                Ver detalles
              </Button>
              <Button
                variant="ghost"
                color="destructive"
                size="sm"
                onClick={() => {
                  cancelPrepare()
                  setPopoverOpen(false)
                }}
              >
                Cancelar
              </Button>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    )
  } else if (snapshot.lastOutcome === "parcial") {
    control = (
      <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
        <PopoverTrigger render={<Button {...chipProps} />}>{contenido}</PopoverTrigger>
        <PopoverContent
          align="end"
          className="w-80 max-w-[calc(100vw-2rem)]"
          data-slot="prepare-popover"
        >
          <div className="flex min-w-0 flex-col gap-2">
            <p className="font-semibold text-red">{failedCountText(snapshot.failed.length)}</p>
            <PrepareFailedList snapshot={snapshot} />
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                disabled={onlineOnly.disabled}
                onClick={() => {
                  void retryFailedPrepare(queryClient)
                  toast.info(BACKGROUND_TOAST)
                  setPopoverOpen(false)
                }}
              >
                Reintentar lo que falló
              </Button>
              <Button
                variant="outline"
                color="neutral"
                size="sm"
                onClick={() => {
                  setPopoverOpen(false)
                  setOpen(true)
                }}
              >
                Preparar sin conexión
              </Button>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    )
  } else {
    control = (
      <Button {...chipProps} onClick={() => setOpen(true)}>
        {contenido}
      </Button>
    )
  }

  return (
    <>
      {control}
      <PrepareOfflineDialog open={open} onOpenChange={setOpen} />
    </>
  )
}
