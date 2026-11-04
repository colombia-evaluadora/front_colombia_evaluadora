import * as React from "react"
import { Link } from "@tanstack/react-router"
import { DayPicker, getDefaultClassNames, type DayProps, type Locale } from "react-day-picker"
import { es } from "date-fns/locale"

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { pendingStatusOf, useOutboxOps } from "@/lib/offline/outbox/hooks"
import { PendingStatusBadge } from "@/features/offline/components/pending-badge"
import { CaretRightIcon, XIcon } from "@/components/ui/icons"
import { cn } from "@/lib/utils"

import { paths } from "@/config/paths"
import type { EstadoSesion } from "@/features/academic-management/asistencia/api/types/asistencia"
import {
  TIPO_DIA_INHABIL_LABEL,
  type DiaInhabil,
} from "@/features/academic-management/asistencia/api/query/use-asistencia-dias-inhabiles-query"
import { ESTADO_SESION_COLOR, ESTADO_SESION_ICON, ESTADO_SESION_LABELS, esFechaFutura, formatGrado, formatHora, peorEstado } from "@/features/academic-management/asistencia/api/ui-mappings"
import { AsistenciaDayCellRectorPopover, AsistenciaGrupoDrillDown } from "@/features/academic-management/asistencia/components/asistencia-day-cell-rector-popover"

export interface AsistenciaDayEntry {
  id: string
  fecha: string
  /** `null` = toma suelta sin bloque (`TASISTENCIA.BLOQUE` nulo). */
  bloque: number | null
  bloques: (number | null)[]
  fkGrupo: number
  grupo: string
  grado: string
  jornada: string
  fkAsignatura: number
  asignatura: string
  horaInicio: string | null
  horaFin: string | null
  estado: EstadoSesion
  /** Grupo de Preescolar: la sesión es `actividad`, no `asignatura`. */
  esFormativa: boolean
  fkActividad: number | null
  actividad: string | null
  /** Regla 74: Director de Grupo/Coordinador ven esta sesión pero no pueden marcarla -- solo el docente asignado a ella. */
  puedeEditar: boolean
}

/** Nombre a mostrar: la actividad si la sesión es formativa, la asignatura si no. */
export function nombreSesion(entry: Pick<AsistenciaDayEntry, "esFormativa" | "actividad" | "asignatura">): string {
  return entry.esFormativa ? (entry.actividad ?? "Actividad") : entry.asignatura
}

interface AsistenciaMonthGridProps {
  month: Date
  events: Map<number, AsistenciaDayEntry[]>
  /** Días inhábiles del mes por día (Regla 108): sin clases, con su motivo. */
  inhabiles: Map<number, DiaInhabil[]>
  locale?: Locale
  manualSede: number
  restrictedView: boolean
}

const MESES = Array.from({ length: 12 }, (_, i) =>
  new Date(2000, i, 1).toLocaleString("es-CO", { month: "long" }),
)

