import * as React from "react"

import { TableScreen, TableScreenBody, TableScreenHeader, TableScreenTitle } from "@/components/layout/table-screen"
import { NoticeOutlet, NoticeProvider } from "@/components/notice/notice-context"
import { PrepareOfflineButton } from "@/components/offline/prepare-offline-dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { CaretDownIcon, FileDownloadOutlinedIcon, PrinterIcon } from "@/components/ui/icons"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

import { asistenciaRoute } from "@/router"
import { useAsistenciaAccess } from "@/features/academic-management/asistencia/hooks/use-es-docente"
import { useSedesOpcionesQuery } from "@/features/academic-management/asistencia/api/query/use-sedes-opciones-query"
import { useAsistenciaCalendarioQuery } from "@/features/academic-management/asistencia/api/query/use-asistencia-calendario-query"
import { useAsistenciaDiasInhabilesQuery, type DiaInhabil } from "@/features/academic-management/asistencia/api/query/use-asistencia-dias-inhabiles-query"
import { useAsistenciaResumenHorasQuery } from "@/features/academic-management/asistencia/api/query/use-asistencia-resumen-horas-query"
import { AsistenciaCambiosPendientesBanner } from "@/features/academic-management/asistencia/components/asistencia-cambios-pendientes-banner"
import { DialogRegistrarSesion } from "@/features/academic-management/asistencia/components/dialogs/dialog-registrar-sesion"
import { AsistenciaSedeSelector } from "@/features/academic-management/asistencia/components/asistencia-sede-selector"
import { AsistenciaMonthDayPicker } from "@/features/academic-management/asistencia/components/asistencia-month-day-picker"
import { AsistenciaSummaryCards } from "@/features/academic-management/asistencia/components/asistencia-summary-cards"
import { AsistenciaHoursCards } from "@/features/academic-management/asistencia/components/asistencia-hours-cards"
import { AsistenciaRegistroMensualCard } from "@/features/academic-management/asistencia/components/asistencia-registro-mensual-card"
import {
  AsistenciaMonthGrid,
  type AsistenciaDayEntry,
} from "@/features/academic-management/asistencia/components/asistencia-month-grid"
import { agruparPorBloquesContinuos, compararPorHora } from "@/features/academic-management/asistencia/api/ui-mappings"
import type { SesionCalendario } from "@/features/academic-management/asistencia/api/types/asistencia"
import {
  AsistenciaPorGrupoTab,
  exportarCsv,
  ImpresionPorGrupo,
  type FiltrosPorGrupo,
  type ReportePorGrupo,
} from "@/features/academic-management/asistencia/components/asistencia-por-grupo-tab"
import { useEstablishmentsOptionsQuery } from "@/features/establishment/institution/api/query/use-establishments-options"
import { DatosDelBadge } from "@/components/offline/datos-del-badge"
import { TTL_OFFLINE } from "@/lib/offline/query-meta"
import { fechaResumen, toIsoDate } from "@/features/academic-management/asistencia/lib/fechas"


function fromIsoDate(fecha: string | undefined): Date {
  if (!fecha) return new Date()
  const [anio, mes, dia] = fecha.split("-").map(Number)
  const date = new Date(anio, mes - 1, dia)
  return Number.isNaN(date.getTime()) ? new Date() : date
}


export function AsistenciaPage() {
  return (
    <NoticeProvider>
      <AsistenciaPageContent />
    </NoticeProvider>
  )
}

