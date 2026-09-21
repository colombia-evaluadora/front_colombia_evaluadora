"use no memo"

import * as React from "react"
import { Link } from "@tanstack/react-router"

import { TableScreen, TableScreenBody, TableScreenHeader, TableScreenTitle } from "@/components/layout/table-screen"
import { NoticeOutlet, NoticeProvider, useNotify } from "@/components/notice/notice-context"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Skeleton } from "@/components/ui/skeleton"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { ArrowLeftIcon, CheckCircleFillIcon, CheckIcon, SpinnerIcon } from "@/components/ui/icons"
import { DataTable } from "@/components/data-table"
import { Pagination } from "@/components/pagination"
import { useDataTable } from "@/hooks/use-data-table"

import { paths } from "@/config/paths"
import { asistenciaManualRoute } from "@/router"
import { useAsistenciaCalendarioQuery } from "@/features/academic-management/asistencia/api/query/use-asistencia-calendario-query"
import { useEsDocente } from "@/features/academic-management/asistencia/api/use-es-docente"
import { useAsistenciaRosterPorBloquesQuery } from "@/features/academic-management/asistencia/api/query/use-asistencia-roster-query"
import { useAsistenciaRegistrarMutation } from "@/features/academic-management/asistencia/api/mutations/use-asistencia-registrar-mutation"
import { useTipoAsistenciaCatalogQuery } from "@/features/academic-management/asistencia/api/query/use-tipo-asistencia-catalog-query"
import { buildColumnsAsistenciaManual } from "@/features/academic-management/asistencia/components/columns-asistencia-manual"
import type {
  AsistenciaRegistroManual,
  RosterEstudiante,
  TipoAsistencia,
} from "@/features/academic-management/asistencia/api/types/asistencia"
import { agruparPorBloquesContinuos, esFechaFutura, formatHora } from "@/features/academic-management/asistencia/api/ui-mappings"

const TIPOS_ALTA_NUEVA: TipoAsistencia[] = [1, 2, 5]
/** Espera esto sin más marcas antes de guardar solo — evita una petición por
 *  cada click mientras el docente sigue recorriendo la lista. */
const AUTOGUARDADO_DEBOUNCE_MS = 900
const ASISTIO: TipoAsistencia = 1
const NO_ASISTIO: TipoAsistencia = 2
const LLEGO_TARDE: TipoAsistencia = 5


const PANEL_CLASS =
  "rounded-b-lg rounded-tr-lg border border-border bg-background p-4 group-data-[tabs-filled=true]/tabs:rounded-tr-none"

interface SesionTab {
  id: string
  fkGrupo: number
  grado: string
  grupo: string
  jornada: string
  fkAsignatura: number
  asignatura: string
  bloque: number | null
  bloques: (number | null)[]
  horasPorBloque: Record<number, { horaInicio: string | null; horaFin: string | null }>
  horaInicio: string | null
  horaFin: string | null
  /** Grupo de Preescolar: la sesión es `actividad`, no `asignatura` -- ver `registrar`/roster mas abajo. */
  esFormativa: boolean
  fkActividad: number | null
  actividad: string | null
}

/** Nombre a mostrar en pestaña/encabezado: la actividad si es formativa, la asignatura si no. */
function nombreSesion(sesion: Pick<SesionTab, "esFormativa" | "actividad" | "asignatura">): string {
  return sesion.esFormativa ? (sesion.actividad ?? "Actividad") : sesion.asignatura
}

/** Por hora de inicio (ISO, ordena bien como string) — la agenda del docente
 *  es cronológica, no alfabética por nombre de asignatura. Sin hora (toma
 *  suelta o sesión formativa sin horario real) va al final. */
function compararPorHora(a: Pick<SesionTab, "horaInicio">, b: Pick<SesionTab, "horaInicio">): number {
  if (a.horaInicio == null && b.horaInicio == null) return 0
  if (a.horaInicio == null) return 1
  if (b.horaInicio == null) return -1
  return a.horaInicio.localeCompare(b.horaInicio)
}

function formatFechaLarga(fecha: string): string {
  const [anio, mes, dia] = fecha.split("-").map(Number)
  return new Date(anio, mes - 1, dia).toLocaleDateString("es-CO", { day: "numeric", month: "long" })
}

