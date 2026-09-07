import * as React from "react"
import { Link } from "@tanstack/react-router"
import { DayPicker, getDefaultClassNames, type Locale } from "react-day-picker"
import { es } from "date-fns/locale"

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { CheckCircleFillIcon, ClipboardTextIcon, SpinnerIcon, XIcon } from "@/components/ui/icons"
import { cn } from "@/lib/utils"

import { paths } from "@/config/paths"
import type { EstadoSesion } from "@/features/academic-management/asistencia/api/types/asistencia"
import { ESTADO_SESION_COLOR, ESTADO_SESION_ICON, formatGrado, formatHoraRango, peorEstado } from "@/features/academic-management/asistencia/api/ui-mappings"
import { AsistenciaDayCellRectorPopover } from "@/features/academic-management/asistencia/components/asistencia-day-cell-rector-popover"

export interface AsistenciaDayEntry {
  id: string
  fecha: string
  /** `null` = toma suelta sin bloque (`TASISTENCIA.BLOQUE` nulo). */
  bloque: number | null
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
}

/** Nombre a mostrar: la actividad si la sesión es formativa, la asignatura si no. */
export function nombreSesion(entry: Pick<AsistenciaDayEntry, "esFormativa" | "actividad" | "asignatura">): string {
  return entry.esFormativa ? (entry.actividad ?? "Actividad") : entry.asignatura
}

interface AsistenciaMonthGridProps {
  month: Date
  events: Map<number, AsistenciaDayEntry[]>
  locale?: Locale
  onMarkAllPresent: (entry: AsistenciaDayEntry) => void
  markingEntryId: string | null
  markedEntryIds: Set<string>
  manualSede: number
  restrictedView: boolean
}

const MESES = Array.from({ length: 12 }, (_, i) =>
  new Date(2000, i, 1).toLocaleString("es-CO", { month: "long" }),
)

export function AsistenciaMonthGrid({
  month,
  events,
  locale = es,
  onMarkAllPresent,
  markingEntryId,
  markedEntryIds,
  manualSede,
  restrictedView,
}: AsistenciaMonthGridProps) {
  const defaultClassNames = getDefaultClassNames()
  const year = month.getFullYear()

  return (
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
        components={{
          Day: ({ day, modifiers, className, ...tdProps }) => {
            const date = day.date
            const isOutside = Boolean(modifiers.outside)
            const isToday = Boolean(modifiers.today) && !isOutside
            const items = isOutside ? [] : (events.get(date.getDate()) ?? [])
            return (
              <td
                {...tdProps}
                className={cn(
                  "max-w-(--asistencia-cell-max-width) min-w-0 flex-1 overflow-hidden border-r border-b border-muted-22 p-0 align-top last:border-r-0",
                  isOutside && "bg-muted/20",
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
                      <AsistenciaDayCellRectorPopover items={items}>{cellBody}</AsistenciaDayCellRectorPopover>
                    )
                  }

                  return (
                    <DayCellPopover
                      items={items}
                      onMarkAllPresent={onMarkAllPresent}
                      markingEntryId={markingEntryId}
                      markedEntryIds={markedEntryIds}
                      manualSede={manualSede}
                    >
                      {cellBody}
                    </DayCellPopover>
                  )
                })()}
              </td>
            )
          },
        }}
      />
    </div>
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

function formatFechaLarga(fecha: string): string {
  const [anio, mes, dia] = fecha.split("-").map(Number)
  return new Date(anio, mes - 1, dia).toLocaleDateString("es-CO", {
    day: "numeric",
    month: "long",
  })
}

interface DayCellPopoverProps {
  items: AsistenciaDayEntry[]
  onMarkAllPresent: (entry: AsistenciaDayEntry) => void
  markingEntryId: string | null
  markedEntryIds: Set<string>
  manualSede: number
  children: React.ReactNode
}


function DayCellPopover({
  items,
  onMarkAllPresent,
  markingEntryId,
  markedEntryIds,
  manualSede,
  children,
}: DayCellPopoverProps) {
  const [open, setOpen] = React.useState(false)
  const fecha = items[0]?.fecha

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={<button type="button" className="h-full w-full min-w-0 text-left" />}
      >
        {children}
      </PopoverTrigger>
      <PopoverContent align="start" className="w-64 gap-3 p-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold capitalize">{fecha ? formatFechaLarga(fecha) : ""}</span>
          <button
            type="button"
            aria-label="Cerrar"
            className="text-muted-foreground hover:text-foreground"
            onClick={() => setOpen(false)}
          >
            <XIcon className="size-4" />
          </button>
        </div>

        <ul className="flex max-h-80 flex-col gap-3 overflow-y-auto pr-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {items.map((item) => {
            const marcado = markedEntryIds.has(item.id)
            const horaRango = formatHoraRango(item.horaInicio, item.horaFin)
            return (
              <li key={item.id} className="flex flex-col gap-1">
                <span className="text-xs font-semibold text-muted-foreground">
                  {item.grado}{item.grupo} ({item.jornada})
                </span>
                <div className="flex flex-wrap items-baseline justify-between gap-x-2">
                  <span className="text-sm font-medium">{nombreSesion(item)}</span>
                  {horaRango && <span className="shrink-0 text-xs text-muted-foreground">{horaRango}</span>}
                </div>
                <button
                  type="button"
                  disabled={markingEntryId !== null}
                  onClick={() => onMarkAllPresent(item)}
                  className={cn(
                    "flex items-center gap-2 text-xs disabled:pointer-events-none disabled:opacity-50",
                    marcado ? "text-green" : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {markingEntryId === item.id ? (
                    <SpinnerIcon className="size-3.5 animate-spin" />
                  ) : marcado ? (
                    <CheckCircleFillIcon className="size-3.5 shrink-0" aria-hidden="true" />
                  ) : (
                    <span className="size-3.5 shrink-0 rounded-full border border-border" aria-hidden="true" />
                  )}
                  Marcar todo como Asistió
                </button>
              </li>
            )
          })}
        </ul>

        <Button
          variant="ghost"
          color="neutral"
          size="xs"
          className="justify-start gap-2 px-0"
          render={
            <Link
              to={paths.app.asistenciaManual.getHref()}
              search={{ fecha, sede: manualSede }}
            />
          }
          nativeButton={false}
        >
          <ClipboardTextIcon className="size-4" />
          Asistencia manual
        </Button>
      </PopoverContent>
    </Popover>
  )
}
