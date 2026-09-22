import * as React from "react"

import { TableScreen, TableScreenBody, TableScreenHeader, TableScreenTitle } from "@/components/layout/table-screen"
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
  // ClockCountdownIcon, -- solo el ícono del botón de Historial de cambios, comentado abajo.
  FunnelIcon,
  MagnifyingGlassIcon,
  PlusIcon,
  XIcon,
} from "@/components/ui/icons"
import { paths } from "@/config/paths"
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
import { usePeriodosInformeQuery } from "@/features/academic-management/reports/api/query/use-periodos-informe-query"
import type { InformesSearch } from "@/features/academic-management/reports/api/schema"
import {
  PERIODO_FINAL_ID,
  type FilaInforme,
} from "@/features/academic-management/reports/api/types"
import {
  agruparPorEstudiante,
  columnasDeFilas,
} from "@/features/academic-management/reports/lib/agrupar-filas"
import { GradesTable } from "@/features/academic-management/reports/components/grades-table"
import { HistorialCambiosSheet } from "@/features/academic-management/reports/components/historial-cambios-sheet"
import {
  InformeFiltros,
  type FiltrosInforme,
} from "@/features/academic-management/reports/components/informe-filtros"
import {
  DialogDescargarTabla,
  DialogGenerarBoletin,
} from "@/features/academic-management/reports/components/dialog-export-informe"
import { ObservacionesTable } from "@/features/academic-management/reports/components/observaciones-table"
import { ObservacionSheet } from "@/features/academic-management/reports/components/observacion-sheet"
import {
  PendingChangesBanners,
  type DestinoPlanilla,
} from "@/features/academic-management/reports/components/pending-changes-banners"
import { PeriodoFilter } from "@/features/academic-management/reports/components/periodo-filter"

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
  return fila.nombreCompleto.toLowerCase().includes(texto) || fila.documento.includes(texto)
}

interface GrupoTabContentProps {
  grupoId: number
  periodos: number[]
  busqueda: string
  onBusquedaChange: (texto: string) => void
  seleccionados: Set<number>
  onToggleEstudiante: (matriculaId: number) => void
  onSeleccionarTodos: (matriculaIds: number[]) => void
  onGuardar: () => void
  guardando: boolean
  onAbrirObservacion: (fila: FilaInforme) => void
  /** El botón "Generar boletín" vive en la cabecera, fuera de este
   *  componente, pero solo el informe sabe si el grupo salió cualitativo
   *  (el boletín en PDF, por `boletin-preescolar.md`, solo imprime
   *  preescolar). */
  onEsCualitativoChange: (esCualitativo: boolean) => void
}

function GrupoTabContent({
  grupoId,
  periodos,
  busqueda,
  onBusquedaChange,
  seleccionados,
  onToggleEstudiante,
  onSeleccionarTodos,
  onGuardar,
  guardando,
  onAbrirObservacion,
  onEsCualitativoChange,
}: GrupoTabContentProps) {
  const informe = useInformeGrupoQuery(
    periodos.length > 0 ? { grupoId, periodos } : null,
  )

  const filas = React.useMemo(
    () => (informe.data ?? []).filter((fila) => coincide(fila, busqueda)),
    [informe.data, busqueda],
  )
  const estudiantes = React.useMemo(() => agruparPorEstudiante(filas), [filas])
  const columnas = React.useMemo(() => columnasDeFilas(filas), [filas])

  // Preescolar se decide por `formato`, no por el grupo: un grupo mixto sigue
  // siendo numérico y sus dimensiones cualitativas salen por asignatura.
  const esCualitativo = filas.length > 0 && filas.every((fila) => fila.formato === "cualitativo")

  React.useEffect(() => {
    onEsCualitativoChange(esCualitativo)
  }, [esCualitativo, onEsCualitativoChange])

  const haySinConsolidar = filas.some(
    (fila) =>
      seleccionados.has(fila.matriculaId) &&
      fila.modoPeriodo === "real" &&
      fila.asignaturas.some((a) => a.estado === "proyectada" || a.estado === "cambio_propuesto"),
  )

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
              <Tooltip>
                <TooltipTrigger
                  render={<InputGroupButton size="icon-xs" variant="ghost" color="muted" aria-label="Filtrar" />}
                >
                  <FunnelIcon />
                </TooltipTrigger>
                <TooltipContent>Filtrar</TooltipContent>
              </Tooltip>
            </InputGroupAddon>
          </InputGroup>
        </Field>
        {!esCualitativo && haySinConsolidar && (
          <Button type="button" color="primary" size="sm" disabled={guardando} onClick={onGuardar}>
            <CheckIcon data-icon="inline-start" />
            Guardar notas seleccionadas
          </Button>
        )}
      </div>

      {informe.isPending && (
        <p className="py-8 text-center text-sm text-muted-foreground">Cargando informe…</p>
      )}
      {informe.isError && (
        <p className="py-8 text-center text-sm text-red">
          No se pudo cargar el informe de este grupo.
        </p>
      )}
      {!informe.isPending &&
        !informe.isError &&
        (esCualitativo ? (
          <ObservacionesTable
            estudiantes={estudiantes}
            seleccionados={seleccionados}
            onToggleEstudiante={onToggleEstudiante}
            onToggleTodos={() => onSeleccionarTodos(estudiantes.map((e) => e.matriculaId))}
            onAbrirObservacion={onAbrirObservacion}
          />
        ) : (
          <GradesTable
            estudiantes={estudiantes}
            columnas={columnas}
            seleccionados={seleccionados}
            onToggleEstudiante={onToggleEstudiante}
            onToggleTodos={() => onSeleccionarTodos(estudiantes.map((e) => e.matriculaId))}
          />
        ))}
    </div>
  )
}