function formatEncabezadoSesion(fecha: string, horaInicio: string | null, horaFin: string | null): string {
  const fechaLabel = formatFechaLarga(fecha)
  if (!horaInicio || !horaFin) return fechaLabel
  return `${fechaLabel} (${formatHora(horaInicio)} - ${formatHora(horaFin)})`
}

function resolverArchivo(
  bloque: number | null,
  fkMatricula: number,
  soporte: Record<number, File>,
  soporteEliminado: Record<number, boolean>,
  rosterPorBloque: Map<number | null, RosterEstudiante[]>,
): File | number | undefined {
  if (soporteEliminado[fkMatricula]) return undefined
  const nuevo = soporte[fkMatricula]
  if (nuevo) return nuevo
  const existente = rosterPorBloque.get(bloque)?.find((r) => r.fk_tmatricula === fkMatricula)?.fk_soporte_archivo
  return existente ?? undefined
}

function registrosPorBloque(
  bloques: (number | null)[],
  seleccion: Record<number, TipoAsistencia>,
  bloqueTarde: Record<number, number>,
  soporte: Record<number, File>,
  soporteEliminado: Record<number, boolean>,
  rosterPorBloque: Map<number | null, RosterEstudiante[]>,
): Map<number | null, AsistenciaRegistroManual[]> {
  const porBloque = new Map<number | null, AsistenciaRegistroManual[]>(bloques.map((b) => [b, []]))
  const bloquesNumericos = bloques.filter((b): b is number => b !== null)

  for (const [fkMatriculaStr, tipo] of Object.entries(seleccion)) {
    const fkMatricula = Number(fkMatriculaStr)

    if (tipo === LLEGO_TARDE && bloquesNumericos.length > 1) {
      const bloqueLlegada = bloqueTarde[fkMatricula] ?? bloquesNumericos[0]
      for (const bloque of bloquesNumericos) {
        const tipoBloque: TipoAsistencia =
          bloque < bloqueLlegada ? NO_ASISTIO : bloque === bloqueLlegada ? LLEGO_TARDE : ASISTIO
        // El soporte de la tardanza va SOLO en el bloque marcado "Llegó
        // tarde" -- los bloques "No asistió"/"Asistió" generados por la
        // cascada no llevan justificación propia.
        const archivo =
          tipoBloque === LLEGO_TARDE
            ? resolverArchivo(bloque, fkMatricula, soporte, soporteEliminado, rosterPorBloque)
            : undefined
        porBloque.get(bloque)!.push({
          fkMatricula,
          tipoAsistencia: tipoBloque,
          ...(archivo !== undefined && { fkArchivo: archivo }),
        })
      }
      continue
    }

    // El soporte solo aplica a No asistió / Llegó tarde (única combinación
    // que la UI deja elegir) -- si `tipo` cambió a Asistió sin pasar por
    // "Marcar todo" (que sí limpia el borrador), un archivo que haya quedado
    // en `soporte` de una selección anterior no se re-envía.
    const admiteSoporte = tipo === NO_ASISTIO || tipo === LLEGO_TARDE
    for (const bloque of bloques) {
      const archivo = admiteSoporte
        ? resolverArchivo(bloque, fkMatricula, soporte, soporteEliminado, rosterPorBloque)
        : undefined
      porBloque.get(bloque)!.push({
        fkMatricula,
        tipoAsistencia: tipo,
        ...(archivo !== undefined && { fkArchivo: archivo }),
      })
    }
  }

  return porBloque
}

function registroAutoritativo(
  bloques: (number | null)[],
  rosterPorBloque: Map<number | null, RosterEstudiante[]>,
  fkMatricula: number,
): { bloque: number | null; row: RosterEstudiante } | undefined {
  let candidato: { bloque: number | null; row: RosterEstudiante } | undefined
  for (const bloque of bloques) {
    const row = rosterPorBloque.get(bloque)?.find((r) => r.fk_tmatricula === fkMatricula)
    if (!row || row.tipo_asistencia_valor == null) continue
    if (row.tipo_asistencia_valor === LLEGO_TARDE) return { bloque, row }
    candidato ??= { bloque, row }
  }
  return candidato
}

