import * as React from "react"
import { Link, useNavigate } from "@tanstack/react-router"

import { TableScreen, TableScreenBody, TableScreenHeader, TableScreenTitle } from "@/components/layout/table-screen"
import { NoticeOutlet, NoticeProvider, useNotify } from "@/components/notice/notice-context"
import { Button } from "@/components/ui/button"
import { ClipboardCheckIcon } from "@/components/ui/icons"

import { paths } from "@/config/paths"
import { asistenciaRoute } from "@/router"
import { useAuth } from "@/features/auth/hooks/use-auth"
import { useSedeOptionsQuery } from "@/features/establishment/academic-period/api/query/use-sede-options"
import { useAsistenciaCalendarioQuery } from "@/features/academic-management/asistencia/api/query/use-asistencia-calendario-query"
import { useAsistenciaResumenHorasQuery } from "@/features/academic-management/asistencia/api/query/use-asistencia-resumen-horas-query"
import { useAsistenciaRegistrarMutation } from "@/features/academic-management/asistencia/api/mutations/use-asistencia-registrar-mutation"
import { AsistenciaSedeSelector } from "@/features/academic-management/asistencia/components/asistencia-sede-selector"
import { AsistenciaMonthDayPicker } from "@/features/academic-management/asistencia/components/asistencia-month-day-picker"
import { AsistenciaSummaryCards } from "@/features/academic-management/asistencia/components/asistencia-summary-cards"
import { AsistenciaHoursCards } from "@/features/academic-management/asistencia/components/asistencia-hours-cards"
import { AsistenciaRegistroMensualCard } from "@/features/academic-management/asistencia/components/asistencia-registro-mensual-card"
import {
  AsistenciaMonthGrid,
  type AsistenciaDayEntry,
} from "@/features/academic-management/asistencia/components/asistencia-month-grid"
import { agruparPorBloquesContinuos } from "@/features/academic-management/asistencia/api/ui-mappings"
import type { SesionCalendario } from "@/features/academic-management/asistencia/api/types/asistencia"

function toIsoDate(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`
}

const DOCENTE_ROLE = "CEVAL-DOCENTE"


export function AsistenciaPage() {
  return (
    <NoticeProvider>
      <AsistenciaPageContent />
    </NoticeProvider>
  )
}

function AsistenciaPageContent() {
  const { notify } = useNotify()
  const { user } = useAuth()
  const isDocente = user?.roles.includes(DOCENTE_ROLE) ?? false
  const { data: sedes } = useSedeOptionsQuery()
  const navigate = useNavigate()
  const search = asistenciaRoute.useSearch()
  const [sedeId, setSedeIdState] = React.useState<number | null>(search.sede ?? null)
  const [selectedDay, setSelectedDay] = React.useState(() => new Date())

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

  const { data: sesiones } = useAsistenciaCalendarioQuery(
    { SEDE: sedeId ?? 0, ANIO: anio, MES: mes },
    sedeId !== null,
  )
  const { data: resumen } = useAsistenciaResumenHorasQuery(
    { SEDE: sedeId ?? 0, FECHA: toIsoDate(selectedDay) },
    sedeId !== null,
  )


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
        agruparPorBloquesContinuos(lista).map((b) => ({
          id: `${b.fkGrupo}-${b.fkAsignatura}-${b.fecha}-${b.bloque}`,
          fecha: b.fecha,
          bloque: b.bloque,
          fkGrupo: b.fkGrupo,
          grupo: b.grupo,
          grado: b.grado,
          jornada: b.jornada,
          fkAsignatura: b.fkAsignatura,
          asignatura: b.asignatura,
          horaInicio: b.horaInicio,
          horaFin: b.horaFin,
          estado: b.estado,
        })),
      )
    }
    return map
  }, [sesiones])

  const registrar = useAsistenciaRegistrarMutation()
  const [markingEntryId, setMarkingEntryId] = React.useState<string | null>(null)
  const [markedEntryIds, setMarkedEntryIds] = React.useState<Set<string>>(new Set())

  function handleMarkAllPresent(entry: AsistenciaDayEntry) {
    setMarkingEntryId(entry.id)
    registrar.mutate(
      {
        GRUPO: entry.fkGrupo,
        ASIGNATURA: entry.fkAsignatura,
        FECHA: entry.fecha,
        BLOQUE: entry.bloque,
        MARCAR_TODOS: 1,
      },
      {
        onSuccess: () => {
          notify(`Asistencia de ${entry.grupo} · ${entry.asignatura} marcada como Asistió.`)
          setMarkedEntryIds((prev) => new Set(prev).add(entry.id))
        },
        onSettled: () => setMarkingEntryId(null),
      },
    )
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
          >
            <ClipboardCheckIcon />
          </Button>
        </div>

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
