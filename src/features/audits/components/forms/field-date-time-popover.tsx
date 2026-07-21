import { CalendarIcon, ClockIcon } from "@phosphor-icons/react"
import { format, parseISO, setHours, setMinutes } from "date-fns"
import { es } from "date-fns/locale"

import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Field, FieldLabel } from "@/components/ui/field"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Separator } from "@/components/ui/separator"
import { TimePicker } from "@/components/ui/time-picker"
import { cn } from "@/lib/utils"

// Formato del valor que sube al form: fecha + hora en un solo string,
// sin timezone (hora local tal cual la eligió el usuario). date-fns
// `parseISO` la interpreta como local — no como UTC — que es lo que
// queremos acá (a diferencia de `new Date(str)` con un string sin "Z",
// que también es local, pero parseISO es explícito sobre eso).
const DATE_TIME_FORMAT = "yyyy-MM-dd'T'HH:mm"

interface FieldDateTimePopoverProps {
  label: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
}

/**
 * Campo "fecha + hora": un popover principal compacto con el
 * `Calendar` (modo día único — cada extremo del filtro, Desde/Hasta,
 * es su propio campo independiente, no un rango) más una fila resumen
 * con la hora elegida. El `TimePicker` completo (con el clock-face)
 * solo se abre en un SEGUNDO popover anidado al tocar esa fila —
 * así el popover principal no crece de más mostrando el picker
 * entero todo el tiempo. Popover-dentro-de-Popover es válido acá:
 * son dos overlays anclados independientes, no un modal dentro de
 * otro modal.
 */
export function FieldDateTimePopover({
  label,
  value,
  onChange,
  placeholder = "Elegí fecha y hora",
}: FieldDateTimePopoverProps) {
  const selected = value ? parseISO(value) : undefined

  const displayLabel = selected
    ? format(selected, "d MMM yyyy, HH:mm", { locale: es })
    : placeholder

  const timeValue = selected ? format(selected, "HH:mm") : undefined
  const timeLabel = selected ? format(selected, "HH:mm") : "--:--"

  function handleSelectDate(date: Date | undefined) {
    if (!date) {
      onChange("")
      return
    }
    // Si ya había una hora elegida, la preservamos al cambiar de día.
    const next = selected
      ? setMinutes(setHours(date, selected.getHours()), selected.getMinutes())
      : date
    onChange(format(next, DATE_TIME_FORMAT))
  }

  function handleTimeChange(time: string) {
    const [h, m] = time.split(":").map(Number)
    const base = selected ?? new Date()
    const next = setMinutes(setHours(base, h), m)
    onChange(format(next, DATE_TIME_FORMAT))
  }

  return (
    <Field orientation="vertical" className="gap-2">
      <FieldLabel>{label}</FieldLabel>
      <Popover>
        {/* El trigger NO es un botón visualmente: se estila como el
            `Input` del resto del form (fondo transparente, solo borde
            inferior) para que el campo se lea como un input con
            popover y no como un botón relleno. */}
        <PopoverTrigger
          render={
            <button
              type="button"
              className={cn(
                "flex h-9 w-full min-w-0 cursor-pointer items-center gap-2 border border-transparent border-b-input bg-transparent px-0 py-1 text-left text-base transition-[color,border-color] outline-none hover:border-b-ring/50 focus-visible:border-b-ring data-[popup-open]:border-b-ring md:text-sm",
                selected ? "text-foreground" : "text-muted-foreground"
              )}
            />
          }
        >
          <CalendarIcon className="size-4 shrink-0 text-muted-foreground" />
          {displayLabel}
        </PopoverTrigger>
        <PopoverContent className="w-auto gap-0 p-0" align="start">
          <Calendar
            mode="single"
            selected={selected}
            onSelect={handleSelectDate}
            locale={es}
          />
          <Separator />
          {/* Botón de hora a todo el ancho — sin label al lado (el
              ícono de reloj + el placeholder "--:--" ya dejan claro
              qué es). El TimePicker completo (clock-face incluido)
              solo aparece al abrir este segundo popover, no ocupa
              espacio en el popover principal. */}
          <Popover>
            <PopoverTrigger
              render={
                <Button
                  type="button"
                  variant="ghost"
                  className="w-full justify-start rounded-none font-normal"
                />
              }
            >
              <ClockIcon data-icon="inline-start" />
              {timeLabel}
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <TimePicker value={timeValue} onChange={handleTimeChange} />
            </PopoverContent>
          </Popover>
        </PopoverContent>
      </Popover>
    </Field>
  )
}
