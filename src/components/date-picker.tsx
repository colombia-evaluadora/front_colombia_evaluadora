import * as React from "react"
import { format, setHours, setMinutes } from "date-fns"
import { es } from "date-fns/locale"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"
import { useFieldVariant } from "@/hooks/use-field-variant"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { CalendarIcon, ClockIcon } from "@/components/ui/icons"
import { inputVariants } from "@/components/ui/input"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Separator } from "@/components/ui/separator"
import { TimePickerPanel, formatTimeLabel } from "@/components/ui/time-picker"

/**
 * Capa que se compone encima de `inputVariants`: aporta el layout del trigger
 * (que es un `button`, no un `input`) y el estado abierto. Es el equivalente
 * del `focus-visible` del input — como el foco vive en el popup mientras el
 * panel está desplegado, el borde tiene que reaccionar a `data-popup-open`
 * para que el campo no se "apague".
 */
const pickerTriggerVariants = cva(
  "flex cursor-pointer items-center gap-2 text-left",
  {
    variants: {
      variant: {
        standard: "data-[popup-open]:border-b-ring",
        outlined:
          "data-[popup-open]:border-ring data-[popup-open]:ring-2 data-[popup-open]:ring-ring/20",
        filled: "data-[popup-open]:border-b-ring data-[popup-open]:bg-muted/50",
      },
    },
    defaultVariants: {
      variant: "standard",
    },
  }
)

type PickerBaseProps = VariantProps<typeof inputVariants> & {
  /** Texto cuando no hay valor; ocupa el lugar del `placeholder` del input. */
  placeholder?: string
  disabled?: boolean
  id?: string
  className?: string
  align?: React.ComponentProps<typeof PopoverContent>["align"]
  "aria-invalid"?: boolean
  "aria-describedby"?: string
}

type DatePickerProps = PickerBaseProps &
  (
    | {
        /** Solo calendario. Es el modo por defecto. */
        mode?: "date"
        value?: Date
        onChange?: (value: Date | undefined) => void
        /** Formato de `date-fns` para el texto del trigger. */
        dateFormat?: string
      }
    | {
        /** Calendario + hora en el mismo popover. */
        mode: "datetime"
        value?: Date
        onChange?: (value: Date | undefined) => void
        dateFormat?: string
      }
    | {
        /** Solo hora, en 24h (`"HH:mm"`); se muestra en 12h con AM/PM. */
        mode: "time"
        value?: string
        onChange?: (value: string) => void
      }
  )

const DEFAULT_PLACEHOLDER = {
  date: "Elegir fecha",
  time: "Elegir hora",
  datetime: "Elegir fecha y hora",
} as const

const DEFAULT_FORMAT = {
  date: "d MMM yyyy",
  datetime: "d MMM yyyy, HH:mm",
} as const

/**
 * Selector de fecha y/u hora que se ve y se comporta como un `Input`: comparte
 * `inputVariants` y lee la variante del `Field` contenedor por contexto, así
 * que dentro de un `<Field variant="outlined">` con su `FieldLabel` flotante
 * se alinea igual que cualquier input del formulario.
 *
 * El `mode` decide qué panel se abre y de qué tipo es el valor: `Date` en
 * `date`/`datetime`, `"HH:mm"` en `time`.
 */
function DatePicker(props: DatePickerProps) {
  const {
    mode = "date",
    placeholder = DEFAULT_PLACEHOLDER[mode],
    variant,
    align = "start",
    className,
    id,
    disabled,
    "aria-invalid": ariaInvalid,
    "aria-describedby": ariaDescribedby,
  } = props

  const [open, setOpen] = React.useState(false)

  const fieldVariant = useFieldVariant()
  const resolvedVariant =
    variant ?? (fieldVariant === "plain" ? "standard" : fieldVariant)

  // En `time` el valor es un string y no hay fecha; en el resto la hora se
  // deriva de la fecha para alimentar el panel de reloj.
  const dateValue = props.mode === "time" ? undefined : props.value
  const timeValue =
    props.mode === "time"
      ? props.value
      : dateValue
        ? format(dateValue, "HH:mm")
        : undefined

  const displayValue =
    props.mode === "time"
      ? formatTimeLabel(timeValue)
      : dateValue
        ? format(
            dateValue,
            props.dateFormat ??
              (props.mode === "datetime"
                ? DEFAULT_FORMAT.datetime
                : DEFAULT_FORMAT.date),
            { locale: es }
          )
        : undefined

  function handleSelectDate(date: Date | undefined) {
    if (props.mode === "time") return
    // El calendario devuelve el día a medianoche: si ya había hora elegida,
    // la conservamos en vez de resetearla a las 00:00.
    props.onChange?.(
      date && props.value
        ? setMinutes(setHours(date, props.value.getHours()), props.value.getMinutes())
        : date
    )
    // En `datetime` el popover sigue abierto: falta elegir la hora.
    if (props.mode !== "datetime") setOpen(false)
  }

  function handleChangeTime(time: string) {
    const [hours, minutes] = time.split(":").map(Number)
    if (props.mode === "time") {
      props.onChange?.(time)
      return
    }
    props.onChange?.(setMinutes(setHours(props.value ?? new Date(), hours), minutes))
  }

  const Icon = mode === "time" ? ClockIcon : CalendarIcon

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <button
            type="button"
            data-slot="date-picker"
            id={id}
            disabled={disabled}
            aria-invalid={ariaInvalid}
            aria-describedby={ariaDescribedby}
            className={cn(
              inputVariants({ variant: resolvedVariant }),
              pickerTriggerVariants({ variant: resolvedVariant }),
              !displayValue && "text-muted-foreground",
              className
            )}
          />
        }
      >
        <Icon
          className="text-muted-foreground size-4 shrink-0"
          aria-hidden="true"
        />
        <span className="min-w-0 flex-1 truncate">
          {displayValue ?? placeholder}
        </span>
      </PopoverTrigger>

      <PopoverContent className="w-auto gap-0 p-0" align={align}>
        {mode === "time" ? (
          <TimePickerPanel value={timeValue} onChange={handleChangeTime} />
        ) : (
          <>
            <Calendar
              mode="single"
              selected={dateValue}
              onSelect={handleSelectDate}
              locale={es}
            />
            {/* En `datetime` la hora va detrás de un botón: el panel de reloj
                no entra al lado del calendario sin desbordar el popover. */}
            {mode === "datetime" && (
              <>
                <Separator />
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
                    {formatTimeLabel(timeValue) ?? "--:--"}
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <TimePickerPanel
                      value={timeValue}
                      onChange={handleChangeTime}
                    />
                  </PopoverContent>
                </Popover>
              </>
            )}
          </>
        )}
      </PopoverContent>
    </Popover>
  )
}

export { DatePicker, pickerTriggerVariants }
