import { useState } from "react"
import { format, isToday } from "date-fns"
import { es } from "date-fns/locale"
import { hashKey, useQueryClient, type QueryClient, type QueryKey } from "@tanstack/react-query"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Progress } from "@/components/ui/progress"
import { planeadorKeys } from "@/features/planeador/api/query-keys"
import { fetchAgrupacionPlanillaOptions } from "@/features/planeador/api/query/use-agrupacion-planilla-catalog"
import { fetchMomentosRegistro } from "@/features/planeador/api/query/use-momento-registro-catalog"
import { fetchPeriodosEvaluacion } from "@/features/planeador/api/query/use-planeador-periodos-evaluacion-query"
import { fetchTipoActividadCatalog } from "@/features/planeador/api/query/use-tipo-actividad-catalog"
import { fetchTipoAdaptacionOptions } from "@/features/planeador/api/query/use-tipo-adaptacion-catalog"
import { fetchSedesOpciones } from "@/features/academic-management/asistencia/api/query/use-sedes-opciones-query"
import { fetchTipoAsistenciaOptions } from "@/features/academic-management/asistencia/api/query/use-tipo-asistencia-catalog-query"
import { getDeviceMode } from "@/lib/offline/query-persister"
import { catalogoMeta, proveedorMeta, type AppQueryMeta } from "@/lib/offline/query-meta"
import { useOnlineOnly } from "@/lib/offline/use-online-only"

const LAST_PREPARE_KEY = "ce-offline-last-prepare"

const SHARED_DEVICE_COPY =
  'Este equipo está en modo compartido: no se guardan datos para usar sin conexión. Si es tu equipo personal y estás en el piloto, desmarca "Este es un equipo compartido" al iniciar sesión.'

interface PrepareTask {
  queryKey: QueryKey
  run: (queryClient: QueryClient) => Promise<unknown>
}

/** Catálogos y proveedores que el docente necesita en cualquier pantalla offline. */
function seedTasks(): PrepareTask[] {
  const seed = (queryKey: QueryKey, queryFn: () => Promise<unknown>, meta: AppQueryMeta): PrepareTask => ({
    queryKey,
    run: (queryClient) => queryClient.fetchQuery({ queryKey, queryFn, meta, staleTime: 0 }),
  })
  return [
    seed(planeadorKeys.sedesOpciones(), fetchSedesOpciones, proveedorMeta()),
    seed(planeadorKeys.periodosEvaluacion(), fetchPeriodosEvaluacion, proveedorMeta()),
    seed(["tipo-asistencia", "catalogo"], fetchTipoAsistenciaOptions, catalogoMeta()),
    seed(planeadorKeys.catalogos.tipoActividad(), fetchTipoActividadCatalog, catalogoMeta()),
    seed(planeadorKeys.catalogos.momentoRegistro(), fetchMomentosRegistro, catalogoMeta()),
    seed(planeadorKeys.catalogos.agrupacionPlanilla(), fetchAgrupacionPlanillaOptions, catalogoMeta()),
    seed(planeadorKeys.tipoAdaptacionCatalog(), fetchTipoAdaptacionOptions, catalogoMeta()),
  ]
}

/**
 * Además de los catálogos, refresca **todas** las queries persistibles
 * (`meta.offline`) que ya están en memoria: actividades, unidades, planillas
 * y rosters de los grupos que el docente abrió en esta sesión. Así se reusan
 * las keys y `queryFn` exactas de cada pantalla sin duplicar sus parámetros.
 */
function cachedOfflineTasks(queryClient: QueryClient, seeded: Set<string>): PrepareTask[] {
  return queryClient
    .getQueryCache()
    .findAll({ predicate: (query) => Boolean(query.meta?.offline) && !seeded.has(query.queryHash) })
    .map((query) => ({
      queryKey: query.queryKey,
      run: (client) => client.refetchQueries({ queryKey: query.queryKey, exact: true, type: "all" }, { throwOnError: true }),
    }))
}

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

function readLastPrepare(): number | null {
  try {
    const value = Number(localStorage.getItem(LAST_PREPARE_KEY))
    return Number.isFinite(value) && value > 0 ? value : null
  } catch {
    return null
  }
}

