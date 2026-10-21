import { useState, useSyncExternalStore } from "react"
import { format, isToday } from "date-fns"
import { es } from "date-fns/locale"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  CaretDownIcon,
  CheckCircleIcon,
  CloudOffIcon,
  CloudSyncIcon,
  WarningIcon,
} from "@/components/ui/icons"
import { Progress } from "@/components/ui/progress"
import {
  defaultPeriodos,
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
  cancelPrepare,
  hasResumableCheckpoint,
  prepareStore,
  preparePercent,
  type PrepareSnapshot,
} from "@/features/offline/lib/prepare-engine"
import { fetchPrepareOptions } from "@/features/offline/lib/prepare-tasks"
import { retryFailedPrepare, startPrepareJob } from "@/features/offline/lib/prepare-job"
import { failedCountText } from "@/features/offline/lib/prepare-labels"
import { isAutoPrepareEnabled, setAutoPrepareEnabled } from "@/features/offline/lib/auto-prepare"

const FRESHNESS_CLASS: Record<PrepareFreshness, string> = {
  fresca: "text-green",
  envejeciendo: "text-yellow",
  vieja: "text-red",
}

const SHARED_DEVICE_COPY =
  'Este equipo está en modo compartido: no se guardan datos para usar sin conexión. Si es tu equipo personal y estás en el piloto, desmarca "Este es un equipo compartido" al iniciar sesión.'

/** Alcance para roles sin grupos propios (super admin, rector, coordinación). */
const MENU_SCOPE_COPY =
  "Se guardará todo lo de tu menú: establecimientos, sedes, periodos, informes, catálogos y lo que ya abriste en esta sesión."

export const BACKGROUND_TOAST =
  "Preparando en segundo plano. Puedes seguir trabajando; te avisamos al terminar."

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

function CheckList<T>({
  legend,
  items,
  getId,
  getLabel,
  selected,
  onChange,
  disabled,
}: CheckListProps<T>) {
  if (items.length === 0) return null
  const allChecked = items.every((item) => selected.has(getId(item)))
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
      <div className="flex max-h-36 min-w-0 flex-col gap-1 overflow-y-auto pr-1">
        {items.map((item) => {
          const id = getId(item)
          const label = getLabel(item)
          return (
            <label key={id} className="flex min-w-0 items-center gap-2 text-sm">
              <Checkbox
                checked={selected.has(id)}
                disabled={disabled}
                aria-label={label}
                onCheckedChange={(checked) => onChange(toggle(selected, id, checked === true))}
              />
              <span className="min-w-0 truncate">{label}</span>
            </label>
          )
        })}
      </div>
    </div>
  )
}

function OptionCheckbox({
  label,
  hint,
  checked,
  disabled,
  onChange,
}: {
  label: string
  hint: string
  checked: boolean
  disabled?: boolean
  onChange: (checked: boolean) => void
}) {
  return (
    <label className="flex min-w-0 items-start gap-2">
      <Checkbox
        className="mt-0.5"
        checked={checked}
        disabled={disabled}
        aria-label={label}
        onCheckedChange={(next) => onChange(next === true)}
      />
      <span className="min-w-0">
        {label}
        <span className="block text-xs text-muted-foreground">{hint}</span>
      </span>
    </label>
  )
}

/** Lista legible de lo que falló (se reusa en el popover del header). */
export function PrepareFailedList({ snapshot }: { snapshot: PrepareSnapshot }) {
  if (snapshot.failedDetails.length === 0) return null
  return (
    <ul
      data-slot="prepare-failed-list"
      className="flex max-h-40 list-disc flex-col gap-0.5 overflow-y-auto pl-4 text-xs break-words"
    >
      {snapshot.failedDetails.map((f, i) => (
        <li key={i}>
          {f.label}: {f.message}
        </li>
      ))}
    </ul>
  )
}

