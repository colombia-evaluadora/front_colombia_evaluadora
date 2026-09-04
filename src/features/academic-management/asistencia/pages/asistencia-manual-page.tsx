import * as React from "react"
import { Link } from "@tanstack/react-router"

import { TableScreen, TableScreenBody, TableScreenHeader, TableScreenTitle } from "@/components/layout/table-screen"
import { NoticeOutlet, NoticeProvider, useNotify } from "@/components/notice/notice-context"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Skeleton } from "@/components/ui/skeleton"
import { ArrowLeftIcon } from "@/components/ui/icons"
import { DataTable } from "@/components/data-table"
import { Pagination } from "@/components/pagination"
import { useDataTable } from "@/hooks/use-data-table"

import { paths } from "@/config/paths"
import { asistenciaManualRoute } from "@/router"
import { useAsistenciaCalendarioQuery } from "@/features/academic-management/asistencia/api/query/use-asistencia-calendario-query"
import { useAsistenciaRosterQuery } from "@/features/academic-management/asistencia/api/query/use-asistencia-roster-query"
import { useAsistenciaRegistrarMutation } from "@/features/academic-management/asistencia/api/mutations/use-asistencia-registrar-mutation"
import { buildColumnsAsistenciaManual } from "@/features/academic-management/asistencia/components/columns-asistencia-manual"
import type { TipoAsistencia } from "@/features/academic-management/asistencia/api/types/asistencia"


const PANEL_CLASS =
  "rounded-b-lg rounded-tr-lg border border-border bg-background p-4 group-data-[tabs-filled=true]/tabs:rounded-tr-none"

interface SesionTab {
  id: string
  fkGrupo: number
  grupo: string
  jornada: string
  fkAsignatura: number
  asignatura: string
  bloque: number
  horaInicio: string | null
  horaFin: string | null
}

function formatFechaLarga(fecha: string): string {
  const [anio, mes, dia] = fecha.split("-").map(Number)
  return new Date(anio, mes - 1, dia).toLocaleDateString("es-CO", { day: "numeric", month: "long" })
}

function formatHora(timestamp: string): string {
  // "yyyy-MM-ddTHH:mm:ss" -- se lee la hora directo del string (sin pasar
  // por `Date`) para no arrastrar el huso horario del navegador.
  return timestamp.slice(11, 16)
}

/** "16 febrero (7:00 - 10:00)" del mockup -- sin horas, se queda solo en la fecha. */
function formatEncabezadoSesion(fecha: string, horaInicio: string | null, horaFin: string | null): string {
  const fechaLabel = formatFechaLarga(fecha)
  if (!horaInicio || !horaFin) return fechaLabel
  return `${fechaLabel} (${formatHora(horaInicio)} - ${formatHora(horaFin)})`
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
  const registrar = useAsistenciaRegistrarMutation()

  const roster_ = React.useMemo(() => roster ?? [], [roster])

  const precargado = React.useRef(false)
  React.useEffect(() => {
    if (precargado.current || !roster) return
    const inicial: Record<number, TipoAsistencia> = {}
    for (const est of roster) {
      if (est.tipo_asistencia_valor != null) inicial[est.fk_tmatricula] = est.tipo_asistencia_valor
    }
    if (Object.keys(inicial).length > 0) setSeleccion(inicial)
    precargado.current = true
  }, [roster])
  const columns = React.useMemo(
    () =>
      buildColumnsAsistenciaManual({
        fechaLabel: formatEncabezadoSesion(fecha, sesion.horaInicio, sesion.horaFin),
        seleccion,
        onChange: (fkMatricula, tipo) => setSeleccion((prev) => ({ ...prev, [fkMatricula]: tipo })),
        soporte,
        onSoporteChange: (fkMatricula, archivo) =>
          setSoporte((prev) => {
            if (!archivo) {
              const { [fkMatricula]: _omitido, ...resto } = prev
              return resto
            }
            return { ...prev, [fkMatricula]: archivo }
          }),
      }),
    [fecha, sesion.horaInicio, sesion.horaFin, seleccion, soporte],
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

  function handleGuardar() {
    const registros = Object.entries(seleccion).map(([fkMatricula, tipoAsistencia]) => {
      const archivo = soporte[Number(fkMatricula)]
      return {
        fkMatricula: Number(fkMatricula),
        tipoAsistencia,
        ...(archivo && { fkArchivo: archivo }),
      }
    })
    if (registros.length === 0) {
      notify("Selecciona al menos un estudiante.", { variant: "error" })
      return
    }
    registrar.mutate(
      {
        GRUPO: sesion.fkGrupo,
        ASIGNATURA: sesion.fkAsignatura,
        FECHA: fecha,
        BLOQUE: sesion.bloque,
        REGISTROS: registros,
      },
      {
        onSuccess: () => {
          notify("Asistencia guardada.")
          setSoporte({})
        },
      },
    )
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="font-semibold">{sesion.grupo}</span>
        <span className="rounded-sm bg-muted px-1 text-[10px] font-semibold text-muted-foreground">
          {sesion.jornada}
        </span>
        <span className="text-muted-foreground">·</span>
        <span className="font-medium">{sesion.asignatura}</span>
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
        <Button
          type="button"
          color="primary"
          size="sm"
          disabled={registrar.isPending}
          aria-busy={registrar.isPending}
          onClick={handleGuardar}
        >
          Guardar
        </Button>
      </div>
    </div>
  )
}

/** Pantalla "Asistencia manual" -- abierta desde el popover de una celda del calendario. */
export function AsistenciaManualPage() {
  const { fecha, sede } = asistenciaManualRoute.useSearch()
  const [anio, mes] = fecha.split("-").map(Number)

  const { data: sesiones, isPending } = useAsistenciaCalendarioQuery({ SEDE: sede, ANIO: anio, MES: mes })

  const sesionesDelDia: SesionTab[] = React.useMemo(() => {
    const porClave = new Map<string, SesionTab>()
    for (const s of sesiones ?? []) {
      if (s.fecha !== fecha) continue
      const key = `${s.fk_grupo}-${s.fk_asignatura}`
      if (porClave.has(key)) continue
      porClave.set(key, {
        id: key,
        fkGrupo: s.fk_grupo,
        grupo: s.grupo,
        jornada: s.jornada,
        fkAsignatura: s.fk_asignatura,
        asignatura: s.asignatura,
        bloque: s.bloque,
        horaInicio: s.hora_inicio,
        horaFin: s.hora_fin,
      })
    }
    return [...porClave.values()]
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
                  {sesion.grupo} · {sesion.asignatura}
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