function formatPreparacion(at: number): string {
  return isToday(at) ? `hoy ${format(at, "HH:mm")}` : format(at, "d MMM, HH:mm", { locale: es })
}

type Phase = "idle" | "running" | "done"

/**
 * "Preparar para usar sin conexión" (plan offline §7.9, tarea 4.3). Descarga
 * catálogos y refresca lo ya abierto; pide `navigator.storage.persist()`. En
 * modo equipo compartido queda deshabilitado (nada se persiste, §0.3).
 */
export function PrepareOfflineDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const queryClient = useQueryClient()
  const onlineOnly = useOnlineOnly()
  const shared = getDeviceMode() === "compartido"
  const [phase, setPhase] = useState<Phase>("idle")
  const [done, setDone] = useState(0)
  const [total, setTotal] = useState(0)
  const [failed, setFailed] = useState<PrepareTask[]>([])
  const [espacio, setEspacio] = useState<string | null>(null)
  const [lastPrepare, setLastPrepare] = useState<number | null>(readLastPrepare)

  async function runTasks(tasks: PrepareTask[]) {
    setPhase("running")
    setDone(0)
    setTotal(tasks.length)
    setFailed([])
    setEspacio(await requestPersistentStorage())
    const errores: PrepareTask[] = []
    // Secuencial: no saturar una red escolar lenta y dar progreso real.
    for (const task of tasks) {
      try {
        await task.run(queryClient)
      } catch {
        errores.push(task)
      }
      setDone((n) => n + 1)
    }
    setFailed(errores)
    if (errores.length === 0) {
      const now = Date.now()
      setLastPrepare(now)
      try {
        localStorage.setItem(LAST_PREPARE_KEY, String(now))
      } catch {
        // Sin storage: solo se pierde el "Última preparación".
      }
    }
    setPhase("done")
  }

  function start() {
    const seeds = seedTasks()
    const seeded = new Set(seeds.map((task) => hashKey(task.queryKey)))
    void runTasks([...seeds, ...cachedOfflineTasks(queryClient, seeded)])
  }

  const running = phase === "running"
  const disabled = shared || onlineOnly.disabled || running

  return (
    <Dialog open={open} onOpenChange={(next) => !running && onOpenChange(next)}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Preparar para usar sin conexión</DialogTitle>
          <DialogDescription>
            Descargaremos a este equipo lo necesario para trabajar sin internet: tus actividades y unidades, las
            planillas y listas de estudiantes de tus grupos del periodo actual y los catálogos. Puede tardar unos
            minutos.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3 text-sm">
          {shared && <p className="rounded-md bg-yellow-22 px-3 py-2 text-yellow">{SHARED_DEVICE_COPY}</p>}
          {!shared && onlineOnly.disabled && <p className="text-muted-foreground">{onlineOnly.tooltip}</p>}

          {phase !== "idle" && (
            <Progress value={total ? Math.round((done / total) * 100) : 0} aria-label="Progreso de la descarga">
              <span>{running ? `Descargando ${done} de ${total}…` : null}</span>
            </Progress>
          )}

          {phase === "done" && failed.length === 0 && (
            <p className="text-green">
              Listo. Este equipo puede usarse sin conexión.
              {lastPrepare && ` Última preparación: ${formatPreparacion(lastPrepare)}.`}
            </p>
          )}
          {phase === "done" && failed.length > 0 && (
            <p className="text-red">No se pudieron descargar {failed.length} elementos.</p>
          )}
          {phase === "idle" && lastPrepare && (
            <p className="text-muted-foreground">Última preparación: {formatPreparacion(lastPrepare)}.</p>
          )}
          {espacio && <p className="text-muted-foreground">Espacio disponible en este equipo: {espacio}.</p>}
        </div>

        <DialogFooter>
          <Button variant="outline" color="neutral" disabled={running} onClick={() => onOpenChange(false)}>
            Cerrar
          </Button>
          {phase === "done" && failed.length > 0 ? (
            <Button disabled={disabled} onClick={() => void runTasks(failed)}>
              Reintentar
            </Button>
          ) : (
            <Button disabled={disabled} onClick={start}>
              {running ? "Descargando…" : "Preparar"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
