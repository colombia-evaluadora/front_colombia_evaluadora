import * as React from "react"

import {
  TableScreen,
  TableScreenBody,
  TableScreenHeader,
  TableScreenTitle,
} from "@/components/layout/table-screen"
import { NoticeOutlet, NoticeProvider, useNotify } from "@/components/notice/notice-context"
import { Button } from "@/components/ui/button"
import { Field, FieldLabel } from "@/components/ui/field"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group"
import {
  Popover,
  PopoverClose,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import {
  CheckIcon,
  ClockCountdownIcon,
  MagnifyingGlassIcon,
  PlusIcon,
  XIcon,
} from "@/components/ui/icons"
import { paths } from "@/config/paths"
import { useUser } from "@/lib/auth"
import { gestionAcademicaInformesRoute } from "@/router"

import { useGuardarInformeMutation } from "@/features/academic-management/reports/api/mutations/use-guardar-informe"
import {
  useEliminarObservacionMutation,
  useGuardarObservacionMutation,
} from "@/features/academic-management/reports/api/mutations/use-observacion"
import {
  useCambiosPendientesQuery,
  usePlanillasPendientesQuery,
} from "@/features/academic-management/reports/api/query/use-alertas-query"
import { useGruposPeriodoQuery } from "@/features/academic-management/reports/api/query/use-grupos-periodo-query"
import { useHistorialQuery } from "@/features/academic-management/reports/api/query/use-historial-query"
import { useInformeGrupoQuery } from "@/features/academic-management/reports/api/query/use-informe-grupo-query"
import { useUltimaActualizacionQuery } from "@/features/academic-management/reports/api/query/use-ultima-actualizacion-query"
import { usePeriodosInformeQuery } from "@/features/academic-management/reports/api/query/use-periodos-informe-query"
import type { InformesSearch } from "@/features/academic-management/reports/api/schema"
import {
  PERIODO_FINAL_ID,
  type FilaInforme,
} from "@/features/academic-management/reports/api/types"
import {
  agruparPorEstudiante,
  columnasDeFilas,
  etiquetaPeriodo,
} from "@/features/academic-management/reports/utils/agrupar-filas"
import {
  marcaKey,
  resolverObjetivos,
  sinMarcasDe,
  type MarcasPeriodo,
} from "@/features/academic-management/reports/utils/periodos-marcados"
import { GradesTable } from "@/features/academic-management/reports/components/table/grades-table"
import { HistorialCambiosSheet } from "@/features/academic-management/reports/components/sheets/historial-cambios-sheet"
import {
  InformeFiltros,
  type FiltrosInforme,
} from "@/features/academic-management/reports/components/informe-filtros"
import { useMenuPermission } from "@/features/navigation/api/use-menu-permission"
import {
  DialogDescargarTabla,
  DialogGenerarBoletin,
  type EstudianteBoletin,
} from "@/features/academic-management/reports/components/dialogs/dialog-export-informe"
import { ObservacionesTable } from "@/features/academic-management/reports/components/table/observaciones-table"
import { ObservacionSheet } from "@/features/academic-management/reports/components/sheets/observacion-sheet"
import { useStudyPlanSubjectLabel } from "@/features/establishment/academic-period/api/query/use-study-plan-subject-label"
import {
  PendingChangesBanners,
  type DestinoPlanilla,
} from "@/features/academic-management/reports/components/pending-changes-banners"
import { PeriodoFilter } from "@/features/academic-management/reports/components/periodo-filter"
import { getErrorMessage } from "@/lib/api-client"
import { useOnlineOnly } from "@/lib/offline/use-online-only"
import { QUEUED_MESSAGE } from "@/lib/offline/outbox/engine"
import { OnlineOnlyTooltip } from "@/components/offline/online-only-tooltip"
import { DatosDelBadge } from "@/components/offline/datos-del-badge"
import { OfflineEmptyState } from "@/components/offline/offline-empty-state"
import { TTL_OFFLINE } from "@/lib/offline/query-meta"
import { isOfflineWithoutData } from "@/lib/offline/query-status"
import { useConnectivity } from "@/lib/offline/use-connectivity"

const ROLES_SOLO_SUS_GRUPOS = ["CEVAL-DOCENTE", "CEVAL-DIRECTOR_GRUPO"]

const MAX_GRUPOS_ABIERTOS = 8

const PANEL_CLASS =
  "rounded-b-lg rounded-tr-lg border border-border bg-background p-4 group-data-[tabs-filled=true]/tabs:rounded-tr-none"

interface GruposAbiertosState {
  grupos: number[]
  tab?: number
}

function gruposAbiertosStorageKey(filtros: FiltrosInforme): string | null {
  if (filtros.sedeId == null || filtros.anio == null || filtros.jornadaId == null) return null
  return `informes-grupos-abiertos:${filtros.sedeId}:${filtros.anio}:${filtros.jornadaId}`
}

function leerGruposAbiertosGuardados(filtros: FiltrosInforme): GruposAbiertosState | null {
  const key = gruposAbiertosStorageKey(filtros)
  if (!key) return null
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed.grupos)) return null
    return parsed
  } catch {
    return null
  }
}