export function AsistenciaMonthGrid({
  month,
  events,
  inhabiles,
  locale = es,
  manualSede,
  restrictedView,
}: AsistenciaMonthGridProps) {
  const defaultClassNames = getDefaultClassNames()
  const year = month.getFullYear()

  return (
    <MonthGridContext.Provider
      value={{ events, inhabiles, manualSede, restrictedView }}
    >
      <div
        data-slot="asistencia-month-grid"
        className={cn(
          "w-full overflow-hidden rounded-lg border bg-card [--asistencia-cell-max-width:200px] [--cell-radius:var(--radius)] [--cell-size:--spacing(24)]",
          defaultClassNames.root,
        )}
      >
        <div className="flex items-center justify-center border-b border-muted-22 px-3 py-3">
          <span className="px-2 py-1 text-base font-semibold capitalize">
            {`${MESES[month.getMonth()]} ${year}`}
          </span>
        </div>

        <DayPicker
          month={month}
          locale={locale}
          showOutsideDays
          hideNavigation
          weekStartsOn={0}
          formatters={{
            formatWeekdayName: (date) =>
              date.toLocaleString("es-CO", { weekday: "short" }).replace(".", "").slice(0, 3),
          }}
          classNames={{
            root: cn("w-full overflow-x-auto", defaultClassNames.root),
            months: cn("relative flex min-w-[840px] flex-col", defaultClassNames.months),
            month: cn("flex w-full flex-col", defaultClassNames.month),
            month_caption: "hidden",
            caption_label: "hidden",
            button_previous: "hidden",
            button_next: "hidden",
            month_grid: cn("w-full border-collapse", defaultClassNames.month_grid),
            weekdays: cn("flex w-full min-w-[840px] border-b border-muted-22", defaultClassNames.weekdays),
            weekday: cn(
              "max-w-(--asistencia-cell-max-width) min-w-0 flex-1 border-r border-muted-22 py-2.5 text-center text-xs font-normal tracking-wide text-muted-foreground uppercase select-none last:border-r-0",
              defaultClassNames.weekday,
            ),
            week: cn("flex w-full min-w-[840px]", defaultClassNames.week),
            today: "",
          }}
          components={{ Day: GridDay }}
        />
      </div>
    </MonthGridContext.Provider>
  )
}

// Day estable: definido inline, DayPicker remontaba cada celda (y cerraba el popover) en cada render.
const MonthGridContext = React.createContext<Omit<AsistenciaMonthGridProps, "month" | "locale"> | null>(null)

function GridDay({ day, modifiers, className, ...tdProps }: DayProps) {
  const { events, inhabiles, manualSede, restrictedView } =
    React.useContext(MonthGridContext)!
    const date = day.date
    const isOutside = Boolean(modifiers.outside)
    const isToday = Boolean(modifiers.today) && !isOutside
    const items = isOutside ? [] : (events.get(date.getDate()) ?? [])
    const inhabilesDia = isOutside ? [] : (inhabiles.get(date.getDate()) ?? [])
    const motivoInhabil = textoInhabil(inhabilesDia)
    return (
      <td
        {...tdProps}
        className={cn(
          "max-w-(--asistencia-cell-max-width) min-w-0 flex-1 overflow-hidden border-r border-b border-muted-22 p-0 align-top last:border-r-0",
          isOutside && "bg-muted/20",
          motivoInhabil && "bg-muted/40",
          className,
        )}
      >
        {(() => {
          const cellBody = (
            <div
              className={cn(
                "flex h-(--cell-size) w-full min-w-0 flex-col gap-1 overflow-hidden px-2 py-1.5",
                isOutside && "text-muted-foreground/50",
              )}
            >
              <span
                className={cn(
                  "flex size-6 shrink-0 items-center justify-center self-end rounded-none text-sm leading-none",
                  isToday && "bg-primary text-primary-foreground font-semibold",
                )}
              >
                {date.getDate()}
              </span>
              {motivoInhabil && (
                <span
                  className="truncate text-xs text-muted-foreground"
                  title={motivoInhabil}
                  aria-label={`Día inhábil: ${motivoInhabil}`}
                >
                  {motivoInhabil}
                </span>
              )}
              {items.length > 0 && (
                <ul className="flex min-h-0 min-w-0 flex-1 flex-col gap-0.5 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  {restrictedView
                    ?
                      gradosDelDia(items).map(({ grado, jornada, cantidad, estado }) => {
                        const EstadoIcon = ESTADO_SESION_ICON[estado]
                        return (
                          <li
                            key={`${grado}-${jornada}`}
                            className="flex min-w-0 shrink-0 items-center gap-1 text-xs leading-tight"
                            title={`${formatGrado(grado)} (${jornada}) · ${cantidad} clases`}
                          >
                            <EstadoIcon
                              className={cn("size-3 shrink-0", ESTADO_SESION_COLOR[estado])}
                            />
                            <span className="shrink-0 font-semibold">{formatGrado(grado)}</span>
                            <span className="shrink-0 rounded-sm bg-muted px-0.5 text-[10px] font-semibold text-muted-foreground">
                              {jornada}
                            </span>
                            <span aria-hidden className="shrink-0 text-muted-foreground/40">
                              |
                            </span>
                            <span className="min-w-0 flex-1 truncate">{cantidad} clases</span>
                          </li>
                        )
                      })
                    : items.map((item) => {
                        const { id, grado, grupo, jornada, estado } = item
                        const nombre = nombreSesion(item)
                        const EstadoIcon = ESTADO_SESION_ICON[estado]
                        return (
                          <li
                            key={id}
                            className="flex min-w-0 shrink-0 items-center gap-1 text-xs leading-tight"
                            title={`${grado}${grupo} (${jornada}) · ${nombre}`}
                          >
                            <EstadoIcon
                              className={cn("size-3 shrink-0", ESTADO_SESION_COLOR[estado])}
                            />
                            <span className="shrink-0 font-semibold">{grado}{grupo}</span>
                            <span className="shrink-0 rounded-sm bg-muted px-0.5 text-[10px] font-semibold text-muted-foreground">
                              {jornada}
                            </span>
                            <span aria-hidden className="shrink-0 text-muted-foreground/40">
                              |
                            </span>
                            <span className="min-w-0 flex-1 truncate">{nombre}</span>
                          </li>
                        )
                      })}
                </ul>
              )}
            </div>
          )
          if (items.length === 0) return cellBody

          if (restrictedView) {
            return (
              <AsistenciaDayCellRectorPopover items={items} seguimientoSede={manualSede}>{cellBody}</AsistenciaDayCellRectorPopover>
            )
          }

          return (
            <DayCellPopover
              items={items}
              manualSede={manualSede}
            >
              {cellBody}
            </DayCellPopover>
          )
        })()}
      </td>
    )
}