function SesionTabContent({ sesion, fecha }: { sesion: SesionTab; fecha: string }) {
  const { notify } = useNotify()
  const {
    porBloque: rosterPorBloque,
    isPending,
    isError,
    refetch,
  } = useAsistenciaRosterPorBloquesQuery(
    {
      GRUPO: sesion.fkGrupo,
      FECHA: fecha,
      // Sesión formativa (preescolar): el padrón/registro se identifican por
      // ACTIVIDAD, no por ASIGNATURA+BLOQUE.
      ...(sesion.esFormativa
        ? { ACTIVIDAD: sesion.fkActividad ?? undefined }
        : { ASIGNATURA: sesion.fkAsignatura }),
    },
    sesion.bloques,
  )
  const [seleccion, setSeleccion] = React.useState<Record<number, TipoAsistencia>>({})
  const [soporte, setSoporte] = React.useState<Record<number, File>>({})
  const [soporteEliminado, setSoporteEliminado] = React.useState<Record<number, boolean>>({})
  const [bloqueTarde, setBloqueTarde] = React.useState<Record<number, number>>({})
  const registrar = useAsistenciaRegistrarMutation()
  const { data: tipoOptionsCompleto = [] } = useTipoAsistenciaCatalogQuery()
  const tipoOptions = React.useMemo(
    () => tipoOptionsCompleto.filter((opt) => TIPOS_ALTA_NUEVA.includes(opt.value)),
    [tipoOptionsCompleto],
  )

  // El padrón (nombre/documento) es el mismo en cualquier bloque; el primero
  // alcanza para eso. Lo que SÍ varía por bloque es el estado guardado, así
  // que cada fila se reemplaza por su registro autoritativo (abajo) antes de
  // pasarla a la tabla.
  const primerBloqueRoster = React.useMemo(
    () => rosterPorBloque.get(sesion.bloque) ?? [],
    [rosterPorBloque, sesion.bloque],
  )
  const autoritativos = React.useMemo(() => {
    const mapa = new Map<number, { bloque: number | null; row: RosterEstudiante }>()
    for (const base of primerBloqueRoster) {
      const encontrado = registroAutoritativo(sesion.bloques, rosterPorBloque, base.fk_tmatricula)
      if (encontrado) mapa.set(base.fk_tmatricula, encontrado)
    }
    return mapa
  }, [primerBloqueRoster, rosterPorBloque, sesion.bloques])

  const roster_ = React.useMemo(
    () => primerBloqueRoster.map((base) => autoritativos.get(base.fk_tmatricula)?.row ?? base),
    [primerBloqueRoster, autoritativos],
  )

  const baseline = React.useRef<Record<number, TipoAsistencia>>({})
  const bloqueTardeBaseline = React.useRef<Record<number, number>>({})
  const precargado = React.useRef(false)
  React.useEffect(() => {
    if (precargado.current || isPending) return
    const inicialSeleccion: Record<number, TipoAsistencia> = {}
    const inicialBloqueTarde: Record<number, number> = {}
    for (const [fkMatricula, { bloque, row }] of autoritativos) {
      if (row.tipo_asistencia_valor == null) continue
      inicialSeleccion[fkMatricula] = row.tipo_asistencia_valor
      // Sin bloque real no hay "en cuál bloque llegó" que preseleccionar
      // (sesión suelta o de un solo bloque -- el selector ni se muestra).
      if (row.tipo_asistencia_valor === LLEGO_TARDE && bloque !== null) {
        inicialBloqueTarde[fkMatricula] = bloque
      }
    }
    baseline.current = inicialSeleccion
    bloqueTardeBaseline.current = inicialBloqueTarde
    if (Object.keys(inicialSeleccion).length > 0) setSeleccion(inicialSeleccion)
    if (Object.keys(inicialBloqueTarde).length > 0) setBloqueTarde(inicialBloqueTarde)
    precargado.current = true
  }, [isPending, autoritativos])
  const columns = React.useMemo(
    () =>
      buildColumnsAsistenciaManual({
        fechaLabel: formatEncabezadoSesion(fecha, sesion.horaInicio, sesion.horaFin),
        tipoOptions,
        seleccion,
        onChange: (fkMatricula, tipo) =>
          setSeleccion((prev) => ({ ...prev, [fkMatricula]: tipo })),
        soporte,
        onSoporteChange: (fkMatricula, archivo) => {
          setSoporte((prev) => {
            if (!archivo) {
              const { [fkMatricula]: _omitido, ...resto } = prev
              return resto
            }
            return { ...prev, [fkMatricula]: archivo }
          })
          if (archivo) {
            setSoporteEliminado((prev) => {
              if (!prev[fkMatricula]) return prev
              const { [fkMatricula]: _omitido, ...resto } = prev
              return resto
            })
          }
        },
        soporteEliminado,
        onSoporteEliminar: (fkMatricula) => {
          setSoporte((prev) => {
            const { [fkMatricula]: _omitido, ...resto } = prev
            return resto
          })
          setSoporteEliminado((prev) => ({ ...prev, [fkMatricula]: true }))
        },
        bloques: sesion.bloques.filter((b): b is number => b !== null),
        horasPorBloque: sesion.horasPorBloque,
        bloqueTarde,
        onBloqueTardeChange: (fkMatricula, bloque) =>
          setBloqueTarde((prev) => ({ ...prev, [fkMatricula]: bloque })),
      }),
    [
      fecha,
      sesion.horaInicio,
      sesion.horaFin,
      sesion.bloques,
      sesion.horasPorBloque,
      tipoOptions,
      seleccion,
      soporte,
      soporteEliminado,
      bloqueTarde,
    ],
  )

  const [pageIndex, setPageIndex] = React.useState(0)
  const [pageSize, setPageSize] = React.useState(10)
  const pageCount = Math.max(1, Math.ceil(roster_.length / pageSize))
  const rows = React.useMemo(
    () => roster_.slice(pageIndex * pageSize, pageIndex * pageSize + pageSize),
    [roster_, pageIndex, pageSize],
  )

  function handleSetPageSize(size: number) {
    setPageSize(size)
    setPageIndex(0)
  }

  const { table } = useDataTable({
    columns,
    data: rows,
    pageCount,
    getRowId: (row) => String(row.fk_tmatricula),
    pageIndex,
    pageSize,
    goToPage: setPageIndex,
    setPageSize: handleSetPageSize,
    sorting: [],
    setSorting: () => {},
    columnVisibilityStorageKey: "asistencia-manual-column-visibility",
  })

  const seleccionLista = React.useMemo(() => {
    const listos = Object.entries(seleccion).filter(([fkMatriculaStr, tipo]) => {
      if (tipo !== LLEGO_TARDE || sesion.bloques.length <= 1) return true
      return bloqueTarde[Number(fkMatriculaStr)] != null
    })
    return Object.fromEntries(listos) as Record<number, TipoAsistencia>
  }, [seleccion, bloqueTarde, sesion.bloques.length])
  const pendientesPorBloqueTarde = Object.keys(seleccion).length - Object.keys(seleccionLista).length

  const hayAlgoQueGuardar =
    Object.entries(seleccionLista).some(([fk, tipo]) => tipo !== baseline.current[Number(fk)]) ||
    Object.keys(soporte).some((fk) => Number(fk) in seleccionLista) ||
    Object.keys(soporteEliminado).some((fk) => Number(fk) in seleccionLista)
  const mostrarGuardar = hayAlgoQueGuardar


  function handleMarcarTodoAsistio() {
    setSeleccion(
      Object.fromEntries(roster_.map((est) => [est.fk_tmatricula, ASISTIO as TipoAsistencia])),
    )
    setBloqueTarde({})
    setSoporte({})
    setSoporteEliminado({})
  }

  const [autoguardando, setAutoguardando] = React.useState(false)

  async function guardar(avisarSiNada: boolean): Promise<void> {
    if (!hayAlgoQueGuardar) {
      if (avisarSiNada) {
        notify("Marca la asistencia de al menos un estudiante antes de guardar.", { variant: "error" })
      }
      return
    }
    const porBloque = registrosPorBloque(
      sesion.bloques,
      seleccionLista,
      bloqueTarde,
      soporte,
      soporteEliminado,
      rosterPorBloque,
    )
    const seleccionGuardada = seleccionLista
    setAutoguardando(true)
    try {
      await Promise.all(
        [...porBloque.entries()].map(([bloque, registros]) =>
          registrar.mutateAsync({
            GRUPO: sesion.fkGrupo,
            FECHA: fecha,
            REGISTROS: registros,
            ...(sesion.esFormativa
              ? { ACTIVIDAD: sesion.fkActividad ?? undefined }
              : { ASIGNATURA: sesion.fkAsignatura, BLOQUE: bloque }),
          }),
        ),
      )
      baseline.current = { ...baseline.current, ...seleccionGuardada }
      bloqueTardeBaseline.current = {
        ...bloqueTardeBaseline.current,
        ...Object.fromEntries(
          Object.entries(bloqueTarde).filter(([fk]) => Number(fk) in seleccionGuardada),
        ),
      }
      setSoporte((prev) => {
        const next = { ...prev }
        for (const fk of Object.keys(seleccionGuardada)) delete next[Number(fk)]
        return next
      })
      setSoporteEliminado((prev) => {
        const next = { ...prev }
        for (const fk of Object.keys(seleccionGuardada)) delete next[Number(fk)]
        return next
      })
    } catch {
      notify("Ocurrió un error al guardar la asistencia.", { variant: "error" })
    } finally {
      setAutoguardando(false)
    }
  }

  async function handleGuardar() {
    await guardar(true)
  }

  React.useEffect(() => {
    if (!hayAlgoQueGuardar) return
    const temporizador = setTimeout(() => {
      void guardar(false)
    }, AUTOGUARDADO_DEBOUNCE_MS)
    return () => clearTimeout(temporizador)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seleccion, bloqueTarde, soporte, soporteEliminado, hayAlgoQueGuardar])

  const guardarRef = React.useRef(guardar)
  guardarRef.current = guardar
  React.useEffect(() => {
    return () => {
      void guardarRef.current(false)
    }
  }, [])

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="font-semibold">{sesion.grado}{sesion.grupo}</span>
          <span className="rounded-sm bg-muted px-1 text-[10px] font-semibold text-muted-foreground">
            {sesion.jornada}
          </span>
          <span className="text-muted-foreground">·</span>
          <span className="font-medium">{nombreSesion(sesion)}</span>
        </div>
        <Button
          type="button"
          variant="outline"
          color="primary"
          size="sm"
          disabled={roster_.length === 0}
          onClick={handleMarcarTodoAsistio}
        >
          <CheckCircleFillIcon data-icon="inline-start" />
          Marcar todo como Asistió
        </Button>
      </div>

      <DataTable
        table={table}
        isPending={isPending}
        isError={isError}
        onRetry={refetch}
        emptyMessage="Este grupo no tiene estudiantes."
        errorMessage="Ocurrió un error al cargar el roster del grupo."
        cellClassName="py-1"
      />

      {roster_.length > 0 && (
        <Pagination
          pageIndex={pageIndex}
          pageCount={pageCount}
          canPrev={pageIndex > 0}
          canNext={pageIndex < pageCount - 1}
          onPageChange={setPageIndex}
          totalCount={roster_.length}
          pageSize={pageSize}
          onPageSizeChange={handleSetPageSize}
        />
      )}

      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground">
            {Object.keys(seleccion).length} de {roster_.length} estudiantes marcados
          </span>
          {autoguardando ? (
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <SpinnerIcon className="size-3 animate-spin" /> Guardando…
            </span>
          ) : (
            !hayAlgoQueGuardar &&
            Object.keys(seleccionLista).length > 0 && (
              <span className="flex items-center gap-1 text-xs text-emerald-600">
                <CheckIcon className="size-3" /> Guardado
              </span>
            )
          )}
          {pendientesPorBloqueTarde > 0 && (
            <span className="text-xs text-muted-foreground">
              {pendientesPorBloqueTarde === 1
                ? "1 estudiante espera el bloque de llegada"
                : `${pendientesPorBloqueTarde} estudiantes esperan el bloque de llegada`}
            </span>
          )}
        </div>
        {mostrarGuardar && (
          <Button
            type="button"
            color="primary"
            size="sm"
            disabled={registrar.isPending}
            aria-busy={registrar.isPending}
            onClick={handleGuardar}
          >
            {registrar.isPending ? (
              <SpinnerIcon data-icon="inline-start" className="animate-spin" />
            ) : (
              <CheckIcon data-icon="inline-start" />
            )}
            Guardar
          </Button>
        )}
      </div>
    </div>
  )
}

