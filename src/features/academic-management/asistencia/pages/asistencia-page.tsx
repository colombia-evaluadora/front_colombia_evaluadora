import * as React from "react"
import { Link, useNavigate } from "@tanstack/react-router"

import { TableScreen, TableScreenBody, TableScreenHeader, TableScreenTitle } from "@/components/layout/table-screen"
import { NoticeOutlet, NoticeProvider, useNotify } from "@/components/notice/notice-context"
import { Button } from "@/components/ui/button"
import { ClipboardCheckIcon } from "@/components/ui/icons"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { getErrorMessage } from "@/lib/api-client"

import { paths } from "@/config/paths"
import { asistenciaRoute } from "@/router"
import { useAsistenciaAccess } from "@/features/academic-management/asistencia/api/use-es-docente"
import { useSedesOpcionesQuery } from "@/features/academic-management/asistencia/api/query/use-sedes-opciones-query"
import { useAsistenciaCalendarioQuery } from "@/features/academic-management/asistencia/api/query/use-asistencia-calendario-query"
import { useAsistenciaResumenHorasQuery } from "@/features/academic-management/asistencia/api/query/use-asistencia-resumen-horas-query"
import { useAsistenciaRegistrarMutation } from "@/features/academic-management/asistencia/api/mutations/use-asistencia-registrar-mutation"
import { AsistenciaCambiosPendientesBanner } from "@/features/academic-management/asistencia/components/asistencia-cambios-pendientes-banner"
import { AsistenciaSedeSelector } from "@/features/academic-management/asistencia/components/asistencia-sede-selector"
import { AsistenciaMonthDayPicker } from "@/features/academic-management/asistencia/components/asistencia-month-day-picker"
import { AsistenciaSummaryCards } from "@/features/academic-management/asistencia/components/asistencia-summary-cards"
import { AsistenciaHoursCards } from "@/features/academic-management/asistencia/components/asistencia-hours-cards"
import { AsistenciaRegistroMensualCard } from "@/features/academic-management/asistencia/components/asistencia-registro-mensual-card"
import {
  AsistenciaMonthGrid,
  nombreSesion,
  type AsistenciaDayEntry,
} from "@/features/academic-management/asistencia/components/asistencia-month-grid"
import { agruparPorBloquesContinuos, compararPorHora } from "@/features/academic-management/asistencia/api/ui-mappings"
import type { SesionCalendario } from "@/features/academic-management/asistencia/api/types/asistencia"

