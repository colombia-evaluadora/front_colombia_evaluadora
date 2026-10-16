import { useState } from "react"
import { format, isToday } from "date-fns"
import { es } from "date-fns/locale"
import { hashKey, useQuery, useQueryClient, type QueryClient, type QueryKey } from "@tanstack/react-query"

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
  buildPlanillaTargets,
  defaultPeriodos,
  uniqueAsignaturas,
  type PlanillaTarget,
  type PrepareAsignatura,
  type PrepareGrupo,
  type PreparePeriodo,
} from "@/components/offline/prepare-offline-plan"
import { OnlineOnlyTooltip } from "@/components/offline/online-only-tooltip"
import { StorageStatusCard } from "@/components/offline/storage-status-card"
import { planeadorKeys } from "@/features/planeador/api/query-keys"
import { fetchMatriculasGrupo } from "@/features/planeador/api/query/use-actividad-matriculas-grupo-query"
import { fetchAgrupacionPlanillaOptions } from "@/features/planeador/api/query/use-agrupacion-planilla-catalog"
import { fetchDocenteGradoAsignatura } from "@/features/planeador/api/query/use-docente-grado-asignatura-query"
import { fetchDocenteGrupos } from "@/features/planeador/api/query/use-docente-grupos-query"
import { fetchMomentosRegistro } from "@/features/planeador/api/query/use-momento-registro-catalog"
import { fetchPeriodosEvaluacion } from "@/features/planeador/api/query/use-planeador-periodos-evaluacion-query"
import { fetchPlanillaCalificaciones } from "@/features/planeador/api/query/use-planilla-calificaciones-query"
import { fetchPlanillaColumnas } from "@/features/planeador/api/query/use-planilla-columnas-query"
import { fetchSoportesEstudiante } from "@/features/planeador/api/query/use-soportes-estudiante-query"
import { fetchTipoActividadCatalog } from "@/features/planeador/api/query/use-tipo-actividad-catalog"
import { fetchTipoAdaptacionOptions } from "@/features/planeador/api/query/use-tipo-adaptacion-catalog"
import { fetchSedesOpciones } from "@/features/academic-management/asistencia/api/query/use-sedes-opciones-query"
import { fetchTipoAsistenciaOptions } from "@/features/academic-management/asistencia/api/query/use-tipo-asistencia-catalog-query"
import { cacheArchivo } from "@/lib/offline/file-cache"
import { getDeviceMode } from "@/lib/offline/query-persister"
import {
  TTL_OFFLINE,
  catalogoMeta,
  estudiantesMeta,
  offlineMeta,
  proveedorMeta,
  type AppQueryMeta,
} from "@/lib/offline/query-meta"
import { useOnlineOnly } from "@/lib/offline/use-online-only"

const LAST_PREPARE_KEY = "ce-offline-last-prepare"

const SHARED_DEVICE_COPY =
  'Este equipo está en modo compartido: no se guardan datos para usar sin conexión. Si es tu equipo personal y estás en el piloto, desmarca "Este es un equipo compartido" al iniciar sesión.'

/**
 * Una tarea de la descarga. `run` puede devolver tareas nuevas (p. ej. una
 * planilla devuelve la descarga de sus evidencias): se agregan al final de la
 * cola y suman al total del progreso.
 */
interface PrepareTask {
  queryKey: QueryKey
  run: (queryClient: QueryClient) => Promise<PrepareTask[] | void>
}

function seed(queryKey: QueryKey, queryFn: () => Promise<unknown>, meta: AppQueryMeta): PrepareTask {
  return {
    queryKey,
    run: async (queryClient) => {
      await queryClient.fetchQuery({ queryKey, queryFn, meta, staleTime: 0 })
    },
  }
}

