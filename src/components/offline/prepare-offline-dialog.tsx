import { useState, useSyncExternalStore } from "react"
import { format, isToday } from "date-fns"
import { es } from "date-fns/locale"
import { hashKey, useQuery, useQueryClient } from "@tanstack/react-query"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { CloudOffIcon } from "@/components/ui/icons"
import { Progress } from "@/components/ui/progress"
import {
  defaultPeriodos,
  fullYearSelection,
  prepareFreshness,
  type PrepareFreshness,
  uniqueAsignaturas,
} from "@/components/offline/prepare-offline-plan"
import { OnlineOnlyTooltip } from "@/components/offline/online-only-tooltip"
import { StorageStatusCard } from "@/components/offline/storage-status-card"
import { PinSetupCard } from "@/components/offline/pin-setup-card"
import { useUser } from "@/lib/auth"
import { formatBytes } from "@/lib/offline/storage-status"
import { getDeviceMode } from "@/lib/offline/query-persister"
import { useOnlineOnly } from "@/lib/offline/use-online-only"
import {
  hasResumableCheckpoint,
  prepareStore,
  runPrepare,
  type PrepareTask,
} from "@/features/offline/lib/prepare-engine"
import { buildPrepareTasks, cachedOfflineTasks, fetchPrepareOptions } from "@/features/offline/lib/prepare-tasks"
import { isAutoPrepareEnabled, setAutoPrepareEnabled } from "@/features/offline/lib/auto-prepare"
import { failedCountText } from "@/features/offline/lib/prepare-labels"

const FRESHNESS_CLASS: Record<PrepareFreshness, string> = {
  fresca: "text-green",
  envejeciendo: "text-yellow",
  vieja: "text-red",
}

const SHARED_DEVICE_COPY =
  'Este equipo está en modo compartido: no se guardan datos para usar sin conexión. Si es tu equipo personal y estás en el piloto, desmarca "Este es un equipo compartido" al iniciar sesión.'

async function requestPersistentStorage(): Promise<string | null> {
  try {
    if (!navigator.storage) return null
    await navigator.storage.persist?.()
    const estimate = await navigator.storage.estimate?.()
    if (!estimate?.quota) return null
    const libreMb = Math.max(0, (estimate.quota - (estimate.usage ?? 0)) / (1024 * 1024))
    return libreMb >= 1024 ? `${(libreMb / 1024).toFixed(1)} GB` : `${Math.round(libreMb)} MB`
  } catch {
    return null
  }
}

function formatPreparacion(at: number): string {
  return isToday(at) ? `hoy ${format(at, "HH:mm")}` : format(at, "d MMM, HH:mm", { locale: es })
}

function toggle(set: Set<number>, id: number, checked: boolean): Set<number> {
  const next = new Set(set)
  if (checked) next.add(id)
  else next.delete(id)
  return next
}

interface CheckListProps<T> {
  legend: string
  items: T[]
  getId: (item: T) => number
  getLabel: (item: T) => string
  selected: Set<number>
  onChange: (next: Set<number>) => void
  disabled: boolean
}

function CheckList<T>({ legend, items, getId, getLabel, selected, onChange, disabled }: CheckListProps<T>) {
  const allChecked = items.length > 0 && items.every((item) => selected.has(getId(item)))
  return (
    <div role="group" aria-label={legend} className="flex min-w-0 flex-col gap-1.5">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-semibold">{legend}</span>
        {items.length > 1 && (
          <Button
            variant="link"
            color="primary"
            size="sm"
            disabled={disabled}
            onClick={() => onChange(allChecked ? new Set() : new Set(items.map(getId)))}
          >
            {allChecked ? "Ninguno" : "Todos"}
          </Button>
        )}
      </div>
      {items.length === 0 ? (
        <p className="text-muted-foreground text-xs">Sin opciones.</p>
      ) : (
        <div className="flex max-h-36 flex-col gap-1 overflow-y-auto pr-1">
          {items.map((item) => {
            const id = getId(item)
            const label = getLabel(item)
            return (
              <label key={id} className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={selected.has(id)}
                  disabled={disabled}
                  aria-label={label}
                  onCheckedChange={(checked) => onChange(toggle(selected, id, checked === true))}
                />
                <span className="truncate">{label}</span>
              </label>
            )
          })}
        </div>
      )}
    </div>
  )
}