export function AsistenciaManualPage() {
  const { fecha, sede } = asistenciaManualRoute.useSearch()
  const [anio, mes] = fecha.split("-").map(Number)

  const esDocente = useEsDocente()
  const { data: sesiones, isPending } = useAsistenciaCalendarioQuery({
    SEDE: sede,
    ANIO: anio,
    MES: mes,
    MIAS: esDocente,
  })

  const sesionesDelDia: SesionTab[] = React.useMemo(() => {
    const delDia = (sesiones ?? []).filter((s) => s.fecha === fecha)
    return agruparPorBloquesContinuos(delDia)
      .sort(compararPorHora)
      .map((b) => ({
        // Una actividad no tiene bloque -- se identifica sola, distinta de
        // cualquier otra sesión del mismo grupo/asignatura ese día.
        id: b.esFormativa ? `${b.fkGrupo}-actividad-${b.fkActividad}` : `${b.fkGrupo}-${b.fkAsignatura}-${b.bloque}`,
        fkGrupo: b.fkGrupo,
        grado: b.grado,
        grupo: b.grupo,
        jornada: b.jornada,
        fkAsignatura: b.fkAsignatura,
        asignatura: b.asignatura,
        bloque: b.bloque,
        bloques: b.bloques,
        esFormativa: b.esFormativa,
        fkActividad: b.fkActividad,
        actividad: b.actividad,
        horasPorBloque: b.horasPorBloque,
        horaInicio: b.horaInicio,
        horaFin: b.horaFin,
      }))
  }, [sesiones, fecha])

  const [activeTab, setActiveTab] = React.useState<string | undefined>(undefined)
  const currentTab = activeTab ?? sesionesDelDia[0]?.id

  return (
    <NoticeProvider>
      <TableScreen>
        <TableScreenHeader>
          <TableScreenTitle>Asistencia</TableScreenTitle>
          <NoticeOutlet className="mx-(--screen-spacing) my-4" />
        </TableScreenHeader>

        <TableScreenBody>
        <div className="mb-4 flex items-center gap-2">
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  variant="ghost"
                  color="neutral"
                  size="icon-xs"
                  aria-label="Volver a Asistencia"
                  render={<Link to={paths.app.asistencia.getHref()} search={{ sede }} />}
                  nativeButton={false}
                />
              }
            >
              <ArrowLeftIcon />
            </TooltipTrigger>
            <TooltipContent>Volver a Asistencia</TooltipContent>
          </Tooltip>
          <h2 className="text-base font-semibold">Asistencia manual</h2>
        </div>

        {isPending && <Skeleton className="h-64 w-full" />}

        {esFechaFutura(fecha) && (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Todavía no se puede tomar asistencia: {formatFechaLarga(fecha)} es una fecha futura.
          </p>
        )}

        {!isPending && !esFechaFutura(fecha) && sesionesDelDia.length === 0 && (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No hay sesiones programadas para este día.
          </p>
        )}

        {!isPending && !esFechaFutura(fecha) && sesionesDelDia.length > 0 && (
          <Tabs value={currentTab} onValueChange={setActiveTab}>
            <TabsList variant="folder">
              {sesionesDelDia.map((sesion) => (
                <TabsTrigger key={sesion.id} value={sesion.id}>
                  {sesion.grado}{sesion.grupo} · {nombreSesion(sesion)}
                </TabsTrigger>
              ))}
            </TabsList>
            {sesionesDelDia.map((sesion) => (
              <TabsContent key={sesion.id} value={sesion.id} className={PANEL_CLASS}>
                <SesionTabContent sesion={sesion} fecha={fecha} />
              </TabsContent>
            ))}
          </Tabs>
        )}
        </TableScreenBody>
      </TableScreen>
    </NoticeProvider>
  )
}