function gradosDelDia(
  items: AsistenciaDayEntry[],
): { grado: string; jornada: string; cantidad: number; estado: EstadoSesion }[] {
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
      cantidad: entries.length,
      estado: peorEstado(entries.map((e) => e.estado)),
    }))
    .sort((a, b) => a.grado.localeCompare(b.grado) || a.jornada.localeCompare(b.jornada))
}

function formatFechaTitulo(fecha: string): string {
  const [anio, mes, dia] = fecha.split("-").map(Number)
  const texto = new Date(anio, mes - 1, dia).toLocaleDateString("es-CO", {
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })
  return texto.charAt(0).toUpperCase() + texto.slice(1).replace(",", "")
}

/** Planilla de una clase propia: `Volver` regresa al Calendario. */
function hrefPlanilla(item: AsistenciaDayEntry, sede: number) {
  return {
    to: paths.app.asistenciaManual.getHref(),
    search: {
      fecha: item.fecha,
      sede,
      grupo: item.fkGrupo,
      asignatura: item.fkAsignatura,
      desde: "calendario" as const,
    },
  }
}

function horaCorta(iso: string | null): string | null {
  if (!iso) return null
  // Del string, sin Date: el huso del navegador corría la hora (08:00 → 3:00).
  return formatHora(iso)
}

/** Una fila de "elija la clase": hora · Grado/Grupo · [Área], estado y flecha. */
function ClaseDelDia({ item, sede }: { item: AsistenciaDayEntry; sede: number }) {
  const { to, search } = hrefPlanilla(item, sede)
  // Punto "Pendiente" del día: cualquier op de la sesión (grupo + fecha) en cola.
  const ops = useOutboxOps()
  const prefijo = `asistencia:sesion:${item.fkGrupo}:`
  const pendiente = pendingStatusOf(ops, (k) => k.startsWith(prefijo) && k.includes(`:${item.fecha}:`))
  const hora = horaCorta(item.horaInicio)
  const EstadoIcon = ESTADO_SESION_ICON[item.estado]
  // Misma fila compacta que las clases del grupo: estado, hora, grupo, jornada y [Área].
  return (
    <li>
      <Link
        to={to}
        search={search}
        title={ESTADO_SESION_LABELS[item.estado].title}
        className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted/40 focus-visible:outline-2 focus-visible:outline-primary"
      >
        <EstadoIcon className={cn("size-3.5 shrink-0", ESTADO_SESION_COLOR[item.estado])} />
        {hora && <span className="shrink-0 text-xs text-muted-foreground tabular-nums">{hora}</span>}
        <span className="shrink-0 font-medium">
          {formatGrado(item.grado)}
          {item.grupo}
        </span>
        <span className="shrink-0 rounded-sm bg-muted px-1 text-[10px] font-semibold text-muted-foreground">
          {item.jornada}
        </span>
        <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">{nombreSesion(item)}</span>
        {pendiente && <PendingStatusBadge status={pendiente} />}
        <CaretRightIcon className="size-3.5 shrink-0 text-muted-foreground" />
      </Link>
    </li>
  )
}

