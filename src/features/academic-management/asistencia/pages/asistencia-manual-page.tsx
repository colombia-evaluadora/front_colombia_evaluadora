import * as React from "react"
import { Link } from "@tanstack/react-router"

import { TableScreen, TableScreenBody, TableScreenHeader, TableScreenTitle } from "@/components/layout/table-screen"
import { NoticeOutlet, NoticeProvider, useNotify } from "@/components/notice/notice-context"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Skeleton } from "@/components/ui/skeleton"
import { ArrowLeftIcon, CheckCircleFillIcon, CheckIcon, SpinnerIcon } from "@/components/ui/icons"
import { DataTable } from "@/components/data-table"
import { Pagination } from "@/components/pagination"
import { useDataTable } from "@/hooks/use-data-table"

import { paths } from "@/config/paths"
import { asistenciaManualRoute } from "@/router"
import { useAsistenciaCalendarioQuery } from "@/features/academic-management/asistencia/api/query/use-asistencia-calendario-query"
import { useAsistenciaRosterQuery } from "@/features/academic-management/asistencia/api/query/use-asistencia-roster-query"
import { useAsistenciaRegistrarMutation } from "@/features/academic-management/asistencia/api/mutations/use-asistencia-registrar-mutation"
import { useTipoAsistenciaCatalogQuery } from "@/features/academic-management/asistencia/api/query/use-tipo-asistencia-catalog-query"
import { buildColumnsAsistenciaManual } from "@/features/academic-management/asistencia/components/columns-asistencia-manual"
import type { AsistenciaRegistroManual, TipoAsistencia } from "@/features/academic-management/asistencia/api/types/asistencia"
import { agruparPorBloquesContinuos, formatHora } from "@/features/academic-management/asistencia/api/ui-mappings"

const TIPOS_ALTA_NUEVA: TipoAsistencia[] = [1, 2, 5]
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
  bloque: number
  /** Todos los bloques de la corrida (mismo orden que el horario). */
  bloques: number[]
  horasPorBloque: Record<number, { horaInicio: string | null; horaFin: string | null }>
  horaInicio: string | null
  horaFin: string | null
}

function formatFechaLarga(fecha: string): string {
  const [anio, mes, dia] = fecha.split("-").map(Number)
  return new Date(anio, mes - 1, dia).toLocaleDateString("es-CO", { day: "numeric", month: "long" })
}

/** "16 febrero (7:00 - 10:00)" del mockup -- sin horas, se queda solo en la fecha. */
function formatEncabezadoSesion(fecha: string, horaInicio: string | null, horaFin: string | null): string {
  const fechaLabel = formatFechaLarga(fecha)
  if (!horaInicio || !horaFin) return fechaLabel
  return `${fechaLabel} (${formatHora(horaInicio)} - ${formatHora(horaFin)})`
}

function registrosPorBloque(
  bloques: number[],
  seleccion: Record<number, TipoAsistencia>,
  bloqueTarde: Record<number, number>,
  soporte: Record<number, File>,
): Map<number, AsistenciaRegistroManual[]> {
  const porBloque = new Map<number, AsistenciaRegistroManual[]>(bloques.map((b) => [b, []]))

  for (const [fkMatriculaStr, tipo] of Object.entries(seleccion)) {
    const fkMatricula = Number(fkMatriculaStr)

    if (tipo === LLEGO_TARDE && bloques.length > 1) {
      const bloqueLlegada = bloqueTarde[fkMatricula] ?? bloques[0]
      for (const bloque of bloques) {
        const tipoBloque: TipoAsistencia =
          bloque < bloqueLlegada ? NO_ASISTIO : bloque === bloqueLlegada ? LLEGO_TARDE : ASISTIO
        porBloque.get(bloque)!.push({ fkMatricula, tipoAsistencia: tipoBloque })
      }
      continue
    }

    const archivo = soporte[fkMatricula]
    for (const bloque of bloques) {
      porBloque.get(bloque)!.push({
        fkMatricula,
        tipoAsistencia: tipo,
        ...(archivo && { fkArchivo: archivo }),
      })
    }
  }

  return porBloque
}