/** Catálogos y proveedores que el docente necesita en cualquier pantalla offline. */
function seedTasks(): PrepareTask[] {
  return [
    seed(planeadorKeys.sedesOpciones(), fetchSedesOpciones, proveedorMeta()),
    seed(planeadorKeys.periodosEvaluacion(), fetchPeriodosEvaluacion, proveedorMeta()),
    seed(["tipo-asistencia", "catalogo"], fetchTipoAsistenciaOptions, catalogoMeta()),
    seed(planeadorKeys.catalogos.tipoActividad(), fetchTipoActividadCatalog, catalogoMeta()),
    seed(planeadorKeys.catalogos.momentoRegistro(), fetchMomentosRegistro, catalogoMeta()),
    seed(planeadorKeys.catalogos.agrupacionPlanilla(), fetchAgrupacionPlanillaOptions, catalogoMeta()),
    seed(planeadorKeys.tipoAdaptacionCatalog(), fetchTipoAdaptacionOptions, catalogoMeta()),
    seed(planeadorKeys.docenteGrupos(), () => fetchDocenteGrupos(), offlineMeta(TTL_OFFLINE.grupo)),
    seed(
      planeadorKeys.docenteGradoAsignatura(),
      () => fetchDocenteGradoAsignatura(),
      offlineMeta(TTL_OFFLINE.grupo),
    ),
  ]
}

/** Lista de estudiantes de cada grupo elegido (form de actividad). */
function grupoTasks(grupoIds: number[]): PrepareTask[] {
  return grupoIds.map((grupoId) =>
    seed(planeadorKeys.matriculasGrupo(grupoId), () => fetchMatriculasGrupo(grupoId), estudiantesMeta()),
  )
}

/** Archivos de una celda: la lista de soportes y el contenido de cada uno. */
function archivoTasks(pkTactividadEstudiante: number, archivoIds: number[]): PrepareTask[] {
  return [
    seed(
      planeadorKeys.actividadEstudiante.soportes(pkTactividadEstudiante),
      () => fetchSoportesEstudiante(pkTactividadEstudiante),
      estudiantesMeta(),
    ),
    ...archivoIds.map(
      (archivoId): PrepareTask => ({
        queryKey: ["archivo", archivoId],
        run: async () => {
          await cacheArchivo(archivoId)
        },
      }),
    ),
  ]
}

/** Columnas + calificaciones con los MISMOS params que la planilla; con
 *  `incluirArchivos`, encadena la descarga de las evidencias de cada celda. */
function planillaTasks(targets: PlanillaTarget[], incluirArchivos: boolean): PrepareTask[] {
  return targets.flatMap((params): PrepareTask[] => [
    seed(
      planeadorKeys.planilla.columnas(params),
      () => fetchPlanillaColumnas(params),
      offlineMeta(TTL_OFFLINE.grupo),
    ),
    {
      queryKey: planeadorKeys.planilla.calificaciones.lista(params),
      run: async (queryClient) => {
        const data = await queryClient.fetchQuery({
          queryKey: planeadorKeys.planilla.calificaciones.lista(params),
          queryFn: () => fetchPlanillaCalificaciones(params),
          meta: estudiantesMeta(),
          staleTime: 0,
        })
        if (!incluirArchivos) return
        return data.rows.flatMap((fila) =>
          fila.celdas
            .filter((celda) => celda.evidencias.length > 0)
            .flatMap((celda) =>
              archivoTasks(
                celda.pkTactividadEstudiante,
                celda.evidencias.map((e) => e.fkTarchivo),
              ),
            ),
        )
      },
    },
  ])
}

/**
 * Además de lo elegido, refresca **todas** las queries persistibles
 * (`meta.offline`) que ya están en memoria: actividades, unidades y rosters de
 * asistencia que el docente abrió en esta sesión. Así se reusan las keys y
 * `queryFn` exactas de cada pantalla sin duplicar sus parámetros.
 */