/**
 * "Preparar para usar sin conexión" (plan offline §7.9, D-6/D-14). El docente
 * elige grupos, asignaturas y periodos (por defecto: todos sus grupos y
 * asignaturas y el periodo vigente) y si incluir archivos. Qué se baja lo
 * decide `features/offline/lib/prepare-tasks.ts` (las mismas keys que cada
 * pantalla, incluidas las listas con filtros: calendarios por mes, rail por
 * día, cascada de informes, referentes…) y lo corre el motor compartido con
 * la autopreparación (`prepare-engine.ts`): si hay una corrida automática en
 * curso, el diálogo muestra su progreso en vez de arrancar otra.
 */
export function PrepareOfflineDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const queryClient = useQueryClient()
  const { data: user } = useUser()
  const onlineOnly = useOnlineOnly()
  const shared = getDeviceMode() === "compartido"
  const snapshot = useSyncExternalStore(prepareStore.subscribe, prepareStore.getSnapshot, prepareStore.getSnapshot)
  // Corrida lanzada desde ESTE diálogo (para mostrar "Listo" al terminar).
  const [lanzada, setLanzada] = useState(false)
  const [espacio, setEspacio] = useState<string | null>(null)
  const [incluirArchivos, setIncluirArchivos] = useState(false)
  const [autoPrepare, setAutoPrepare] = useState(isAutoPrepareEnabled)
  // `null` = sin tocar todavía: rigen los defaults de las opciones cargadas.
  const [grupos, setGrupos] = useState<Set<number> | null>(null)
  const [asignaturas, setAsignaturas] = useState<Set<number> | null>(null)
  const [periodos, setPeriodos] = useState<Set<number> | null>(null)

  const options = useQuery({
    queryKey: ["offline", "prepare-options"],
    queryFn: fetchPrepareOptions,
    enabled: open && !shared && !onlineOnly.disabled,
    staleTime: 60_000,
  })
  const opciones = options.data ?? { grupos: [], asignaturas: [], periodos: [] }
  const asignaturasUnicas = uniqueAsignaturas(opciones.asignaturas)
  const gruposSel = grupos ?? new Set(opciones.grupos.map((g) => g.grupoId))
  const asignaturasSel = asignaturas ?? new Set(asignaturasUnicas.map((a) => a.asignaturaId))
  const periodosSel =
    periodos ?? new Set(defaultPeriodos(opciones.periodos, format(new Date(), "yyyy-MM-dd")))

  async function correr(tasks: PrepareTask[], { resume = false }: { resume?: boolean } = {}) {
    setLanzada(true)
    setEspacio(await requestPersistentStorage())
    await runPrepare(queryClient, tasks, { origin: "manual", resume })
  }

  function start({ todoElAnio = false, resume = false }: { todoElAnio?: boolean; resume?: boolean } = {}) {
    const selection = todoElAnio
      ? fullYearSelection(opciones.grupos, asignaturasUnicas, opciones.periodos)
      : { grupos: gruposSel, asignaturas: asignaturasSel, periodos: periodosSel }
    if (todoElAnio) {
      setGrupos(selection.grupos)
      setAsignaturas(selection.asignaturas)
      setPeriodos(selection.periodos)
    }
    const elegidas = buildPrepareTasks(queryClient, {
      options: opciones,
      selection,
      incluirArchivos,
      roles: user?.roles ?? [],
    })
    const seeded = new Set(elegidas.map((task) => hashKey(task.queryKey)))
    void correr([...elegidas, ...cachedOfflineTasks(queryClient, seeded)], { resume })
  }

  const running = snapshot.running
  const terminada = lanzada && !running && snapshot.lastOutcome != null
  const fallidas = terminada ? snapshot.failed : []
  const reanudable = !running && !terminada && hasResumableCheckpoint()
  const disabled = shared || onlineOnly.disabled || running
  const cargandoOpciones = options.fetchStatus === "fetching" && options.isPending
  const selectionDisabled = disabled || cargandoOpciones
  const lastPrepare = snapshot.lastPrepareAt

  return (
    <Dialog open={open} onOpenChange={(next) => !(running && lanzada) && onOpenChange(next)}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Preparar para usar sin conexión</DialogTitle>
          <DialogDescription>
            Descargaremos a este equipo lo necesario para trabajar sin internet: las planillas, listas de estudiantes,
            actividades, unidades, calendarios de asistencia, informes y referentes de los grupos, asignaturas y
            periodos que elijas, los catálogos y lo que ya abriste en esta sesión. Puede tardar unos minutos.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3 text-sm">
          {!shared && <StorageStatusCard />}
          {!shared && <PinSetupCard />}
          {shared && <p className="rounded-md bg-yellow-22 px-3 py-2 text-yellow">{SHARED_DEVICE_COPY}</p>}
          {!shared && onlineOnly.disabled && <p className="text-muted-foreground">{onlineOnly.tooltip}</p>}

          {!shared && !onlineOnly.disabled && (
            <>
              {options.isError && (
                <p className="text-red">
                  No pudimos cargar tus grupos y asignaturas. Se prepararán solo los catálogos y lo ya abierto.
                </p>
              )}
              <div className="grid gap-3 sm:grid-cols-3">
                <CheckList
                  legend="Grupos"
                  items={opciones.grupos}
                  getId={(g) => g.grupoId}
                  getLabel={(g) => g.nombre}
                  selected={gruposSel}
                  onChange={setGrupos}
                  disabled={selectionDisabled}
                />
                <CheckList
                  legend="Asignaturas"
                  items={asignaturasUnicas}
                  getId={(a) => a.asignaturaId}
                  getLabel={(a) => a.nombre}
                  selected={asignaturasSel}
                  onChange={setAsignaturas}
                  disabled={selectionDisabled}
                />
                <CheckList
                  legend="Periodos"
                  items={opciones.periodos}
                  getId={(p) => p.id}
                  getLabel={(p) => p.nombre}
                  selected={periodosSel}
                  onChange={setPeriodos}
                  disabled={selectionDisabled}
                />
              </div>
              <label className="flex items-start gap-2">
                <Checkbox
                  checked={incluirArchivos}
                  disabled={disabled}
                  aria-label="Incluir archivos"
                  onCheckedChange={(checked) => setIncluirArchivos(checked === true)}
                />
                <span>
                  Incluir archivos
                  <span className="text-muted-foreground block text-xs">
                    Evidencias de las planillas elegidas (hasta 5 MB cada una). Ocupa más espacio y tarda más.
                  </span>
                </span>
              </label>
              <label className="flex items-start gap-2">
                <Checkbox
                  checked={autoPrepare}
                  aria-label="Guardar datos automáticamente"
                  onCheckedChange={(checked) => {
                    setAutoPrepare(checked === true)
                    setAutoPrepareEnabled(checked === true)
                  }}
                />
                <span>
                  Guardar datos automáticamente
                  <span className="text-muted-foreground block text-xs">
                    Con conexión, este equipo vuelve a preparar todo el año cada pocas horas, sin que tengas que
                    hacer nada (solo lo que cambió y sin pasarse del espacio disponible).
                  </span>
                </span>
              </label>
            </>
          )}

          {(running || terminada) && (
            <Progress
              value={snapshot.total ? Math.round((snapshot.done / snapshot.total) * 100) : 0}
              aria-label="Progreso de la descarga"
            >
              <span>
                {running
                  ? snapshot.paused
                    ? `En pausa: esperando conexión (${snapshot.done} de ${snapshot.total}). Seguirá sola cuando vuelva.`
                    : `${snapshot.origin === "auto" ? "Guardando datos automáticamente" : "Descargando"} ${snapshot.done} de ${snapshot.total}…`
                  : null}
              </span>
            </Progress>
          )}

          {terminada && fallidas.length === 0 && snapshot.lastOutcome === "ok" && (
            <p className="text-green">
              Listo. Este equipo puede usarse sin conexión.
              {lastPrepare && ` Última preparación: ${formatPreparacion(lastPrepare)}.`}
            </p>
          )}
          {terminada && fallidas.length > 0 && (
            <div role="alert" className="flex flex-col gap-1 text-red">
              <p>{failedCountText(fallidas.length)} Lo demás quedó guardado; puedes reintentar solo lo que falló.</p>
              <details className="text-xs">
                <summary className="cursor-pointer">Ver qué falló</summary>
                <ul className="mt-1 flex list-disc flex-col gap-0.5 pl-4 break-words">
                  {snapshot.failedDetails.map((f, i) => (
                    <li key={i}>
                      {f.label}: {f.message}
                    </li>
                  ))}
                </ul>
              </details>
            </div>
          )}
          {terminada && snapshot.lastOutcome === "sin-conexion" && (
            <p className="text-red">Se cortó la conexión: lo descargado quedó guardado. Continúa cuando vuelva.</p>
          )}
          {!running && !terminada && lastPrepare && (
            <p className={FRESHNESS_CLASS[prepareFreshness(lastPrepare)]}>
              Última preparación: {formatPreparacion(lastPrepare)}
              {prepareFreshness(lastPrepare) === "vieja" ? ". Hace más de un mes: conviene volver a preparar." : "."}
            </p>
          )}
          {terminada && snapshot.archivoBytes != null && (
            <p className="text-muted-foreground">Archivos guardados en este equipo: {formatBytes(snapshot.archivoBytes)}.</p>
          )}
          {espacio && <p className="text-muted-foreground">Espacio disponible en este equipo: {espacio}.</p>}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            color="neutral"
            disabled={running && lanzada}
            onClick={() => onOpenChange(false)}
          >
            Cerrar
          </Button>
          {terminada && fallidas.length > 0 ? (
            <Button disabled={running || onlineOnly.disabled} onClick={() => void correr(fallidas)}>
              Reintentar
            </Button>
          ) : (
            <>
              {reanudable && (
                <Button variant="outline" color="primary" disabled={selectionDisabled} onClick={() => start({ resume: true })}>
                  Continuar preparación
                </Button>
              )}
              <Button
                variant="outline"
                color="primary"
                disabled={selectionDisabled}
                onClick={() => start({ todoElAnio: true })}
              >
                Preparar todo el año
              </Button>
              <Button disabled={selectionDisabled} onClick={() => start()}>
                {running ? "Descargando…" : "Preparar"}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/**
 * "Preparar sin conexión" en el header de Planeador y Asistencia (mismo
 * diálogo que el menú de la cuenta). Sin red queda deshabilitado con el
 * tooltip estándar.
 */
export function PrepareOfflineButton() {
  const [open, setOpen] = useState(false)
  const onlineOnly = useOnlineOnly()
  return (
    <>
      <OnlineOnlyTooltip tooltip={onlineOnly.tooltip}>
        <Button
          variant="outline"
          color="primary"
          size="sm"
          disabled={onlineOnly.disabled}
          onClick={() => setOpen(true)}
        >
          <CloudOffIcon data-icon="inline-start" />
          Preparar sin conexión
        </Button>
      </OnlineOnlyTooltip>
      <PrepareOfflineDialog open={open} onOpenChange={setOpen} />
    </>
  )
}