interface DayCellPopoverProps {
  items: AsistenciaDayEntry[]
  manualSede: number
  children: React.ReactNode
}

/** Sección 7: al elegir un día, si tiene una sola clase se abre su planilla;
 *  si tiene varias, se elige la clase. */
function DayCellPopover({ items, manualSede, children }: DayCellPopoverProps) {
  const [open, setOpen] = React.useState(false)
  const fecha = items[0]?.fecha
  const futura = Boolean(fecha) && esFechaFutura(fecha)
  const misClases = items.filter((item) => item.puedeEditar)
  const clasesDelGrupo = items.filter((item) => !item.puedeEditar)

  if (!futura && misClases.length === 1 && clasesDelGrupo.length === 0) {
    const { to, search } = hrefPlanilla(misClases[0], manualSede)
    return (
      <Link
        to={to}
        search={search}
        className="block h-full w-full min-w-0 text-left"
        aria-label="Abrir la planilla de esta clase"
      >
        {children}
      </Link>
    )
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger render={<button type="button" className="h-full w-full min-w-0 text-left" />}>
        {children}
      </PopoverTrigger>
      <PopoverContent align="start" className="w-80 gap-2 p-2">
        <div className="flex items-center justify-between px-2 pt-1">
          <span className="text-sm font-semibold">
            {fecha ? formatFechaTitulo(fecha) : ""}
            {!futura && misClases.length > 0 && (
              <span className="font-normal text-muted-foreground"> · elija la clase</span>
            )}
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

        {futura ? (
          <p className="px-2 pb-1 text-xs text-muted-foreground">
            Todavía no se puede tomar asistencia: es una fecha futura.
          </p>
        ) : (
          <div className="flex max-h-96 flex-col gap-2 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {misClases.length > 0 && (
              <ul className="flex flex-col">
                {misClases.map((item) => (
                  <ClaseDelDia key={item.id} item={item} sede={manualSede} />
                ))}
              </ul>
            )}
            {clasesDelGrupo.length > 0 && (
              <div className="flex flex-col gap-2 border-t border-border px-2 pt-2">
                <span className="text-xs font-semibold text-muted-foreground">
                  Clases de su grupo (solo lectura)
                </span>
                {/* Clases ajenas: cada materia abre su planilla en solo lectura. */}
                <AsistenciaGrupoDrillDown items={clasesDelGrupo} omitirGrados seguimientoSede={manualSede} />
              </div>
            )}
          </div>
        )}
      </PopoverContent>
    </Popover>
  )
}

/** "Festivo · Día de la Raza" por cada motivo distinto del día; con varias
 *  jornadas en la sede y motivos distintos, antepone la jornada. */
function textoInhabil(dias: DiaInhabil[]): string | null {
  if (dias.length === 0) return null
  const textos = new Set(
    dias.map((d) => [TIPO_DIA_INHABIL_LABEL[d.tipo], d.motivo].filter(Boolean).join(" · ")),
  )
  if (textos.size === 1) return [...textos][0]
  return dias
    .map((d) => `${d.jornada ?? ""}: ${[TIPO_DIA_INHABIL_LABEL[d.tipo], d.motivo].filter(Boolean).join(" · ")}`)
    .join(" / ")
}