function guardarGruposAbiertos(filtros: FiltrosInforme, estado: GruposAbiertosState): void {
  const key = gruposAbiertosStorageKey(filtros)
  if (!key) return
  try {
    localStorage.setItem(key, JSON.stringify(estado))
  } catch {
    // localStorage no disponible (modo privado, cuota, etc.): se ignora.
  }
}

function coincide(fila: FilaInforme, busqueda: string): boolean {
  const texto = busqueda.trim().toLowerCase()
  if (!texto) return true
  return fila.nombreCompleto.toLowerCase().includes(texto) || (fila.documento ?? "").includes(texto)
}

interface GrupoTabContentProps {
  grupoId: number
  observacionLabel: string
  periodos: number[]
  busqueda: string
  onBusquedaChange: (texto: string) => void
  seleccionados: Set<number>
  onToggleEstudiante: (matriculaId: number) => void
  onSeleccionarTodos: (matriculaIds: number[]) => void
  onGuardar: () => void
  guardando: boolean
  onAbrirObservacion: (fila: FilaInforme) => void
  /** Permiso INFORMES/EDITAR y rol que no sea solo docente/director. */
  puedeEscribir: boolean
  /** Lo seleccionado (y marcado) tiene notas pendientes por consolidar. */
  hayPorConsolidar: boolean
  /** Varios períodos reales a la vista: check por período en "Pe". */
  mostrarMarcas: boolean
  marcas: MarcasPeriodo
  onToggleMarca: (matriculaId: number, periodoId: number) => void
}

/** Celda consolidable: pendiente, sin error de configuración y de período abierto. */
function celdaConsolidable(
  fila: FilaInforme,
  asignatura: FilaInforme["asignaturas"][number],
  periodosCerrados: number[],
): boolean {
  return (
    fila.modoPeriodo === "real" &&
    !periodosCerrados.includes(fila.periodoId) &&
    !asignatura.errorConfiguracion &&
    (asignatura.estado === "proyectada" || asignatura.estado === "cambio_propuesto")
  )
}

/** Cualitativo = todas las filas del grupo; se calcula sin el filtro del buscador. */
function grupoEsCualitativo(filas: FilaInforme[] | undefined): boolean {
  return (filas?.length ?? 0) > 0 && filas!.every((fila) => fila.formato === "cualitativo")
}

