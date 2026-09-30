import * as React from "react"
import { Link } from "@tanstack/react-router"

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { ArrowLeftIcon, CaretRightIcon, XIcon } from "@/components/ui/icons"
import { cn } from "@/lib/utils"
import { paths } from "@/config/paths"

import { nombreSesion, type AsistenciaDayEntry } from "@/features/academic-management/asistencia/components/asistencia-month-grid"
import {
  ESTADO_SESION_COLOR,
  ESTADO_SESION_ICON,
  formatGrado,
  formatHoraRango,
  peorEstado,
} from "@/features/academic-management/asistencia/api/ui-mappings"

interface AsistenciaDayCellRectorPopoverProps {
  items: AsistenciaDayEntry[]
  /** Vista no docente: cada materia lleva a Seguimiento con sus filtros. */
  seguimientoSede?: number
  children: React.ReactNode
}

function formatFechaLarga(fecha: string): string {
  const [anio, mes, dia] = fecha.split("-").map(Number)
  return new Date(anio, mes - 1, dia).toLocaleDateString("es-CO", { day: "numeric", month: "long" })
}

type RectorView =
  | { level: "grados" }
  | { level: "grupos"; grado: string; jornada: string }
  | { level: "grupos-todos" }
  | { level: "asignaturas"; grado: string; jornada: string; grupo: string; desdeTodos: boolean }

interface AsistenciaGrupoDrillDownProps {
  items: AsistenciaDayEntry[]
  open?: boolean
  /** Director de grupo: sus grupos ya son pocos, así que arranca directo en "grupos" (grado+grupo) sin el paso intermedio por grado. */
  omitirGrados?: boolean
  /** Si viene, cada materia es un link a Seguimiento filtrado por ella. */
  seguimientoSede?: number
}

