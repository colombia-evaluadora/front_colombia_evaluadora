import { DayPicker, getDefaultClassNames, type Locale } from "react-day-picker"
import { es } from "date-fns/locale"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { CaretDownIcon } from "@/components/ui/icons"
import { cn } from "@/lib/utils"

import type { ActividadStatus } from "@/features/planeador/api/types/actividad"
import { statusRingFor } from "@/features/planeador/api/ui-mappings"

/**
 * Grilla mensual del Planeador: muestra un mes con las actividades de cada
 * día listadas como filas (barra de color del estado + código de 3 dígitos
 * + asignatura). NO es un selector de un solo día para filtrar la vista —
 * el click en una celda (`onDayClick`, opcional) abre el alta de una
 * Actividad NUEVA con esa fecha preseleccionada, no cambia lo que se está
 * mirando acá. Deshabilitado en días de mes vecino (`showOutsideDays`). Lo
 * otro interactivo es el título del mes, que abre un menú para cambiar de
 * mes/año. Se construye sobre `react-day-picker` directo en lugar del
 * wrapper `Calendar` del design system porque este último está acoplado a
 * DatePicker (caption + drill-down día/mes/año) y no permite el formato
 * visual pedido.
 *
 * Los classNames del DayPicker siguen el patrón del wrapper `Calendar`
 * existente: `month_grid: w-full border-collapse`, `weekdays: flex`,
 * `week: flex w-full`, `weekday: flex-1` — sin esto la grilla colapsa a
 * una sola columna en lugar de 7.
 *
 * Marco: todo (barra del mes + fila de días + celdas) vive dentro de una
 * card con `border` y `overflow-hidden`; las líneas internas las pinta cada
 * celda con su borde derecho e inferior y `border-collapse` evita que se
 * dupliquen. La última columna no pinta borde derecho porque ahí ya cierra
 * el marco de la card.
 */

/** Una actividad tal como se lista dentro de la celda de su día. */
export interface DayEvent {
  /** Id de la actividad — clave de la fila; el código puede repetirse. */
  id: number
  /** Código corto de la actividad (3 dígitos). */
  code: string
  /** Texto a la derecha del código — hoy la asignatura. */
  label: string
  /** Define el color de la barra izquierda vía `STATUS_RING`. */
  status: ActividadStatus
}

interface PlaneadorMonthGridProps {
  /** Mes que se está mostrando (primer día del mes, hora neutral). */
  month: Date
  /** Mapa `day-of-month → actividades`. La grilla muestra las primeras 3. */
  events: Map<number, DayEvent[]>
  onMonthChange: (next: Date) => void
  /** Click en una celda de día (no en un mes vecino, ver `isOutside` más
   *  abajo) — hoy lo usa `planeador-page.tsx` para abrir el alta de
   *  Actividad con esa fecha preseleccionada como inicio/cierre. Opcional:
   *  sin esto la celda vuelve a ser puramente decorativa, como antes. */
  onDayClick?: (date: Date) => void
  locale?: Locale
}

/**
 * Filas visibles por celda. Un día puede tener más actividades —incluso con
 * el mismo código— y el resto se resume en un "+N más" para que la celda no
 * crezca sin control ni descuadre el alto de la semana.
 */
const MAX_ROWS = 3

const MESES = Array.from({ length: 12 }, (_, i) =>
  new Date(2000, i, 1).toLocaleString("es-CO", { month: "long" }),
)