function cachedOfflineTasks(queryClient: QueryClient, seeded: Set<string>): PrepareTask[] {
  return queryClient
    .getQueryCache()
    .findAll({ predicate: (query) => Boolean(query.meta?.offline) && !seeded.has(query.queryHash) })
    .map((query) => ({
      queryKey: query.queryKey,
      run: async (client) => {
        await client.refetchQueries(
          { queryKey: query.queryKey, exact: true, type: "all" },
          { throwOnError: true },
        )
      },
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

interface PrepareOptions {
  grupos: PrepareGrupo[]
  asignaturas: PrepareAsignatura[]
  periodos: PreparePeriodo[]
}

async function fetchPrepareOptions(): Promise<PrepareOptions> {
  const [grupos, pares, periodos] = await Promise.all([
    fetchDocenteGrupos(),
    fetchDocenteGradoAsignatura(),
    fetchPeriodosEvaluacion(),
  ])
  return {
    grupos: grupos.map((g) => ({
      grupoId: g.grupoId,
      gradoId: g.gradoId,
      nombre: `${g.gradoNombre} · ${g.grupoNombre}`,
    })),
    asignaturas: pares.map((p) => ({
      gradoId: p.gradoId,
      asignaturaId: p.asignaturaId,
      nombre: p.asignaturaNombre,
    })),
    periodos: periodos.map((p) => ({ id: p.id, nombre: p.nombre, startDate: p.startDate, endDate: p.endDate })),
  }
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

type Phase = "idle" | "running" | "done"

/**
 * "Preparar para usar sin conexión" (plan offline §7.9, tarea 4.3). El docente
 * elige grupos, asignaturas y periodos (por defecto: todos sus grupos y
 * asignaturas y el periodo vigente) y si incluir archivos (evidencias).
 * Descarga catálogos, listas de estudiantes, la planilla de cada grupo ×
 * asignatura × periodo y refresca lo ya abierto; pide
 * `navigator.storage.persist()`. En modo equipo compartido queda
 * deshabilitado (nada se persiste, §0.3).
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
  const [incluirArchivos, setIncluirArchivos] = useState(false)
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

  async function runTasks(initial: PrepareTask[]) {
    setPhase("running")
    setDone(0)
    setTotal(initial.length)
    setFailed([])
    setEspacio(await requestPersistentStorage())
    const errores: PrepareTask[] = []
    const queue = [...initial]
    // Secuencial: no saturar una red escolar lenta y dar progreso real.
    for (let i = 0; i < queue.length; i++) {
      try {
        const extra = await queue[i].run(queryClient)
        if (extra?.length) {
          queue.push(...extra)
          setTotal(queue.length)
        }
      } catch {
        errores.push(queue[i])
      }
      setDone(i + 1)
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
    const targets = buildPlanillaTargets(opciones.grupos, opciones.asignaturas, {
      grupos: gruposSel,
      asignaturas: asignaturasSel,
      periodos: periodosSel,
    })
    const elegidas = [
      ...seedTasks(),
      ...grupoTasks([...gruposSel]),
      ...planillaTasks(targets, incluirArchivos),
    ]
    const seeded = new Set(elegidas.map((task) => hashKey(task.queryKey)))
    void runTasks([...elegidas, ...cachedOfflineTasks(queryClient, seeded)])
  }

  const running = phase === "running"
  const disabled = shared || onlineOnly.disabled || running
  const cargandoOpciones = options.fetchStatus === "fetching" && options.isPending
  const selectionDisabled = disabled || cargandoOpciones

  return (
    <Dialog open={open} onOpenChange={(next) => !running && onOpenChange(next)}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Preparar para usar sin conexión</DialogTitle>
          <DialogDescription>
            Descargaremos a este equipo lo necesario para trabajar sin internet: las planillas y listas de
            estudiantes de los grupos, asignaturas y periodos que elijas, los catálogos y lo que ya abriste en
            esta sesión. Puede tardar unos minutos.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3 text-sm">
          {!shared && <StorageStatusCard />}
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
            </>
          )}

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
            <Button disabled={selectionDisabled} onClick={start}>
              {running ? "Descargando…" : "Preparar"}
            </Button>
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