export function AsistenciaGrupoDrillDown({
  items,
  open = true,
  omitirGrados = false,
  seguimientoSede,
}: AsistenciaGrupoDrillDownProps) {
  const inicial: RectorView = omitirGrados ? { level: "grupos-todos" } : { level: "grados" }
  const [view, setView] = React.useState<RectorView>(inicial)

  React.useEffect(() => {
    if (!open) setView(inicial)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const grados = React.useMemo(() => {
    const porGradoJornada = new Map<string, AsistenciaDayEntry[]>()
    for (const item of items) {
      const key = `${item.grado}-${item.jornada}`
      const list = porGradoJornada.get(key) ?? []
      list.push(item)
      porGradoJornada.set(key, list)
    }
    return [...porGradoJornada.values()]
      .map((entries) => ({
        grado: entries[0].grado,
        jornada: entries[0].jornada,
        entries,
        estado: peorEstado(entries.map((e) => e.estado)),
      }))
      .sort((a, b) => a.grado.localeCompare(b.grado) || a.jornada.localeCompare(b.jornada))
  }, [items])

  const grupos = React.useMemo(() => {
    if (view.level !== "grupos") return []
    const porGrupo = new Map<string, AsistenciaDayEntry[]>()
    for (const item of items) {
      if (item.grado !== view.grado || item.jornada !== view.jornada) continue
      const list = porGrupo.get(item.grupo) ?? []
      list.push(item)
      porGrupo.set(item.grupo, list)
    }
    return [...porGrupo.entries()]
      .map(([grupo, entries]) => ({ grupo, entries, estado: peorEstado(entries.map((e) => e.estado)) }))
      .sort((a, b) => a.grupo.localeCompare(b.grupo))
  }, [items, view])

  const gruposTodos = React.useMemo(() => {
    if (view.level !== "grupos-todos") return []
    const porGrupo = new Map<string, AsistenciaDayEntry[]>()
    for (const item of items) {
      const key = `${item.grado}-${item.jornada}-${item.grupo}`
      const list = porGrupo.get(key) ?? []
      list.push(item)
      porGrupo.set(key, list)
    }
    return [...porGrupo.values()]
      .map((entries) => ({
        grado: entries[0].grado,
        jornada: entries[0].jornada,
        grupo: entries[0].grupo,
        entries,
        estado: peorEstado(entries.map((e) => e.estado)),
      }))
      .sort((a, b) => a.grado.localeCompare(b.grado) || a.grupo.localeCompare(b.grupo))
  }, [items, view])

  const asignaturas = React.useMemo(() => {
    if (view.level !== "asignaturas") return []
    return items.filter(
      (item) => item.grado === view.grado && item.jornada === view.jornada && item.grupo === view.grupo,
    )
  }, [items, view])

  const titulo =
    view.level === "grados"
      ? "Grados"
      : view.level === "grupos"
        ? `Grupos de ${formatGrado(view.grado)} (${view.jornada})`
        : view.level === "grupos-todos"
          ? "Grupos"
          : `${formatGrado(view.grado)}${view.grupo} (${view.jornada})`

  const esNivelInicial = view.level === inicial.level

  return (
    <div className="flex flex-col gap-2">
      {!esNivelInicial && (
        <button
          type="button"
          className="flex items-center gap-1.5 self-start text-xs font-medium text-muted-foreground hover:text-foreground"
          onClick={() =>
            setView(
              view.level === "asignaturas"
                ? view.desdeTodos
                  ? { level: "grupos-todos" }
                  : { level: "grupos", grado: view.grado, jornada: view.jornada }
                : { level: "grados" },
            )
          }
        >
          <ArrowLeftIcon className="size-3.5" />
          {titulo}
        </button>
      )}

      {view.level === "grados" && (
        <ul className="flex flex-col gap-1">
          {grados.map(({ grado, jornada, entries, estado }) => {
            const EstadoIcon = ESTADO_SESION_ICON[estado]
            return (
              <li key={`${grado}-${jornada}`}>
                <button
                  type="button"
                  className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted/40"
                  onClick={() => setView({ level: "grupos", grado, jornada })}
                >
                  <EstadoIcon className={cn("size-3.5 shrink-0", ESTADO_SESION_COLOR[estado])} />
                  <span className="min-w-0 flex-1 truncate font-medium">{formatGrado(grado)}</span>
                  <span className="shrink-0 rounded-sm bg-muted px-1 text-[10px] font-semibold text-muted-foreground">
                    {jornada}
                  </span>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {entries.length} {entries.length === 1 ? "clase" : "clases"}
                  </span>
                  <CaretRightIcon className="size-3.5 shrink-0 text-muted-foreground" />
                </button>
              </li>
            )
          })}
        </ul>
      )}

      {view.level === "grupos" && (
        <ul className="flex flex-col gap-1">
          {grupos.map(({ grupo, entries, estado }) => {
            const EstadoIcon = ESTADO_SESION_ICON[estado]
            return (
              <li key={grupo}>
                <button
                  type="button"
                  className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted/40"
                  onClick={() =>
                    setView({
                      level: "asignaturas",
                      grado: view.grado,
                      jornada: view.jornada,
                      grupo,
                      desdeTodos: false,
                    })
                  }
                >
                  <EstadoIcon className={cn("size-3.5 shrink-0", ESTADO_SESION_COLOR[estado])} />
                  <span className="min-w-0 flex-1 truncate font-medium">{grupo}</span>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {entries.length} {entries.length === 1 ? "asignatura" : "asignaturas"}
                  </span>
                  <CaretRightIcon className="size-3.5 shrink-0 text-muted-foreground" />
                </button>
              </li>
            )
          })}
        </ul>
      )}

      {view.level === "grupos-todos" && (
        <ul className="flex flex-col gap-1">
          {gruposTodos.map(({ grado, jornada, grupo, entries, estado }) => {
            const EstadoIcon = ESTADO_SESION_ICON[estado]
            return (
              <li key={`${grado}-${jornada}-${grupo}`}>
                <button
                  type="button"
                  className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted/40"
                  onClick={() =>
                    setView({ level: "asignaturas", grado, jornada, grupo, desdeTodos: true })
                  }
                >
                  <EstadoIcon className={cn("size-3.5 shrink-0", ESTADO_SESION_COLOR[estado])} />
                  <span className="min-w-0 flex-1 truncate font-medium">
                    {formatGrado(grado)}
                    {grupo}
                  </span>
                  <span className="shrink-0 rounded-sm bg-muted px-1 text-[10px] font-semibold text-muted-foreground">
                    {jornada}
                  </span>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {entries.length} {entries.length === 1 ? "asignatura" : "asignaturas"}
                  </span>
                  <CaretRightIcon className="size-3.5 shrink-0 text-muted-foreground" />
                </button>
              </li>
            )
          })}
        </ul>
      )}

      {view.level === "asignaturas" && (
        <ul className="flex flex-col gap-2">
          {asignaturas.map((item) => {
            const EstadoIcon = ESTADO_SESION_ICON[item.estado]
            const horaRango = formatHoraRango(item.horaInicio, item.horaFin)
            const contenido = (
              <>
                <span className="flex min-w-0 items-center gap-2">
                  <EstadoIcon className={cn("size-3.5 shrink-0", ESTADO_SESION_COLOR[item.estado])} />
                  <span>{nombreSesion(item)}</span>
                </span>
                {horaRango && <span className="shrink-0 text-xs text-muted-foreground">{horaRango}</span>}
              </>
            )
            if (seguimientoSede == null) {
              return (
                <li key={item.id} className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-sm">
                  {contenido}
                </li>
              )
            }
            return (
              <li key={item.id}>
                <Link
                  to={paths.app.asistenciaSeguimiento.getHref()}
                  search={{
                    sede: seguimientoSede,
                    fecha: item.fecha,
                    jornada: item.jornada,
                    grado: item.grado,
                    grupo: item.fkGrupo,
                    // Formativa: fk_asignatura es la dueña de la actividad y no filtra sus registros.
                    asignatura: item.esFormativa ? undefined : item.fkAsignatura,
                  }}
                  className="flex flex-wrap items-center gap-x-2 gap-y-0.5 rounded-md px-2 py-1.5 text-sm hover:bg-muted/40"
                >
                  {contenido}
                  <CaretRightIcon className="ml-auto size-3.5 shrink-0 text-muted-foreground" />
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

export function AsistenciaDayCellRectorPopover({ items, children, seguimientoSede }: AsistenciaDayCellRectorPopoverProps) {
  const [open, setOpen] = React.useState(false)
  const fecha = items[0]?.fecha

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger render={<button type="button" className="h-full w-full min-w-0 text-left" />}>
        {children}
      </PopoverTrigger>
      <PopoverContent align="start" className="w-72 gap-3 p-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold capitalize">
            {fecha ? formatFechaLarga(fecha) : ""}
          </span>
          <button
            type="button"
            aria-label="Cerrar"
            className="text-muted-foreground hover:text-foreground"
            onClick={() => setOpen(false)}
          >
            <XIcon className="size-4" />
          </button>
        </div>
        <AsistenciaGrupoDrillDown items={items} open={open} seguimientoSede={seguimientoSede} />
      </PopoverContent>
    </Popover>
  )
}