function ReportsPageContent() {
  const { notify } = useNotify()
  const navigate = gestionAcademicaInformesRoute.useNavigate()
  const search = gestionAcademicaInformesRoute.useSearch()

  // `replace`: marcar un período o cambiar de pestaña no es un paso de
  // navegación, y con `push` el botón atrás tendría que deshacer clic por clic.
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
      setSearch({
        sede: nuevos.sedeId ?? undefined,
        anio: nuevos.anio ?? undefined,
        jornada: nuevos.jornadaId ?? undefined,
      })
    },
    [setSearch],
  )

  const periodosQuery = usePeriodosInformeQuery(filtros)
  const gruposQuery = useGruposPeriodoQuery(filtros)

  const periodos = React.useMemo(() => search.periodos ?? [], [search.periodos])
  // El Final es un id más de `periodos`, no una bandera aparte: por eso se
  // puede dejar marcado solo él. Los reales se separan donde hace falta,
  // porque el boletín es de UN período del calendario y el Final no lo es.
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

  const [historialAbierto, setHistorialAbierto] = React.useState(false)
  // Una sola búsqueda para todas las pestañas, y no una por pestaña: el
  // botón de descargar vive en la cabecera y tiene que mandar el MISMO
  // texto que está filtrando la tabla, o el archivo no sería lo que se ve.
  const [busqueda, setBusqueda] = React.useState("")
  const [seleccionPorGrupo, setSeleccionPorGrupo] = React.useState<Record<number, Set<number>>>({})
  const [observacionAbierta, setObservacionAbierta] = React.useState<FilaInforme | null>(null)
  const [esCualitativoActivo, setEsCualitativoActivo] = React.useState(false)

  const periodosDisponibles = React.useMemo(() => periodosQuery.data ?? [], [periodosQuery.data])
  const grupos = React.useMemo(() => gruposQuery.data ?? [], [gruposQuery.data])

  // Cambiar de sede/año/jornada deja seleccionados períodos que ya no están en
  // la lista; si se vacía, el arranque vuelve a sembrar.
  React.useEffect(() => {
    if (periodosDisponibles.length === 0) return
    // El Final se da por válido siempre: no está en el catálogo de períodos
    // y sin esto la re-siembra lo barría, que es lo que hacía imposible
    // dejarlo marcado solo a él.
    const validos = periodos.filter(
      (id) => id === PERIODO_FINAL_ID || periodosDisponibles.some((p) => p.id === id),
    )
    if (validos.length === periodos.length && validos.length > 0) return
    // Si no queda ninguno vigente se siembra el período en curso.
    const enCurso = periodosDisponibles.filter((p) => p.enCurso).map((p) => p.id)
    setPeriodos(
      validos.length > 0 ? validos : enCurso.length > 0 ? enCurso : [periodosDisponibles[0].id],
    )
  }, [periodosDisponibles, periodos, setPeriodos])

  React.useEffect(() => {
    if (grupos.length === 0) return
    const vigentes = gruposAbiertosIds.filter((id) => grupos.some((g) => g.grupoId === id))
    // Sin nada en la URL: se intenta recordar lo que quedó abierto la última
    // vez para esta misma sede/año/jornada antes de caer al primer grupo.
    const guardados =
      gruposAbiertosIds.length === 0 ? leerGruposAbiertosGuardados(filtros) : null
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

  // La terna resuelve el período académico: sin ella los endpoints responden
  // 403/404, así que las queries van `enabled: false` — y una query apagada
  // queda en `isPending`, que sin este corte se vería como "cargando" eterno.
  const cascadaCompleta =
    filtros.sedeId != null && filtros.anio != null && filtros.jornadaId != null

  const gruposAbiertos = grupos.filter((g) => gruposAbiertosIds.includes(g.grupoId))
  const gruposDisponibles = grupos.filter((g) => !gruposAbiertosIds.includes(g.grupoId))
  const grupoActivoId = Number(activeTab)

  const alertasParams = { grupos: gruposAbiertosIds, periodos }
  const planillasPendientes = usePlanillasPendientesQuery(alertasParams)
  const cambiosPendientes = useCambiosPendientesQuery(alertasParams)
  // El historial es del grupo que se está viendo, no de todas las pestañas
  // abiertas: acompaña al informe que hay en pantalla, así que sigue a la
  // pestaña activa y se vuelve a pedir al cambiarla.
  // `periodosReales`: el historial guarda por período del calendario, así que
  // el centinela del Final no coincide con ninguna fila. Mandándolo, dejar
  // marcado solo el Final devolvía un historial vacío sin explicar por qué.
  //
  // Y el AÑO tiene que ir: la función lo usa para acotar el año lectivo y, si
  // no llega, cae al año CALENDARIO actual. Mirando 2025 —o en enero— el
  // historial salía vacío en silencio.
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

  // El membrete del archivo. Los filtros que viajan al backend son ids --son
  // los binds de la consulta-- y ahí saldrían como "Fk Tgrupo: 11474", que
  // nadie puede interpretar; los nombres están acá, así que la línea se manda
  // escrita. Se omite a propósito lo que es de la mecánica y no del
  // contenido: si el Final va incluido, se ve en la tabla.
  const etiquetaFiltros = React.useMemo(() => {
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
  }, [grupos, grupoActivoId, periodos, periodosDisponibles, busqueda])

  // Acta 19-sep-2026, punto 20.3: "para no reprocesar la tabla" el filtro de
  // arriba se deja multi-select como está (sirve para ver/consolidar varios
  // periodos a la vez) — pero un boletín es de UN periodo y UN estudiante.
  // Períodos REALES: el boletín lo arma /reportes/boletin-preescolar por
  // (grupo, período, estudiante), y el Final no es un período que ese PDF
  // sepa imprimir. Marcarlo no habilita ni deshabilita el botón.
  const listoParaBoletin = periodosReales.length === 1 && seleccionActiva.size === 1

  function toggleEstudiante(matriculaId: number) {
    setSeleccionPorGrupo((prev) => {
      const next = new Set(prev[grupoActivoId] ?? [])
      if (next.has(matriculaId)) next.delete(matriculaId)
      else next.add(matriculaId)
      return { ...prev, [grupoActivoId]: next }
    })
  }

  function seleccionarTodos(matriculaIds: number[]) {
    setSeleccionPorGrupo((prev) => {
      const actual = prev[grupoActivoId] ?? new Set<number>()
      const todosMarcados = matriculaIds.length > 0 && matriculaIds.every((id) => actual.has(id))
      return { ...prev, [grupoActivoId]: todosMarcados ? new Set() : new Set(matriculaIds) }
    })
  }

  async function handleGuardar() {
    if (seleccionActiva.size === 0) {
      notify("Selecciona al menos un estudiante para consolidar.", { variant: "error" })
      return
    }
    const matriculas = Array.from(seleccionActiva)
    try {
      // Un período por llamada: el endpoint no acepta arreglo a propósito.
      const detalles = await Promise.all(
        periodos.map((periodoId) =>
          guardarInforme.mutateAsync({ grupoId: grupoActivoId, periodoId, matriculas }),
        ),
      )
      const filas = detalles.flat()
      const consolidados = filas.filter(
        (d) => d.resultado === "guardada" || d.resultado === "actualizada",
      ).length
      const sinProyeccion = filas.filter((d) => d.resultado === "sin_proyeccion").length
      if (consolidados === 0 && sinProyeccion > 0) {
        notify("No hay actividades calificadas para consolidar en lo seleccionado.", {
          variant: "error",
        })
        return
      }
      notify(
        `Se consolidaron ${consolidados} estudiante${consolidados === 1 ? "" : "s"}${
          sinProyeccion > 0 ? ` (${sinProyeccion} sin proyección)` : ""
        }.`,
      )
    } catch {
      notify("No se pudieron consolidar las notas.", { variant: "error" })
    }
  }

  async function handleGuardarObservacion(
    fila: FilaInforme,
    texto: string,
    borrador: { texto: string; observacionesOrigen: number } | null,
  ) {
    const limpio = texto.trim()
    // La fila Final va contra su propio endpoint: `null` es lo que lo elige.
    // No es un período, así que su texto no vive en la tabla de períodos.
    const periodoId = fila.modoPeriodo === "final" ? null : fila.periodoId
    try {
      if (limpio === "") {
        if (fila.observacion) {
          await eliminarObservacion.mutateAsync({
            matriculaId: fila.matriculaId,
            periodoId,
          })
          notify("Observación eliminada.")
        }
      } else {
        await guardarObservacion.mutateAsync({
          matriculaId: fila.matriculaId,
          periodoId,
          observacion: limpio,
          observacionIa: borrador?.texto,
          observacionesOrigen: borrador?.observacionesOrigen,
        })
        notify("Observación guardada.")
      }
      setObservacionAbierta(null)
    } catch {
      notify("No se pudo guardar la observación.", { variant: "error" })
    }
  }

  function handleAgregarGrupo(grupoId: number) {
    setGruposAbiertos([...gruposAbiertosIds, grupoId], grupoId)
  }

  function handleCerrarGrupo(grupoId: number) {
    if (gruposAbiertosIds.length <= 1) return
    const restantes = gruposAbiertosIds.filter((id) => id !== grupoId)
    setGruposAbiertos(restantes, String(grupoId) === activeTab ? restantes[0] : undefined)
  }

  // La planilla se lleva el estado de la pantalla para poder devolverlo:
  // `Cancelar` y `Aprobar` vuelven acá y las pestañas siguen como estaban.
  function handleIrAPlanilla(destino: DestinoPlanilla) {
    navigate({
      to: paths.app.gestionAcademicaInformesPlanilla.getHref(
        destino.grupoId,
        destino.asignaturaId,
        destino.periodoId,
      ),
      search,
    })
  }

  return (
    <TableScreen>
      <TableScreenHeader>
        <TableScreenTitle description="Consulta, sincroniza y genera boletines del período">
          Informes y consolidación de calificaciones
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
              periodos={periodosReales}
              matriculas={[...seleccionActiva]}
              listo={listoParaBoletin}
              esPreescolar={esCualitativoActivo}
            />
            {/* Historial de cambios: no se va a mostrar de momento.
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
            */}
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
          guardando={guardarObservacion.isPending || eliminarObservacion.isPending}
          onOpenChange={(open) => !open && setObservacionAbierta(null)}
          onGuardar={handleGuardarObservacion}
        />

        {!cascadaCompleta && (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Seleccione sede, año y jornada para ver el informe.
          </p>
        )}
        {cascadaCompleta && gruposQuery.isPending && (
          <p className="py-8 text-center text-sm text-muted-foreground">Cargando grados y grupos…</p>
        )}
        {cascadaCompleta && !gruposQuery.isPending && grupos.length === 0 && (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No hay grados ni grupos para la sede, el año y la jornada seleccionados.
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
              <Popover>
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
                  {gruposDisponibles.length === 0 ? (
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
              <TabsContent key={grupo.grupoId} value={String(grupo.grupoId)} className={PANEL_CLASS}>
                {String(grupo.grupoId) === activeTab && (
                  <GrupoTabContent
                    grupoId={grupo.grupoId}
                    periodos={periodos}
                    busqueda={busqueda}
                    onBusquedaChange={setBusqueda}
                    seleccionados={seleccionActiva}
                    onToggleEstudiante={toggleEstudiante}
                    onSeleccionarTodos={seleccionarTodos}
                    onGuardar={handleGuardar}
                    guardando={guardarInforme.isPending}
                    onAbrirObservacion={setObservacionAbierta}
                    onEsCualitativoChange={setEsCualitativoActivo}
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