function GrupoTabContent({
  grupoId,
  observacionLabel,
  periodos,
  busqueda,
  onBusquedaChange,
  seleccionados,
  onToggleEstudiante,
  onSeleccionarTodos,
  onGuardar,
  guardando,
  onAbrirObservacion,
  puedeEscribir,
  hayPorConsolidar,
  mostrarMarcas,
  marcas,
  onToggleMarca,
}: GrupoTabContentProps) {
  const soloEnLinea = useOnlineOnly()
  const informe = useInformeGrupoQuery(periodos.length > 0 ? { grupoId, periodos } : null)
  // Columna "Actualizado": aparte del listado, que reutilizan reporte y boletines.
  const ultimaActualizacion = useUltimaActualizacionQuery(
    periodos.length > 0 ? { grupoId, periodos } : null,
  )
  const { status: conectividad } = useConnectivity()
  const informeSinDatosOffline = periodos.length > 0 && isOfflineWithoutData(informe, conectividad)

  const filas = (informe.data ?? []).filter((fila) => coincide(fila, busqueda))
  const estudiantes = agruparPorEstudiante(filas)
  const columnas = columnasDeFilas(filas)

  const esCualitativo = grupoEsCualitativo(informe.data)

  if (periodos.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        Selecciona al menos un período para ver el informe.
      </p>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <Field orientation="vertical" variant="outlined" className="min-w-0 flex-1">
          <FieldLabel htmlFor={`buscar-estudiante-${grupoId}`}>
            Buscar estudiante por nombre y documento
          </FieldLabel>
          <InputGroup className="h-10 w-full rounded-md border-input has-[[data-slot=input-group-control]:focus-visible]:border-ring has-[[data-slot=input-group-control]:focus-visible]:ring-2 has-[[data-slot=input-group-control]:focus-visible]:ring-ring/20">
            <InputGroupAddon align="inline-start" className="ml-2">
              <MagnifyingGlassIcon className="size-4 text-muted-foreground" />
            </InputGroupAddon>
            <InputGroupInput
              id={`buscar-estudiante-${grupoId}`}
              type="search"
              autoComplete="off"
              placeholder="Buscar por"
              value={busqueda}
              onChange={(e) => onBusquedaChange(e.target.value)}
              className="min-w-32 [&::-webkit-search-cancel-button]:appearance-none"
            />
            <InputGroupAddon align="inline-end" className="mr-1 gap-1">
              {busqueda !== "" && (
                <InputGroupButton
                  size="icon-xs"
                  variant="ghost"
                  color="muted"
                  aria-label="Limpiar búsqueda"
                  onClick={() => onBusquedaChange("")}
                >
                  <XIcon />
                </InputGroupButton>
              )}
            </InputGroupAddon>
          </InputGroup>
        </Field>
        {puedeEscribir && !esCualitativo && hayPorConsolidar && (
          <OnlineOnlyTooltip tooltip={soloEnLinea.tooltip}>
            <Button type="button" color="primary" size="sm" disabled={guardando || soloEnLinea.disabled} onClick={onGuardar}>
              <CheckIcon data-icon="inline-start" />
              Guardar notas seleccionadas
            </Button>
          </OnlineOnlyTooltip>
        )}
      </div>

      <DatosDelBadge updatedAt={informe.dataUpdatedAt} ttl={TTL_OFFLINE.grupo} className="mt-2" />
      {informeSinDatosOffline && <OfflineEmptyState kind="sinDatosGuardados" onRetry={() => informe.refetch()} />}
      {informe.isPending && !informeSinDatosOffline && (
        <p className="py-8 text-center text-sm text-muted-foreground">Cargando informe…</p>
      )}
      {informe.isError && !informeSinDatosOffline && (
        <p className="py-8 text-center text-sm text-red">{getErrorMessage(informe.error)}</p>
      )}
      {!informe.isPending &&
        !informe.isError &&
        (esCualitativo ? (
          <ObservacionesTable
            estudiantes={estudiantes}
            columnaLabel={observacionLabel}
            seleccionados={seleccionados}
            onToggleEstudiante={onToggleEstudiante}
            onToggleTodos={() => onSeleccionarTodos(estudiantes.map((e) => e.matriculaId))}
            onAbrirObservacion={onAbrirObservacion}
            mostrarMarcas={mostrarMarcas}
            marcas={marcas}
            onToggleMarca={onToggleMarca}
            fechas={ultimaActualizacion.data}
          />
        ) : (
          <GradesTable
            estudiantes={estudiantes}
            columnas={columnas}
            seleccionados={seleccionados}
            onToggleEstudiante={onToggleEstudiante}
            onToggleTodos={() => onSeleccionarTodos(estudiantes.map((e) => e.matriculaId))}
            mostrarMarcas={mostrarMarcas}
            marcas={marcas}
            onToggleMarca={onToggleMarca}
            fechas={ultimaActualizacion.data}
          />
        ))}
    </div>
  )
}