function toIsoDate(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`
}

/**
 * Fecha para el resumen de horas: el lunes de la semana del día, sin salir de su
 * mes. fn_asistencia_resumen_horas (V140) solo usa la fecha para el año, el mes
 * y la semana, así que cambiar de día dentro de la misma semana no la consulta de nuevo.
 */
function fechaResumen(date: Date) {
  const lunes = new Date(date.getFullYear(), date.getMonth(), date.getDate() - ((date.getDay() + 6) % 7))
  return toIsoDate(lunes.getMonth() === date.getMonth() ? lunes : new Date(date.getFullYear(), date.getMonth(), 1))
}

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
  const { notify } = useNotify()
  const { isDocente, puedeAprobar } = useAsistenciaAccess()
  const { data: sedes } = useSedesOpcionesQuery()
  const navigate = useNavigate()
  const search = asistenciaRoute.useSearch()
  const [sedeId, setSedeIdState] = React.useState<number | null>(search.sede ?? null)
  const [selectedDay, setSelectedDayState] = React.useState(() => fromIsoDate(search.fecha))

  function setSelectedDay(next: Date) {
    setSelectedDayState(next)
    navigate({
      to: asistenciaRoute.id,
      search: (prev) => ({ ...prev, fecha: toIsoDate(next) }),
      replace: true,
    })
  }

  function setSedeId(next: number) {
    setSedeIdState(next)
    navigate({
      to: asistenciaRoute.id,
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
  const { data: sesiones } = useAsistenciaCalendarioQuery(
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
  const clavesPropias = React.useMemo(() => {
    if (!isDocente) return null
    const set = new Set<string>()
    for (const s of misSesiones ?? []) {
      set.add(s.es_formativa ? `${s.fk_grupo}-act-${s.fk_tactividad}` : `${s.fk_grupo}-asig-${s.fk_asignatura}`)
    }
    return set
  }, [isDocente, misSesiones])

  function puedeEditarSesion(s: { fkGrupo: number; fkAsignatura: number; fkActividad: number | null; esFormativa: boolean }): boolean {
    if (!isDocente) return false
    const clave = s.esFormativa ? `${s.fkGrupo}-act-${s.fkActividad}` : `${s.fkGrupo}-asig-${s.fkAsignatura}`
    return clavesPropias?.has(clave) ?? false
  }

  const events = React.useMemo(() => {
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
  }, [sesiones, isDocente, clavesPropias])

  const registrar = useAsistenciaRegistrarMutation()
  const [markingEntryId, setMarkingEntryId] = React.useState<string | null>(null)
  const [markedEntryIds, setMarkedEntryIds] = React.useState<Set<string>>(new Set())

  async function handleMarkAllPresent(entry: AsistenciaDayEntry) {
    if (!entry.puedeEditar) return
    setMarkingEntryId(entry.id)
    try {
      // Una clase de varios bloques continuos es UNA sola sesión en la
      // grilla, pero cada bloque es su propia fila de TASISTENCIA -- marcar
      // solo `entry.bloque` (el primero) dejaba el resto sin registrar.
      const solicitudes = await Promise.all(
        entry.bloques.map((bloque) =>
          registrar.mutateAsync({
            GRUPO: entry.fkGrupo,
            FECHA: entry.fecha,
            MARCAR_TODOS: 1,
            ...(entry.esFormativa
              ? { ACTIVIDAD: entry.fkActividad ?? undefined }
              : { ASIGNATURA: entry.fkAsignatura, BLOQUE: bloque }),
          }),
        ),
      )
      const pendiente = solicitudes.some((s) => s.length > 0)
      notify(
        pendiente
          ? `El período ya no es calificable: ${entry.grupo} · ${nombreSesion(entry)} quedó pendiente de aprobación del coordinador.`
          : `Asistencia de ${entry.grupo} · ${nombreSesion(entry)} marcada como Asistió.`,
        pendiente ? { variant: "info" } : undefined,
      )
      setMarkedEntryIds((prev) => new Set(prev).add(entry.id))
    } catch (error) {
      notify(getErrorMessage(error), { variant: "error" })
    } finally {
      setMarkingEntryId(null)
    }
  }

  return (
    <TableScreen>
      <TableScreenHeader>
        <TableScreenTitle
          action={<AsistenciaSedeSelector sedeId={sedeId} onChange={setSedeId} />}
        >
          Asistencia
        </TableScreenTitle>
        <NoticeOutlet className="mx-(--screen-spacing) my-4" />
      </TableScreenHeader>
      <TableScreenBody>
        <div className="mb-4 flex items-center justify-between gap-4">
          <AsistenciaMonthDayPicker selected={selectedDay} onSelect={setSelectedDay} />
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  variant="outline"
                  color="neutral"
                  size="icon-sm"
                  aria-label="Ir a Seguimiento"
                  render={
                    <Link
                      to={paths.app.asistenciaSeguimiento.getHref()}
                      search={{ sede: sedeId ?? undefined }}
                    />
                  }
                  nativeButton={false}
                />
              }
            >
              <ClipboardCheckIcon />
            </TooltipTrigger>
            <TooltipContent>Ir a Seguimiento</TooltipContent>
          </Tooltip>
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
            onMarkAllPresent={handleMarkAllPresent}
            markingEntryId={markingEntryId}
            markedEntryIds={markedEntryIds}
            manualSede={sedeId ?? 0}
            restrictedView={!isDocente}
          />
        </div>
      </TableScreenBody>
    </TableScreen>
  )
}