function SesionTabContent({ sesion, fecha }: { sesion: SesionTab; fecha: string }) {
  const { notify } = useNotify()
  const { data: roster, isPending, isError, refetch } = useAsistenciaRosterQuery({
    GRUPO: sesion.fkGrupo,
    ASIGNATURA: sesion.fkAsignatura,
    FECHA: fecha,
    BLOQUE: sesion.bloque,
  })
  const [seleccion, setSeleccion] = React.useState<Record<number, TipoAsistencia>>({})
  const [soporte, setSoporte] = React.useState<Record<number, File>>({})
  const [bloqueTarde, setBloqueTarde] = React.useState<Record<number, number>>({})
  const registrar = useAsistenciaRegistrarMutation()
  const { data: tipoOptionsCompleto = [] } = useTipoAsistenciaCatalogQuery()
  const tipoOptions = React.useMemo(
    () => tipoOptionsCompleto.filter((opt) => TIPOS_ALTA_NUEVA.includes(opt.value)),
    [tipoOptionsCompleto],
  )

  const roster_ = React.useMemo(() => roster ?? [], [roster])

  const baseline = React.useRef<Record<number, TipoAsistencia>>({})
  const precargado = React.useRef(false)
  React.useEffect(() => {
    if (precargado.current || !roster) return
    const inicial: Record<number, TipoAsistencia> = {}
    for (const est of roster) {
      if (est.tipo_asistencia_valor != null) inicial[est.fk_tmatricula] = est.tipo_asistencia_valor
    }
    baseline.current = inicial
    if (Object.keys(inicial).length > 0) setSeleccion(inicial)
    precargado.current = true
  }, [roster])
  const columns = React.useMemo(
    () =>
      buildColumnsAsistenciaManual({
        fechaLabel: formatEncabezadoSesion(fecha, sesion.horaInicio, sesion.horaFin),
        tipoOptions,
        seleccion,
        onChange: (fkMatricula, tipo) =>
          setSeleccion((prev) => ({ ...prev, [fkMatricula]: tipo })),
        soporte,
        onSoporteChange: (fkMatricula, archivo) =>
          setSoporte((prev) => {
            if (!archivo) {
              const { [fkMatricula]: _omitido, ...resto } = prev
              return resto
            }
            return { ...prev, [fkMatricula]: archivo }
          }),
        bloques: sesion.bloques,
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
  })

  const faltantes = roster_.filter((est) => seleccion[est.fk_tmatricula] == null).length
  const faltaBloqueTarde =
    sesion.bloques.length > 1 &&
    roster_.some(
      (est) => seleccion[est.fk_tmatricula] === LLEGO_TARDE && bloqueTarde[est.fk_tmatricula] == null,
    )
  const puedeGuardar = roster_.length > 0 && faltantes === 0 && !faltaBloqueTarde
  const esDirty = roster_.some((est) => seleccion[est.fk_tmatricula] !== baseline.current[est.fk_tmatricula])
  const mostrarGuardar = puedeGuardar && esDirty

  async function handleMarcarTodoAsistio() {
    try {
      await Promise.all(
        sesion.bloques.map((bloque) =>
          registrar.mutateAsync({
            GRUPO: sesion.fkGrupo,
            ASIGNATURA: sesion.fkAsignatura,
            FECHA: fecha,
            BLOQUE: bloque,
            MARCAR_TODOS: 1,
          }),
        ),
      )
      notify("Asistencia marcada como Asistió para todos.")
      const todosAsistieron = Object.fromEntries(
        roster_.map((est) => [est.fk_tmatricula, ASISTIO as TipoAsistencia]),
      )
      baseline.current = todosAsistieron
      setSeleccion(todosAsistieron)
      setBloqueTarde({})
    } catch {
      notify("Ocurrió un error al marcar la asistencia.", { variant: "error" })
    }
  }

  async function handleGuardar() {
    if (!puedeGuardar) {
      notify(
        faltaBloqueTarde
          ? "Selecciona en qué bloque llegó cada estudiante marcado como Llegó tarde."
          : "Marca la asistencia de todos los estudiantes antes de guardar.",
        { variant: "error" },
      )
      return
    }
    const porBloque = registrosPorBloque(sesion.bloques, seleccion, bloqueTarde, soporte)
    try {
      await Promise.all(
        [...porBloque.entries()].map(([bloque, registros]) =>
          registrar.mutateAsync({
            GRUPO: sesion.fkGrupo,
            ASIGNATURA: sesion.fkAsignatura,
            FECHA: fecha,
            BLOQUE: bloque,
            REGISTROS: registros,
          }),
        ),
      )
      notify("Asistencia guardada.")
      baseline.current = seleccion
      setSoporte({})
    } catch {
      notify("Ocurrió un error al guardar la asistencia.", { variant: "error" })
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="font-semibold">{sesion.grado}{sesion.grupo}</span>
          <span className="rounded-sm bg-muted px-1 text-[10px] font-semibold text-muted-foreground">
            {sesion.jornada}
          </span>
          <span className="text-muted-foreground">·</span>
          <span className="font-medium">{sesion.asignatura}</span>
        </div>
        <Button
          type="button"
          variant="outline"
          color="primary"
          size="sm"
          disabled={registrar.isPending || roster_.length === 0}
          aria-busy={registrar.isPending}
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
        <span className="text-xs text-muted-foreground">
          {Object.keys(seleccion).length} de {roster?.length ?? 0} estudiantes marcados
        </span>
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

  const { data: sesiones, isPending } = useAsistenciaCalendarioQuery({ SEDE: sede, ANIO: anio, MES: mes })

  const sesionesDelDia: SesionTab[] = React.useMemo(() => {
    const delDia = (sesiones ?? []).filter((s) => s.fecha === fecha)
    return agruparPorBloquesContinuos(delDia).map((b) => ({
      id: `${b.fkGrupo}-${b.fkAsignatura}-${b.bloque}`,
      fkGrupo: b.fkGrupo,
      grado: b.grado,
      grupo: b.grupo,
      jornada: b.jornada,
      fkAsignatura: b.fkAsignatura,
      asignatura: b.asignatura,
      bloque: b.bloque,
      bloques: b.bloques,
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
          <Button
            variant="ghost"
            color="neutral"
            size="icon-xs"
            aria-label="Volver a Asistencia"
            render={<Link to={paths.app.asistencia.getHref()} search={{ sede }} />}
            nativeButton={false}
          >
            <ArrowLeftIcon />
          </Button>
          <h2 className="text-base font-semibold">Asistencia manual</h2>
        </div>

        {isPending && <Skeleton className="h-64 w-full" />}

        {!isPending && sesionesDelDia.length === 0 && (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No hay sesiones programadas para este día.
          </p>
        )}

        {!isPending && sesionesDelDia.length > 0 && (
          <Tabs value={currentTab} onValueChange={setActiveTab}>
            <TabsList variant="folder">
              {sesionesDelDia.map((sesion) => (
                <TabsTrigger key={sesion.id} value={sesion.id}>
                  {sesion.grado}{sesion.grupo} · {sesion.asignatura}
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