function ReportsPageContent() {
  const { notify } = useNotify()
  const usuario = useUser()
  const navigate = gestionAcademicaInformesRoute.useNavigate()
  const search = gestionAcademicaInformesRoute.useSearch()

  const setSearch = React.useCallback(
    (cambios: Partial<InformesSearch>) => {
      navigate({ search: (prev) => ({ ...prev, ...cambios }), replace: true })
    },
    [navigate],
  )

  const filtros = React.useMemo<FiltrosInforme>(
    () => ({
      sedeId: search.sede ?? null,
      anio: search.anio ?? null,
      jornadaId: search.jornada ?? null,
    }),
    [search.sede, search.anio, search.jornada],
  )

  const setFiltros = React.useCallback(
    (nuevos: FiltrosInforme) => {
      const cambio =
        nuevos.sedeId !== filtros.sedeId ||
        nuevos.anio !== filtros.anio ||
        nuevos.jornadaId !== filtros.jornadaId
      setSearch({
        sede: nuevos.sedeId ?? undefined,
        anio: nuevos.anio ?? undefined,
        jornada: nuevos.jornadaId ?? undefined,
        // Periodos y grupos cuelgan de la cascada: no se arrastran a otra combinación.
        ...(cambio && { periodos: undefined, grupos: undefined, tab: undefined }),
      })
    },
    [setSearch, filtros],
  )

  const periodosQuery = usePeriodosInformeQuery(filtros)
  const gruposQuery = useGruposPeriodoQuery(filtros)

  const periodos = React.useMemo(() => search.periodos ?? [], [search.periodos])
  const periodosReales = React.useMemo(
    () => periodos.filter((id) => id !== PERIODO_FINAL_ID),
    [periodos],
  )
  const gruposAbiertosIds = React.useMemo(() => search.grupos ?? [], [search.grupos])
  const activeTab = search.tab != null ? String(search.tab) : ""

  const setPeriodos = React.useCallback(
    (ids: number[]) => setSearch({ periodos: ids.length > 0 ? ids : undefined }),
    [setSearch],
  )

  const setActiveTab = React.useCallback(
    (id: number | undefined) => {
      setSearch({ tab: id })
      guardarGruposAbiertos(filtros, { grupos: gruposAbiertosIds, tab: id })
    },
    [setSearch, filtros, gruposAbiertosIds],
  )
  const setGruposAbiertos = React.useCallback(
    (ids: number[], tab?: number) => {
      setSearch({ grupos: ids.length > 0 ? ids : undefined, ...(tab != null && { tab }) })
      guardarGruposAbiertos(filtros, {
        grupos: ids,
        tab: tab ?? (activeTab !== "" ? Number(activeTab) : undefined),
      })
    },
    [setSearch, filtros, activeTab],
  )

  const roles = usuario.data?.roles ?? []
  const soloSusGrupos =
    roles.length > 0 && roles.every((rol) => ROLES_SOLO_SUS_GRUPOS.includes(rol))

  const [historialAbierto, setHistorialAbierto] = React.useState(false)
  const [agregarAbierto, setAgregarAbierto] = React.useState(false)
  const [busqueda, setBusqueda] = React.useState("")
  const [seleccionPorGrupo, setSeleccionPorGrupo] = React.useState<Record<number, Set<number>>>({})
  const [marcasPorGrupo, setMarcasPorGrupo] = React.useState<Record<number, MarcasPeriodo>>({})
  const [observacionAbierta, setObservacionAbierta] = React.useState<FilaInforme | null>(null)

  const periodosDisponibles = React.useMemo(() => periodosQuery.data ?? [], [periodosQuery.data])
  const grupos = React.useMemo(() => gruposQuery.data ?? [], [gruposQuery.data])

  React.useEffect(() => {
    if (periodosDisponibles.length === 0) return
    const validos = periodos.filter(
      (id) => id === PERIODO_FINAL_ID || periodosDisponibles.some((p) => p.id === id),
    )
    if (validos.length === periodos.length && validos.length > 0) return
    const enCurso = periodosDisponibles.filter((p) => p.enCurso).map((p) => p.id)
    setPeriodos(
      validos.length > 0 ? validos : enCurso.length > 0 ? enCurso : [periodosDisponibles[0].id],
    )
  }, [periodosDisponibles, periodos, setPeriodos])

  React.useEffect(() => {
    if (grupos.length === 0) return
    const vigentes = gruposAbiertosIds.filter((id) => grupos.some((g) => g.grupoId === id))
    const guardados = gruposAbiertosIds.length === 0 ? leerGruposAbiertosGuardados(filtros) : null
    const guardadosVigentes =
      guardados?.grupos.filter((id) => grupos.some((g) => g.grupoId === id)) ?? []
    const abiertos =
      vigentes.length > 0
        ? vigentes
        : guardadosVigentes.length > 0
          ? guardadosVigentes
          : [grupos[0].grupoId]
    const tabGuardado =
      guardados?.tab != null && abiertos.includes(guardados.tab) ? guardados.tab : undefined
    const tabVigente = abiertos.includes(Number(activeTab))
      ? undefined
      : (tabGuardado ?? abiertos[0])
    if (vigentes.length === gruposAbiertosIds.length && vigentes.length > 0 && tabVigente == null) {
      return
    }
    setGruposAbiertos(abiertos, tabVigente)
  }, [grupos, gruposAbiertosIds, activeTab, filtros, setGruposAbiertos])

  const cascadaCompleta =
    filtros.sedeId != null && filtros.anio != null && filtros.jornadaId != null

  const gruposAbiertos = grupos.filter((g) => gruposAbiertosIds.includes(g.grupoId))
  const gruposDisponibles = grupos.filter((g) => !gruposAbiertosIds.includes(g.grupoId))
  const topeAlcanzado = gruposAbiertosIds.length >= MAX_GRUPOS_ABIERTOS
  const grupoActivoId = Number(activeTab)
  const gradoActivoId = grupos.find((g) => g.grupoId === grupoActivoId)?.gradoId

  // Misma key que el tab activo (se deduplica); sin filtro del buscador.
  const informeActivo = useInformeGrupoQuery(
    grupoActivoId > 0 && periodos.length > 0 ? { grupoId: grupoActivoId, periodos } : null,
  )
  const esCualitativoActivo = grupoEsCualitativo(informeActivo.data)

  const { puedeEditar } = useMenuPermission("INFORMES")
  // Docente / director de grupo solo consultan: consolidar y redactar
  // observaciones es de coordinación, aunque el menú les dé EDITAR.
  const puedeEscribir = puedeEditar && !soloSusGrupos
  const periodosCerrados = periodosDisponibles.filter((p) => p.cerrado).map((p) => p.id)
  const observacionLabel = useStudyPlanSubjectLabel(gradoActivoId, esCualitativoActivo)

  const alertasParams = { grupos: gruposAbiertosIds, periodos }
  const planillasPendientes = usePlanillasPendientesQuery(alertasParams)
  const cambiosPendientes = useCambiosPendientesQuery(alertasParams)
  const historial = useHistorialQuery(
    {
      grupos: grupoActivoId > 0 ? [grupoActivoId] : [],
      periodos: periodosReales,
      anio: filtros.anio ?? undefined,
    },
    historialAbierto && grupoActivoId > 0,
  )

  const guardarInforme = useGuardarInformeMutation()
  const guardarObservacion = useGuardarObservacionMutation()
  const eliminarObservacion = useEliminarObservacionMutation()

  const seleccionActiva = seleccionPorGrupo[grupoActivoId] ?? new Set<number>()

  const etiquetaFiltros = (() => {
    const grupo = grupos.find((g) => g.grupoId === grupoActivoId)
    const nombres = periodos.map((id) =>
      id === PERIODO_FINAL_ID
        ? "Final"
        : (periodosDisponibles.find((p) => p.id === id)?.nombre ?? String(id)),
    )
    const partes: string[] = []
    if (grupo) partes.push(`Grupo: ${grupo.grupoEtiqueta}`)
    if (nombres.length > 0) partes.push(`Períodos: ${nombres.join(", ")}`)
    if (busqueda.trim()) partes.push(`Búsqueda: ${busqueda.trim()}`)
    return partes.join("   ·   ")
  })()

  // Checks de período (columna "Pe"): solo aplican con varios períodos a la vista.
  const mostrarMarcas = periodosReales.length > 1
  const marcasActivas = mostrarMarcas
    ? (marcasPorGrupo[grupoActivoId] ?? new Set<string>())
    : new Set<string>()

  // Sin filtrar: un seleccionado oculto por el buscador igual se incluye.
  const datosActivos = informeActivo.data ?? []
  const filaDe = (matriculaId: number, periodoId: number) =>
    datosActivos.find((f) => f.matriculaId === matriculaId && f.periodoId === periodoId)

  // Por período, solo matrículas consolidables; nunca período cerrado ni Final (-1).
  const paraGuardar = resolverObjetivos(datosActivos, seleccionActiva, marcasActivas, "todos")
  const lotesGuardar = periodosReales
    .filter((periodoId) => !periodosCerrados.includes(periodoId))
    .map((periodoId) => ({
      periodoId,
      matriculas: paraGuardar.objetivos
        .filter((o) => o.periodoId === periodoId)
        .map((o) => o.matriculaId)
        .filter((matriculaId) => {
          const fila = filaDe(matriculaId, periodoId)
          return fila?.asignaturas.some((a) => celdaConsolidable(fila, a, periodosCerrados)) ?? false
        }),
    }))
    .filter((lote) => lote.matriculas.length > 0)

  // Boletín: un estudiante en un período; con varios hay que marcarlo.
  const paraBoletin = resolverObjetivos(datosActivos, seleccionActiva, marcasActivas, "unico")
  const estudiantesBoletin: EstudianteBoletin[] = paraBoletin.objetivos.flatMap((o) => {
    const fila = filaDe(o.matriculaId, o.periodoId)
    if (!fila) return []
    const esPreescolar = fila.formato === "cualitativo"
    return [
      {
        matriculaId: fila.matriculaId,
        nombre: fila.nombreCompleto,
        periodoId: fila.periodoId,
        periodoEtiqueta: etiquetaPeriodo(fila),
        esPreescolar,
        sinConsolidar: !esPreescolar && !fila.consolidado,
        soloBorrador: esPreescolar && fila.observacionEstado === "BORRADOR",
      },
    ]
  })
  const listoParaBoletin = estudiantesBoletin.length > 0 && paraBoletin.sinPeriodo.length === 0
  const sinPeriodoNombres = paraBoletin.sinPeriodo
    .slice(0, 5)
    .map((id) => datosActivos.find((f) => f.matriculaId === id)?.nombreCompleto ?? String(id))
  const sinPeriodoResto = paraBoletin.sinPeriodo.length - sinPeriodoNombres.length
  const motivoBoletin =
    paraBoletin.sinPeriodo.length > 0
      ? `Hay varios períodos a la vista: marca en la columna Pe el período del boletín de ${sinPeriodoNombres.join(", ")}${sinPeriodoResto > 0 ? ` y ${sinPeriodoResto} más` : ""}.`
      : null

  function toggleEstudiante(matriculaId: number) {
    const estaba = seleccionActiva.has(matriculaId)
    setSeleccionPorGrupo((prev) => {
      const next = new Set(prev[grupoActivoId] ?? [])
      if (next.has(matriculaId)) next.delete(matriculaId)
      else next.add(matriculaId)
      return { ...prev, [grupoActivoId]: next }
    })
    // Al deseleccionar se limpian sus checks de período.
    if (estaba) {
      setMarcasPorGrupo((prev) => ({
        ...prev,
        [grupoActivoId]: sinMarcasDe(prev[grupoActivoId] ?? new Set(), matriculaId),
      }))
    }
  }

  function seleccionarTodos(matriculaIds: number[]) {
    const actual = seleccionActiva
    const todosMarcados = matriculaIds.length > 0 && matriculaIds.every((id) => actual.has(id))
    setSeleccionPorGrupo((prev) => ({
      ...prev,
      [grupoActivoId]: todosMarcados ? new Set() : new Set(matriculaIds),
    }))
    if (todosMarcados) setMarcasPorGrupo((prev) => ({ ...prev, [grupoActivoId]: new Set() }))
  }

  function toggleMarca(matriculaId: number, periodoId: number) {
    setMarcasPorGrupo((prev) => {
      const next = new Set(prev[grupoActivoId] ?? [])
      const key = marcaKey(matriculaId, periodoId)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return { ...prev, [grupoActivoId]: next }
    })
  }

  /** "Ir a consolidar": selecciona solo los pendientes y marca su período. */
  function irAConsolidar(pendientes: { matriculaId: number; periodoId: number }[]) {
    setSeleccionPorGrupo((prev) => ({
      ...prev,
      [grupoActivoId]: new Set(pendientes.map((p) => p.matriculaId)),
    }))
    setMarcasPorGrupo((prev) => ({
      ...prev,
      [grupoActivoId]: new Set(pendientes.map((p) => marcaKey(p.matriculaId, p.periodoId))),
    }))
  }

  async function handleGuardar() {
    if (!puedeEscribir) return
    if (seleccionActiva.size === 0) {
      notify("Selecciona al menos un estudiante para consolidar.", { variant: "error" })
      return
    }
    // El endpoint consolida un período a la vez.
    const lotes = lotesGuardar
    if (lotes.length === 0) {
      notify("No hay notas pendientes por consolidar en lo seleccionado.", { variant: "error" })
      return
    }
    const nombrePeriodo = (id: number) =>
      periodosDisponibles.find((p) => p.id === id)?.nombre ?? String(id)
    const resultados = await Promise.allSettled(
      lotes.map((lote) =>
        guardarInforme.mutateAsync({
          grupoId: grupoActivoId,
          periodoId: lote.periodoId,
          matriculas: lote.matriculas,
        }),
      ),
    )
    const fallidos = resultados.flatMap((r, i) =>
      r.status === "rejected"
        ? [`${nombrePeriodo(lotes[i].periodoId)}: ${getErrorMessage(r.reason)}`]
        : [],
    )
    const filas = resultados.flatMap((r) => (r.status === "fulfilled" ? r.value : []))
    if (fallidos.length > 0) {
      const okPeriodos = resultados.length - fallidos.length
      notify(
        `${okPeriodos > 0 ? `Se consolidaron ${okPeriodos} de ${resultados.length} períodos. ` : ""}No se pudo consolidar — ${fallidos.join(" · ")}`,
        { variant: "error" },
      )
      return
    }
    // Misma regla que fn_informe_periodo_guardar (`IF v_g + v_a > 0`).
    const escribio = (d: (typeof filas)[number]) => d.guardadas + d.actualizadas > 0
    const consolidados = new Set(filas.filter(escribio).map((d) => d.matriculaId)).size
    const sinProyeccion = new Set(
      filas.filter((d) => !escribio(d) && d.sinProyeccion > 0).map((d) => d.matriculaId),
    ).size
    if (consolidados === 0 && sinProyeccion > 0) {
      notify("No hay actividades calificadas para consolidar en lo seleccionado.", {
        variant: "error",
      })
      return
    }
    if (consolidados === 0) {
      notify("Lo seleccionado ya estaba consolidado: no hubo cambios.")
      return
    }
    notify(
      `Se consolidaron ${consolidados} estudiante${consolidados === 1 ? "" : "s"}${
        sinProyeccion > 0 ? ` (${sinProyeccion} sin proyección)` : ""
      }.`,
    )
  }

  async function handleGuardarObservacion(
    fila: FilaInforme,
    texto: string,
    borrador: { texto: string; observacionesOrigen: number } | null,
  ) {
    if (!puedeEscribir) return
    const limpio = texto.trim()
    const periodoId = fila.modoPeriodo === "final" ? null : fila.periodoId
    try {
      if (limpio === "") {
        if (fila.observacion) {
          const r = await eliminarObservacion.mutateAsync({
            matriculaId: fila.matriculaId,
            periodoId,
          })
          notify(r.queued ? QUEUED_MESSAGE : "Observación eliminada.")
        }
      } else {
        const r = await guardarObservacion.mutateAsync({
          matriculaId: fila.matriculaId,
          periodoId,
          observacion: limpio,
          observacionIa: borrador?.texto,
          observacionesOrigen: borrador?.observacionesOrigen,
        })
        notify(r.queued ? QUEUED_MESSAGE : "Observación guardada.")
      }
      setObservacionAbierta(null)
    } catch (error) {
      // Con NoticeProvider el toast global de axios está suprimido.
      notify(getErrorMessage(error), { variant: "error" })
    }
  }

  function handleAgregarGrupo(grupoId: number) {
    if (gruposAbiertosIds.length >= MAX_GRUPOS_ABIERTOS) return
    setGruposAbiertos([...gruposAbiertosIds, grupoId], grupoId)
  }

  function handleCerrarGrupo(grupoId: number) {
    if (gruposAbiertosIds.length <= 1) return
    const restantes = gruposAbiertosIds.filter((id) => id !== grupoId)
    setGruposAbiertos(restantes, String(grupoId) === activeTab ? restantes[0] : undefined)
  }

  function handleIrAPlanilla(destino: DestinoPlanilla) {
    navigate({
      to: paths.app.gestionAcademicaInformesPlanilla.getHref(
        destino.grupoId,
        destino.asignaturaId,
        destino.periodoId,
      ),
      // `to` es un href armado: el search no se tipa contra la ruta de la planilla.
      search: { ...search, filtro: destino.etiqueta } as typeof search,
    })
  }

  return (
    <TableScreen>
      <TableScreenHeader>
        <TableScreenTitle description="Consulta, sincroniza y genera boletines del período">
          Informe y consolidados
        </TableScreenTitle>
        <NoticeOutlet className="mx-(--screen-spacing) my-4" />
      </TableScreenHeader>

      <TableScreenBody>
        <InformeFiltros filtros={filtros} onChange={setFiltros} />
        <Separator className="my-4" />

        <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
          <PeriodoFilter
            periodos={periodosDisponibles}
            seleccionados={periodos}
            onChange={setPeriodos}
            cargando={cascadaCompleta && periodosQuery.isPending}
            mensajeVacio={
              cascadaCompleta
                ? "No hay períodos de evaluación para esta combinación."
                : "Seleccione sede, año y jornada."
            }
          />

          <div className="flex items-center gap-2">
            <DialogGenerarBoletin
              grupoId={gruposAbiertos.length > 0 ? grupoActivoId : null}
              estudiantes={estudiantesBoletin}
              listo={listoParaBoletin}
              motivoNoListo={motivoBoletin}
              onIrAConsolidar={irAConsolidar}
            />
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    variant="outline"
                    color="neutral"
                    size="icon-sm"
                    aria-label="Historial de cambios"
                    onClick={() => setHistorialAbierto(true)}
                  />
                }
              >
                <ClockCountdownIcon />
              </TooltipTrigger>
              <TooltipContent>Historial de cambios</TooltipContent>
            </Tooltip>
            <DialogDescargarTabla
              grupoId={gruposAbiertos.length > 0 ? grupoActivoId : null}
              periodos={periodos}
              search={busqueda}
              filtersLabel={etiquetaFiltros}
            />
          </div>
        </div>

        <PendingChangesBanners
          planillasPendientes={planillasPendientes.data ?? []}
          cambiosPendientes={cambiosPendientes.data ?? []}
          onIrAPlanilla={handleIrAPlanilla}
        />

        <HistorialCambiosSheet
          open={historialAbierto}
          onOpenChange={setHistorialAbierto}
          cambios={historial.data ?? []}
          cargando={historial.isPending}
        />

        <ObservacionSheet
          fila={observacionAbierta}
          etiqueta={observacionLabel}
          guardando={guardarObservacion.isPending || eliminarObservacion.isPending}
          onOpenChange={(open) => !open && setObservacionAbierta(null)}
          onGuardar={handleGuardarObservacion}
          soloLecturaMotivo={
            // Periodo cerrado: el resumen de la IA se puede generar y guardar igual.
            !puedeEscribir ? "Solo lectura: no tienes permiso para editar observaciones." : null
          }
        />

        {!cascadaCompleta && (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Seleccione sede, año y jornada para ver el informe.
          </p>
        )}
        {cascadaCompleta && gruposQuery.isPending && (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Cargando grados y grupos…
          </p>
        )}
        {cascadaCompleta && !gruposQuery.isPending && grupos.length === 0 && (
          <p className="py-8 text-center text-sm text-muted-foreground">
            {soloSusGrupos
              ? "No diriges ningún grupo en esta sede, año y jornada."
              : "No hay grados ni grupos para la sede, el año y la jornada seleccionados."}
          </p>
        )}

        {gruposAbiertos.length > 0 && (
          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(Number(value))}>
            <TabsList variant="folder">
              {gruposAbiertos.map((grupo) => (
                <TabsTrigger key={grupo.grupoId} value={String(grupo.grupoId)}>
                  <span className="truncate">{grupo.grupoEtiqueta}</span>
                  {gruposAbiertos.length > 1 && (
                    <span
                      role="button"
                      tabIndex={0}
                      aria-label={`Cerrar pestaña ${grupo.grupoEtiqueta}`}
                      className="ml-2 inline-flex size-4 shrink-0 items-center justify-center rounded-sm text-muted-foreground hover:bg-muted hover:text-foreground"
                      onPointerDown={(e) => e.stopPropagation()}
                      onClick={(e) => {
                        e.stopPropagation()
                        handleCerrarGrupo(grupo.grupoId)
                      }}
                      onKeyDown={(e) => {
                        if (e.key !== "Enter" && e.key !== " ") return
                        e.preventDefault()
                        e.stopPropagation()
                        handleCerrarGrupo(grupo.grupoId)
                      }}
                    >
                      <XIcon className="size-3" />
                    </span>
                  )}
                </TabsTrigger>
              ))}
              <Popover open={agregarAbierto} onOpenChange={setAgregarAbierto}>
                <PopoverTrigger
                  render={
                    <button
                      type="button"
                      className="flex w-10 shrink-0 items-center justify-center border-l border-border text-muted-foreground hover:bg-muted/40 hover:text-foreground"
                      aria-label="Agregar grado/grupo"
                    />
                  }
                >
                  <PlusIcon />
                </PopoverTrigger>
                <PopoverContent align="start" className="w-64">
                  <PopoverClose aria-label="Cerrar">
                    <XIcon className="size-4" />
                  </PopoverClose>
                  <PopoverHeader className="pr-6">
                    <PopoverTitle className="text-sm normal-case">Agregar grado/grupo</PopoverTitle>
                  </PopoverHeader>
                  {topeAlcanzado ? (
                    <PopoverDescription className="text-xs">
                      Llegaste al máximo de {MAX_GRUPOS_ABIERTOS} pestañas. Cierra alguna para abrir
                      otra.
                    </PopoverDescription>
                  ) : gruposDisponibles.length === 0 ? (
                    <PopoverDescription className="text-xs">
                      Ya agregaste todos los grados/grupos disponibles.
                    </PopoverDescription>
                  ) : (
                    <div className="flex max-h-72 flex-col gap-1 overflow-y-auto">
                      {gruposDisponibles.map((grupo) => (
                        <button
                          key={grupo.grupoId}
                          type="button"
                          onClick={() => handleAgregarGrupo(grupo.grupoId)}
                          className="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-sm hover:bg-muted/40"
                        >
                          {grupo.grupoEtiqueta}
                          <PlusIcon className="size-3.5 text-muted-foreground" />
                        </button>
                      ))}
                    </div>
                  )}
                </PopoverContent>
              </Popover>
            </TabsList>
            {gruposAbiertos.map((grupo) => (
              <TabsContent
                key={grupo.grupoId}
                value={String(grupo.grupoId)}
                className={PANEL_CLASS}
              >
                {String(grupo.grupoId) === activeTab && (
                  <GrupoTabContent
                    grupoId={grupo.grupoId}
                    observacionLabel={observacionLabel}
                    periodos={periodos}
                    busqueda={busqueda}
                    onBusquedaChange={setBusqueda}
                    seleccionados={seleccionActiva}
                    onToggleEstudiante={toggleEstudiante}
                    onSeleccionarTodos={seleccionarTodos}
                    onGuardar={handleGuardar}
                    guardando={guardarInforme.isPending}
                    onAbrirObservacion={setObservacionAbierta}
                    puedeEscribir={puedeEscribir}
                    hayPorConsolidar={lotesGuardar.length > 0}
                    mostrarMarcas={mostrarMarcas}
                    marcas={marcasActivas}
                    onToggleMarca={toggleMarca}
                  />
                )}
              </TabsContent>
            ))}
          </Tabs>
        )}
      </TableScreenBody>
    </TableScreen>
  )
}

export function ReportsPage() {
  return (
    <NoticeProvider>
      <ReportsPageContent />
    </NoticeProvider>
  )
}