/** Estado de la corrida en curso o de la última (dentro del diálogo). */
function PrepareStatus({
  snapshot,
  onRetry,
  retryDisabled,
}: {
  snapshot: PrepareSnapshot
  onRetry: () => void
  retryDisabled: boolean
}) {
  if (snapshot.running || snapshot.remote != null) {
    const { done, total } = snapshot.remote ?? snapshot
    const texto = snapshot.paused
      ? `En pausa: esperando conexión (${done} de ${total}). Sigue sola cuando vuelva.`
      : `Preparando en segundo plano… ${done} de ${total}${snapshot.remote ? " (en otra pestaña)" : ""}`
    return (
      <div className="flex min-w-0 flex-col gap-2 rounded-md border px-3 py-2" role="status">
        <Progress value={preparePercent(snapshot)} aria-label="Progreso de la preparación">
          <span className="text-sm">{texto}</span>
        </Progress>
        <p className="text-xs text-muted-foreground">
          Puedes cerrar esta ventana y seguir trabajando: el progreso queda en el indicador del
          encabezado.
        </p>
        <Button
          variant="ghost"
          color="destructive"
          size="sm"
          className="self-start"
          onClick={cancelPrepare}
        >
          Cancelar preparación
        </Button>
      </div>
    )
  }
  switch (snapshot.lastOutcome) {
    case "ok":
      return (
        <Alert>
          <CheckCircleIcon className="text-green" />
          <AlertTitle className="text-green">
            Listo. Este equipo puede usarse sin conexión.
          </AlertTitle>
          {snapshot.archivoBytes != null && (
            <AlertDescription>
              Archivos guardados: {formatBytes(snapshot.archivoBytes)}.
            </AlertDescription>
          )}
        </Alert>
      )
    case "parcial":
      return (
        <Alert variant="destructive">
          <WarningIcon />
          <AlertTitle>{failedCountText(snapshot.failed.length)}</AlertTitle>
          <AlertDescription className="flex min-w-0 flex-col gap-2">
            <span>Lo demás quedó guardado. Puedes reintentar solo lo que falló.</span>
            <PrepareFailedList snapshot={snapshot} />
            <Button
              variant="outline"
              color="primary"
              size="sm"
              className="self-start"
              disabled={retryDisabled}
              onClick={onRetry}
            >
              Reintentar lo que falló
            </Button>
          </AlertDescription>
        </Alert>
      )
    case "sin-conexion":
      return (
        <Alert variant="destructive">
          <CloudOffIcon />
          <AlertTitle>Sin conexión</AlertTitle>
          <AlertDescription>
            Lo descargado quedó guardado. Usa "Continuar" cuando vuelva la red.
          </AlertDescription>
        </Alert>
      )
    case "sin-espacio":
      return (
        <Alert variant="destructive">
          <WarningIcon />
          <AlertTitle>El almacenamiento del equipo está casi lleno</AlertTitle>
          <AlertDescription>Libera espacio y usa "Continuar".</AlertDescription>
        </Alert>
      )
    case "cancelada":
      return (
        <Alert>
          <CloudSyncIcon />
          <AlertTitle>Preparación cancelada</AlertTitle>
          <AlertDescription>
            Lo descargado quedó guardado. Usa "Continuar" para seguir desde ahí.
          </AlertDescription>
        </Alert>
      )
    default:
      return null
  }
}

/**
 * "Preparar para usar sin conexión" (plan offline §7.9, D-6/D-14). Un solo
 * botón principal: "Preparar todo" (todo el año) o "Continuar" si quedó una
 * corrida a medias. La corrida es un TRABAJO EN SEGUNDO PLANO
 * (`prepare-job.ts`): el diálogo se cierra enseguida y el progreso,
 * "Cancelar" y el aviso de fin viven en el header (`OfflineDataStatus`);
 * reabrir el diálogo muestra el progreso. Grupos/asignaturas/periodos,
 * archivos y "automático" van en "Opciones"; los selectores solo aparecen si
 * el usuario tiene grupos propios (super admin, rector o coordinación no los
 * tienen: se guarda lo de su menú).
 */