export function PlaneadorMonthGrid({
  month,
  events,
  onMonthChange,
  onDayClick,
  locale = es,
}: PlaneadorMonthGridProps) {
  const defaultClassNames = getDefaultClassNames()
  const year = month.getFullYear()

  return (
    <div
      data-slot="planeador-month-grid"
      className={cn(
        // Cell-size: alto mínimo de celda. spacing(24) = 6rem = ~96px, que es
        // lo que necesita el número del día más tres filas de actividad sin
        // que el alto salte entre semanas con distinta carga.
        "w-full overflow-hidden rounded-lg border bg-card [--cell-radius:var(--radius)] [--cell-size:--spacing(24)]",
        defaultClassNames.root,
      )}
    >
      {/* Barra superior: el mes centrado, con menú para cambiar mes/año. */}
      <div className="flex items-center justify-center border-b border-muted-22 px-3 py-3">
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <button
                type="button"
                className="flex items-center gap-1 rounded-md px-2 py-1 text-base font-semibold capitalize transition-colors hover:bg-muted/40 focus-visible:outline-2 focus-visible:outline-ring"
                aria-label={`Mes: ${MESES[month.getMonth()]} ${year}. Cambiar`}
              />
            }
          >
            {MESES[month.getMonth()]}
            <CaretDownIcon className="size-4 text-muted-foreground" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="center" className="min-w-44">
            {MESES.map((nombre, i) => (
              <DropdownMenuItem
                key={nombre}
                className={cn("capitalize", i === month.getMonth() && "font-semibold")}
                onClick={() => onMonthChange(new Date(year, i, 1))}
              >
                {nombre}
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => onMonthChange(new Date(year - 1, month.getMonth(), 1))}>
              {`Ir a ${year - 1}`}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onMonthChange(new Date(year + 1, month.getMonth(), 1))}>
              {`Ir a ${year + 1}`}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <DayPicker
        month={month}
        locale={locale}
        // Sin `mode`: el calendario es de sólo lectura. Además el
        // componente `Day` reemplaza la celda completa, así que
        // DayPicker ni siquiera monta su botón de selección.
        showOutsideDays
        hideNavigation
        weekStartsOn={0}
        formatters={{
          // DOM · LUN · MAR … como en el mockup (3 letras, sin punto).
          formatWeekdayName: (date) =>
            date.toLocaleString("es-CO", { weekday: "short" }).replace(".", "").slice(0, 3),
        }}
        classNames={{
          root: cn("w-full", defaultClassNames.root),
          months: cn("relative flex flex-col", defaultClassNames.months),
          month: cn("flex w-full flex-col", defaultClassNames.month),
          month_caption: "hidden",
          caption_label: "hidden",
          button_previous: "hidden",
          button_next: "hidden",
          month_grid: cn("w-full border-collapse", defaultClassNames.month_grid),
          weekdays: cn("flex w-full border-b border-muted-22", defaultClassNames.weekdays),
          weekday: cn(
            "flex-1 border-r border-muted-22 py-2.5 text-center text-xs font-normal tracking-wide text-muted-foreground uppercase select-none last:border-r-0",
            defaultClassNames.weekday,
          ),
          week: cn("flex w-full", defaultClassNames.week),
          // El día de hoy no se marca acá sino en el `span` del número
          // dentro del componente `Day` (cuadro primary), para no teñir la
          // celda entera.
          today: "",
        }}
        components={{
          // Reemplaza la celda `td` completa: número alineado a la derecha y,
          // debajo, la lista de actividades alineada a la izquierda.
          // `day.date` da la fecha real, incluyendo días de meses vecinos
          // cuando `showOutsideDays` está activo; esos se pintan en gris y
          // sin actividades, igual que en el mockup.
          Day: ({ day, modifiers, className, ...tdProps }) => {
            const date = day.date
            const isOutside = Boolean(modifiers.outside)
            // `modifiers.today` también marca el día de hoy cuando cae en un
            // mes vecino visible; ahí no lo resaltamos porque el usuario
            // está mirando otro mes.
            const isToday = Boolean(modifiers.today) && !isOutside
            // Si es día de otro mes no listamos nada aunque el código exista
            // en el mapa del mes visible: el usuario está mirando otro mes y
            // las actividades se verían "huérfanas" en días sin contexto.
            const items = isOutside ? [] : events.get(date.getDate()) ?? []
            // Click de día: abre el alta de Actividad con esta fecha como
            // inicio/cierre preseleccionado (ver `onDayClick` en
            // `planeador-page.tsx`). Deshabilitado en días de mes vecino
            // (`isOutside`) -- mismo criterio que las actividades, que
            // tampoco se listan ahí: click en un día "fuera de contexto"
            // confundiría más de lo que ayuda.
            const clickable = Boolean(onDayClick) && !isOutside
            return (
              <td
                {...tdProps}
                className={cn(
                  // `min-w-0` + `overflow-hidden`: sin esto el `td`, como
                  // item flex, toma su ancho mínimo del contenido y una
                  // asignatura larga ("Ciencias Naturales") ensancha la
                  // columna y se desborda sobre la celda vecina en vez de
                  // truncarse.
                  "min-w-0 flex-1 overflow-hidden border-r border-b border-muted-22 p-0 align-top last:border-r-0",
                  isOutside && "bg-muted/20",
                  className,
                )}
              >
                <div
                  role={clickable ? "button" : undefined}
                  tabIndex={clickable ? 0 : undefined}
                  onClick={clickable ? () => onDayClick?.(date) : undefined}
                  onKeyDown={
                    clickable
                      ? (e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault()
                            onDayClick?.(date)
                          }
                        }
                      : undefined
                  }
                  aria-label={
                    clickable
                      ? `Crear actividad el ${date.toLocaleDateString("es-CO", { day: "2-digit", month: "long" })}`
                      : undefined
                  }
                  className={cn(
                    // `min-h` mantiene todas las celdas del mismo alto aunque
                    // el día no tenga actividades. `min-w-0` deja que las
                    // filas trunquen en vez de ensanchar la columna.
                    "flex h-full min-h-(--cell-size) w-full min-w-0 flex-col gap-1 px-2 py-1.5",
                    isOutside && "text-muted-foreground/50",
                    clickable && "cursor-pointer transition-colors hover:bg-muted/40 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring",
                  )}
                >
                  {/* Caja fija para el número: así todas las celdas alinean
                      igual, tenga o no el resalte de "hoy". */}
                  <span
                    className={cn(
                      "flex size-6 shrink-0 items-center justify-center self-end rounded-none text-sm leading-none",
                      isToday && "bg-primary text-primary-foreground font-semibold",
                    )}
                  >
                    {date.getDate()}
                  </span>
                  {items.length > 0 && (
                    <ul className="flex min-w-0 flex-col gap-0.5">
                      {items.slice(0, MAX_ROWS).map(({ id, code, label, status }) => (
                        <li
                          key={id}
                          className="flex min-w-0 items-center gap-1 text-xs leading-tight"
                          title={`${code} · ${label}`}
                        >
                          {/* Barra de color del estado: reemplaza al badge —
                              el color queda como pista y el código se lee
                              como texto plano, más denso en la celda. */}
                          <span
                            aria-hidden
                            className={cn("h-3.5 w-1 shrink-0 rounded-full", statusRingFor(status))}
                          />
                          <span className="shrink-0 font-semibold">{code}</span>
                          <span aria-hidden className="shrink-0 text-muted-foreground/40">
                            |
                          </span>
                          <span className="truncate">{label}</span>
                        </li>
                      ))}
                      {items.length > MAX_ROWS && (
                        <li className="text-muted-foreground pl-2 text-xs leading-tight">
                          {`+${items.length - MAX_ROWS} más`}
                        </li>
                      )}
                    </ul>
                  )}
                </div>
              </td>
            )
          },
        }}
      />
    </div>
  )
}