function AsistenciaPageContent() {
  const { isDocente, isDirectorGrupo, esAdminEstablecimiento, puedeRegistrar, puedeAprobar } = useAsistenciaAccess()
  const { data: sedes } = useSedesOpcionesQuery()
  const navigate = asistenciaRoute.useNavigate()
  const search = asistenciaRoute.useSearch()
  const [sedeId, setSedeIdState] = React.useState<number | null>(search.sede ?? null)
  const [selectedDay, setSelectedDayState] = React.useState(() => fromIsoDate(search.fecha))
  const vista = search.vista ?? "calendario"
  const [reporte, setReporte] = React.useState<ReportePorGrupo | null>(null)
  const { data: establecimientos } = useEstablishmentsOptionsQuery(vista === "grupo")

  function setVista(next: "calendario" | "grupo") {
    navigate({ search: (prev) => ({ ...prev, vista: next }), replace: true })
  }

  function setFiltrosGrupo(next: FiltrosPorGrupo) {
    navigate({ search: (prev) => ({ ...prev, ...next }), replace: true })
  }

  function setSelectedDay(next: Date) {
    setSelectedDayState(next)
    navigate({
      search: (prev) => ({ ...prev, fecha: toIsoDate(next) }),
      replace: true,
    })
  }

  function setSedeId(next: number) {
    setSedeIdState(next)
    navigate({
      search: (prev) => ({ ...prev, sede: next }),
      replace: true,
    })
  }

  // Default a la primera sede del catálogo SOLO si la URL no trajo ninguna.
  React.useEffect(() => {
    if (sedeId === null && sedes && sedes.length > 0) {
      setSedeId(sedes[0].pk_sede)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sedeId, sedes])

  const anio = selectedDay.getFullYear()
  const mes = selectedDay.getMonth() + 1

  // Sin MIAS: el back ya acota lo visible por el alcance del usuario en la sede
  // y jornada de cada grupo (V542/V136); los roles del token no lo saben.
  const { data: sesiones, dataUpdatedAt: sesionesUpdatedAt } = useAsistenciaCalendarioQuery(
    { SEDE: sedeId ?? 0, ANIO: anio, MES: mes },
    sedeId !== null,
  )
  const { data: resumen } = useAsistenciaResumenHorasQuery(
    { SEDE: sedeId ?? 0, FECHA: fechaResumen(selectedDay) },
    sedeId !== null,
  )

  // Regla 74: lo que se ve no es lo que se marca. Un director de grupo ve todas
  // las asignaturas de su grupo y un coordinador toda su sede, pero solo marcan
  // las clases que dictan: esas ("mías", MIAS=true) se piden aparte para no
  // ofrecer la acción de escritura sobre lo ajeno.
  const { data: misSesiones } = useAsistenciaCalendarioQuery(
    { SEDE: sedeId ?? 0, ANIO: anio, MES: mes, MIAS: true },
    sedeId !== null && isDocente,
  )
  const clavesPropias = (() => {
    if (!isDocente) return null
    const set = new Set<string>()
    for (const s of misSesiones ?? []) {
      set.add(s.es_formativa ? `${s.fk_grupo}-act-${s.fk_tactividad}` : `${s.fk_grupo}-asig-${s.fk_asignatura}`)
    }
    return set
  })()

  function puedeEditarSesion(s: { fkGrupo: number; fkAsignatura: number; fkActividad: number | null; esFormativa: boolean }): boolean {
    if (esAdminEstablecimiento) return true
    if (!isDocente) return false
    const clave = s.esFormativa ? `${s.fkGrupo}-act-${s.fkActividad}` : `${s.fkGrupo}-asig-${s.fkAsignatura}`
    return clavesPropias?.has(clave) ?? false
  }

  const { data: diasInhabiles } = useAsistenciaDiasInhabilesQuery(
    { SEDE: sedeId ?? 0, ANIO: anio, MES: mes },
    sedeId != null,
  )
  const inhabiles = (() => {
    const map = new Map<number, DiaInhabil[]>()
    for (const d of diasInhabiles ?? []) {
      const day = Number(d.fecha.split("-")[2])
      map.set(day, [...(map.get(day) ?? []), d])
    }
    return map
  })()

  const events = (() => {
    const map = new Map<number, AsistenciaDayEntry[]>()
    const porDia = new Map<number, SesionCalendario[]>()

    for (const sesion of sesiones ?? []) {
      const day = Number(sesion.fecha.split("-")[2])
      if (Number.isNaN(day)) continue
      const lista = porDia.get(day) ?? []
      lista.push(sesion)
      porDia.set(day, lista)
    }

    for (const [day, lista] of porDia) {
      map.set(
        day,
        // Mismo orden que "Asistencia manual": cronológico por hora de
        // inicio, no el orden de agrupación por asignatura/actividad que
        // devuelve `agruparPorBloquesContinuos`.
        agruparPorBloquesContinuos(lista)
          .sort(compararPorHora)
          .map((b) => ({
            id: b.esFormativa
              ? `${b.fkGrupo}-actividad-${b.fkActividad}-${b.fecha}`
              : `${b.fkGrupo}-${b.fkAsignatura}-${b.fecha}-${b.bloque}`,
            fecha: b.fecha,
            bloque: b.bloque,
            bloques: b.bloques,
            fkGrupo: b.fkGrupo,
            grupo: b.grupo,
            grado: b.grado,
            jornada: b.jornada,
            fkAsignatura: b.fkAsignatura,
            asignatura: b.asignatura,
            horaInicio: b.horaInicio,
            horaFin: b.horaFin,
            estado: b.estado,
            esFormativa: b.esFormativa,
            fkActividad: b.fkActividad,
            actividad: b.actividad,
            puedeEditar: puedeEditarSesion(b),
          })),
      )
    }
    return map
    // eslint-disable-next-line react-hooks/exhaustive-deps
  })()

  return (
    <TableScreen>
      <TableScreenHeader>
        <TableScreenTitle
          action={
            <div className="flex flex-wrap items-center gap-2">
              {vista === "calendario" && <PrepareOfflineButton />}
              <AsistenciaSedeSelector
                sedeId={sedeId}
                onChange={(next) => {
                  setSedeId(next)
                  setFiltrosGrupo({ grupo: undefined, asignatura: undefined, periodo: undefined })
                }}
              />
              {vista === "grupo" && (
                <>
                  <Button variant="outline" color="neutral" disabled={!reporte} onClick={() => window.print()}>
                    <PrinterIcon data-icon="inline-start" />
                    Imprimir
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      render={<Button variant="outline" color="neutral" disabled={!reporte} />}
                    >
                      <FileDownloadOutlinedIcon data-icon="inline-start" />
                      Exportar
                      <CaretDownIcon data-icon="inline-end" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => reporte && exportarCsv(reporte)}>Excel (CSV)</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => window.print()}>PDF (guardar desde Imprimir)</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </>
              )}
              {puedeRegistrar && sedeId != null && (
                <DialogRegistrarSesion
                  sede={sedeId}
                  soloPropias={!esAdminEstablecimiento}
                  grupoInicial={vista === "grupo" ? search.grupo : undefined}
                  asignaturaInicial={
                    vista === "grupo" && typeof search.asignatura === "number" ? search.asignatura : undefined
                  }
                />
              )}
            </div>
          }
        >
          <span className="flex items-center gap-2">
            Asistencias
            {!puedeRegistrar && (
              <Badge variant="soft" color="neutral">
                Solo lectura
              </Badge>
            )}
          </span>
        </TableScreenTitle>
        <DatosDelBadge updatedAt={sesionesUpdatedAt} ttl={TTL_OFFLINE.grupo} className="mx-(--screen-spacing) mt-2" />
        <NoticeOutlet className="mx-(--screen-spacing) my-4" />
      </TableScreenHeader>
      <TableScreenBody>
        <Tabs value={vista} onValueChange={(v) => setVista(v as "calendario" | "grupo")}>
          <TabsList>
            <TabsTrigger value="calendario">
              Calendario
            </TabsTrigger>
            <TabsTrigger value="grupo">
              Asistencia por grupo
            </TabsTrigger>
          </TabsList>
          <TabsContent value="grupo">
            <AsistenciaPorGrupoTab
              sede={sedeId}
              filtros={{ grupo: search.grupo, asignatura: search.asignatura, periodo: search.periodo }}
              onFiltros={setFiltrosGrupo}
              soloLasQueDicta={isDocente && !isDirectorGrupo && !esAdminEstablecimiento}
              puedeAbrirPlanilla={puedeRegistrar}
              onReporte={setReporte}
            />
            {reporte && (
              <ImpresionPorGrupo
                reporte={reporte}
                institucion={
                  establecimientos?.find((e) => e.id === sedes?.find((s) => s.pk_sede === sedeId)?.fk_establecimiento)?.name ?? ""
                }
                sede={sedes?.find((s) => s.pk_sede === sedeId)?.nombre ?? ""}
              />
            )}
          </TabsContent>
          <TabsContent value="calendario">
        <div className="mb-4 flex items-center justify-between gap-4">
          <AsistenciaMonthDayPicker selected={selectedDay} onSelect={setSelectedDay} />
        </div>

        {puedeAprobar && <AsistenciaCambiosPendientesBanner />}

        <div className="mb-4">
          <AsistenciaSummaryCards resumen={resumen} />
        </div>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,300px)_minmax(0,1fr)]">
          <div className="relative min-h-0">
            <div className="flex flex-col gap-3 lg:absolute lg:inset-0 lg:overflow-y-auto lg:pr-1">
              <AsistenciaHoursCards resumen={resumen} />
              <AsistenciaRegistroMensualCard resumen={resumen} />
            </div>
          </div>

          <AsistenciaMonthGrid
            month={new Date(selectedDay.getFullYear(), selectedDay.getMonth(), 1)}
            events={events}
            inhabiles={inhabiles}
            manualSede={sedeId ?? 0}
            restrictedView={!puedeRegistrar}
          />
        </div>
          </TabsContent>
        </Tabs>
      </TableScreenBody>
    </TableScreen>
  )
}
