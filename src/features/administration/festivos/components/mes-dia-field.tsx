import { useState } from "react"
import { es } from "date-fns/locale"

import { Calendar } from "@/components/ui/calendar"
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field"
import { CalendarIcon } from "@/components/ui/icons"
import { inputTriggerVariants, inputVariants } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"

const MESES = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
]

interface MesDiaFieldProps {
  id: string
  /** 1–12; 0 = sin elegir. */
  mes: number
  /** "" = sin elegir. */
  dia: string
  onChange: (mes: number, dia: number) => void
  error?: string
  required?: boolean
}

/**
 * Mes y día de una fecha que se repite cada año (festivo fijo o Ley Emiliani), en un solo
 * calendario sin año. Se pinta sobre el año en curso para que los días de la semana coincidan
 * con la vista previa; el 29 de febrero nunca se ofrece.
 */
export function MesDiaField({ id, mes, dia, onChange, error, required }: MesDiaFieldProps) {
  const [open, setOpen] = useState(false)
  const anio = new Date().getFullYear()
  const seleccion = mes && dia ? new Date(anio, mes - 1, Number(dia)) : undefined
  const texto = mes && dia ? `${Number(dia)} de ${MESES[mes - 1]}` : null

  return (
    <Field variant="outlined" data-invalid={error ? "true" : undefined}>
      <FieldLabel htmlFor={id}>
        Fecha{required ? "*" : null}
      </FieldLabel>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          render={
            <button
              type="button"
              id={id}
              aria-invalid={Boolean(error)}
              className={cn(
                inputVariants({ variant: "outlined" }),
                inputTriggerVariants({ variant: "outlined" }),
                "flex items-center gap-2 text-left",
                !texto && "text-muted-foreground",
              )}
            />
          }
        >
          <span className="min-w-0 flex-1 truncate">{texto ?? "Elegir mes y día"}</span>
          <CalendarIcon className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
        </PopoverTrigger>
        <PopoverContent className="w-auto gap-0 border border-border p-0" align="start">
          <Calendar
            sinAnio
            mode="single"
            locale={es}
            month={seleccion ?? new Date(anio, mes ? mes - 1 : new Date().getMonth(), 1)}
            selected={seleccion}
            showOutsideDays={false}
            disabled={[{ before: new Date(anio, 0, 1) }, { after: new Date(anio, 11, 31) }, new Date(anio, 1, 29)]}
            onSelect={(fecha: Date | undefined) => {
              if (!fecha) return
              onChange(fecha.getMonth() + 1, fecha.getDate())
              setOpen(false)
            }}
          />
        </PopoverContent>
      </Popover>
      {error ? <FieldError>{error}</FieldError> : <FieldDescription>No admite el 29 de febrero.</FieldDescription>}
    </Field>
  )
}