export function PrepareOfflineDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const queryClient = useQueryClient()
  const { data: user } = useUser()
  const onlineOnly = useOnlineOnly()
  const shared = getDeviceMode() === "compartido"
  const snapshot = useSyncExternalStore(
    prepareStore.subscribe,
    prepareStore.getSnapshot,
    prepareStore.getSnapshot,
  )
  const [incluirArchivos, setIncluirArchivos] = useState(false)
  const [autoPrepare, setAutoPrepare] = useState(isAutoPrepareEnabled)
  // `null` = sin tocar: rige "todo el año" (todos los grupos, asignaturas y periodos).
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
  // Super admin, rector o coordinación SIN rol docente: no tienen grupos
  // propios que elegir (el backend devuelve listas vacías, o en el mock todas
  // las del colegio). Para ellos no hay selectores: se guarda su menú.
  const roles = user?.roles ?? []
  const soloDirectivo =
    roles.some((r) => /RECTOR|COORDINADOR|SUPER_ADMINISTRADOR/.test(r)) &&
    !roles.some((r) => /DOCENTE|DIRECTOR_GRUPO/.test(r))
  const conGrupos = opciones.grupos.length > 0 && !soloDirectivo
  const personalizada = grupos != null || asignaturas != null || periodos != null
  const gruposSel = grupos ?? new Set(opciones.grupos.map((g) => g.grupoId))
  const asignaturasSel = asignaturas ?? new Set(asignaturasUnicas.map((a) => a.asignaturaId))
  const periodosSel = periodos ?? new Set(opciones.periodos.map((p) => p.id))

  const enCurso = snapshot.running || snapshot.remote != null
  const reanudable = !enCurso && hasResumableCheckpoint()
  const disabled = shared || onlineOnly.disabled || enCurso
  const cargandoOpciones = options.fetchStatus === "fetching" && options.isPending
  const lastPrepare = snapshot.lastPrepareAt

  function iniciar() {
    void startPrepareJob(queryClient, {
      roles,
      origin: "manual",
      options: opciones,
      selection: personalizada
        ? { grupos: gruposSel, asignaturas: asignaturasSel, periodos: periodosSel }
        : undefined,
      incluirArchivos,
      resume: reanudable,
    })
    toast.info(BACKGROUND_TOAST)
    onOpenChange(false)
  }

  function reintentar() {
    void retryFailedPrepare(queryClient)
    toast.info(BACKGROUND_TOAST)
    onOpenChange(false)
  }

  const primaryLabel = reanudable
    ? "Continuar"
    : personalizada
      ? "Preparar selección"
      : "Preparar todo"
  const nGrupos = opciones.grupos.length
  const scope = cargandoOpciones
    ? "Revisando qué hay para guardar…"
    : conGrupos
      ? `Se guardarán tus ${nGrupos} ${nGrupos === 1 ? "grupo" : "grupos"} con sus planillas, actividades, unidades, asistencia e informes${personalizada ? " (según tu selección)" : " de todo el año"}, además de los catálogos y lo ya abierto.`
      : MENU_SCOPE_COPY

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] min-w-0 overflow-x-hidden overflow-y-auto sm:max-w-lg">
        <DialogHeader className="min-w-0 pr-8">
          <DialogTitle>Preparar para usar sin conexión</DialogTitle>
          <DialogDescription>
            Guarda en este equipo lo necesario para trabajar sin internet. Corre en segundo plano:
            puedes seguir usando la app mientras tanto.
          </DialogDescription>
        </DialogHeader>

        <div className="flex min-w-0 flex-col gap-3 text-sm">
          {shared && (
            <Alert>
              <WarningIcon className="text-yellow" />
              <AlertDescription>{SHARED_DEVICE_COPY}</AlertDescription>
            </Alert>
          )}
          {!shared && onlineOnly.disabled && !enCurso && (
            <Alert>
              <CloudOffIcon />
              <AlertDescription>{onlineOnly.tooltip}</AlertDescription>
            </Alert>
          )}

          {!shared && (
            <PrepareStatus
              snapshot={snapshot}
              onRetry={reintentar}
              retryDisabled={onlineOnly.disabled || enCurso}
            />
          )}

          {!shared && !enCurso && lastPrepare && (
            <p className={FRESHNESS_CLASS[prepareFreshness(lastPrepare)]}>
              Última preparación: {formatPreparacion(lastPrepare)}
              {prepareFreshness(lastPrepare) === "vieja"
                ? ". Hace más de un mes: conviene volver a preparar."
                : "."}
            </p>
          )}

          {!shared && !onlineOnly.disabled && (
            <>
              <p className="text-muted-foreground" data-slot="prepare-scope">
                {scope}
              </p>
              {options.isError && (
                <p className="text-red">
                  No pudimos cargar tus grupos y asignaturas. Se prepararán solo los catálogos y lo
                  ya abierto.
                </p>
              )}

              <Collapsible className="min-w-0 rounded-md border">
                <CollapsibleTrigger
                  render={
                    <Button
                      variant="ghost"
                      color="neutral"
                      className="group w-full justify-between rounded-md px-3"
                    />
                  }
                >
                  Opciones
                  <CaretDownIcon
                    data-icon="inline-end"
                    className="transition-transform group-data-[panel-open]:rotate-180"
                  />
                </CollapsibleTrigger>
                <CollapsibleContent className="flex min-w-0 flex-col gap-3 px-3 pt-1 pb-3">
                  {conGrupos && (
                    <div className="grid min-w-0 gap-3 sm:grid-cols-3">
                      <CheckList
                        legend="Grupos"
                        items={opciones.grupos}
                        getId={(g) => g.grupoId}
                        getLabel={(g) => g.nombre}
                        selected={gruposSel}
                        onChange={setGrupos}
                        disabled={disabled || cargandoOpciones}
                      />
                      <CheckList
                        legend="Asignaturas"
                        items={asignaturasUnicas}
                        getId={(a) => a.asignaturaId}
                        getLabel={(a) => a.nombre}
                        selected={asignaturasSel}
                        onChange={setAsignaturas}
                        disabled={disabled || cargandoOpciones}
                      />
                      <CheckList
                        legend="Periodos"
                        items={opciones.periodos}
                        getId={(p) => p.id}
                        getLabel={(p) => p.nombre}
                        selected={periodosSel}
                        onChange={setPeriodos}
                        disabled={disabled || cargandoOpciones}
                      />
                    </div>
                  )}
                  {conGrupos && periodos == null && opciones.periodos.length > 1 && (
                    <Button
                      variant="link"
                      color="primary"
                      size="sm"
                      className="self-start px-0"
                      disabled={disabled}
                      onClick={() =>
                        setPeriodos(
                          new Set(
                            defaultPeriodos(opciones.periodos, format(new Date(), "yyyy-MM-dd")),
                          ),
                        )
                      }
                    >
                      Solo el periodo actual (más rápido)
                    </Button>
                  )}
                  {conGrupos && (
                    <OptionCheckbox
                      label="Incluir archivos"
                      hint="Evidencias de las planillas elegidas (hasta 5 MB cada una). Ocupa más espacio y tarda más."
                      checked={incluirArchivos}
                      disabled={disabled}
                      onChange={setIncluirArchivos}
                    />
                  )}
                  <OptionCheckbox
                    label="Guardar datos automáticamente"
                    hint="Con conexión, este equipo vuelve a preparar todo el año cada pocas horas (solo lo que cambió y sin pasarse del espacio disponible)."
                    checked={autoPrepare}
                    onChange={(checked) => {
                      setAutoPrepare(checked)
                      setAutoPrepareEnabled(checked)
                    }}
                  />
                </CollapsibleContent>
              </Collapsible>
            </>
          )}

          {!shared && <StorageStatusCard />}
          {!shared && <PinSetupCard />}
        </div>

        <DialogFooter className="min-w-0">
          <Button variant="outline" color="neutral" onClick={() => onOpenChange(false)}>
            Cerrar
          </Button>
          {!shared && !enCurso && (
            <Button disabled={disabled || cargandoOpciones} onClick={iniciar}>
              {primaryLabel}
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
          className="shrink-0"
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
