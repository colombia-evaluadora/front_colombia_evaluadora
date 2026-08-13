import { useState } from "react"
import { CaretDownIcon, PlusIcon, TrashIcon, XIcon } from "@/components/ui/icons"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { inputTriggerVariants, inputVariants, useInputVariant } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { TimePickerPanel } from "@/components/ui/time-picker"
import { cn } from "@/lib/utils"

export type Break = { startTime: string; endTime: string }

function formatTime12(value: string): string {
  if (!value) return ""
  const [h, m] = value.split(":").map(Number)
  const period = h < 12 ? "am" : "pm"
  const h12 = h % 12 === 0 ? 12 : h % 12
  return `${h12}:${String(m).padStart(2, "0")}${period}`
}

function formatBreakTimeCompact(value: string): string {
  if (!value) return ""
  const [h, m] = value.split(":").map(Number)
  const period = h < 12 ? "a" : "p"
  const h12 = h % 12 === 0 ? 12 : h % 12
  return `${h12}:${String(m).padStart(2, "0")}${period}`
}

function getSortedBreakIndices(breaks: Break[]): number[] {
  return breaks
    .map((_, index) => index)
    .sort((a, b) => breaks[a].startTime.localeCompare(breaks[b].startTime))
}

const MAX_VISIBLE_CHIPS = 3

function BreakChips({ value, onRemove }: { value: Break[]; onRemove: (index: number) => void }) {
  const sortedIndices = getSortedBreakIndices(value)
  const visibleIndices = sortedIndices.slice(0, MAX_VISIBLE_CHIPS)
  const extra = sortedIndices.length - visibleIndices.length

  return (
    <span className="pointer-events-none relative z-10 flex min-w-0 flex-1 flex-wrap items-center gap-1">
      {visibleIndices.map((originalIndex) => {
        const brk = value[originalIndex]
        return (
          <Badge
            key={`${brk.startTime}-${brk.endTime}-${originalIndex}`}
            variant="soft"
            color="muted"
            className="normal-case tracking-normal"
          >
            {formatBreakTimeCompact(brk.startTime)} → {formatBreakTimeCompact(brk.endTime)}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                onRemove(originalIndex)
              }}
              aria-label={`Quitar descanso ${originalIndex + 1}`}
              data-icon="inline-end"
              // `pointer-events-auto`: el contenedor de chips va con
              // `pointer-events-none` para que el click atraviese al trigger y
              // abra el menú; solo la "X" recupera el click para quitar.
              className="pointer-events-auto inline-flex cursor-pointer items-center hover:text-foreground"
            >
              <XIcon className="size-3" />
            </button>
          </Badge>
        )
      })}
      {extra > 0 && (
        <Badge variant="soft" color="muted" className="normal-case tracking-normal">
          +{extra}
        </Badge>
      )}
    </span>
  )
}

export function BreaksField({
  value,
  onAdd,
  onRemove,
}: {
  value: Break[]
  onAdd: (brk: Break) => void
  onRemove: (index: number) => void
}) {
  const resolvedVariant = useInputVariant()

  return (
    <Popover>
      {/* El contenedor es un `div`, no un `<button>`: los chips llevan su propio
          botón de "quitar" y un botón dentro de otro es HTML inválido (rompe la
          hidratación). Solo el área de abrir/caret es el `PopoverTrigger`. */}
      <div
        className={cn(
          inputVariants({ variant: resolvedVariant }),
          inputTriggerVariants({ variant: resolvedVariant }),
          "relative flex items-center gap-1.5",
        )}
      >
        {/* Trigger como overlay a pantalla completa (`absolute inset-0`) DETRÁS
            de los chips: así cualquier click en el input abre el menú, sin
            envolver los chips (evita el `<button>` anidado que rompía la
            hidratación). Los chips van con `pointer-events-none` para dejar
            pasar el click; solo la "X" de cada chip lo recupera. */}
        <PopoverTrigger
          render={
            <button
              type="button"
              aria-label="Editar descansos"
              className="absolute inset-0 z-0 cursor-pointer bg-transparent outline-none"
            />
          }
        />
        {value.length > 0 ? (
          <BreakChips value={value} onRemove={onRemove} />
        ) : (
          <span className="pointer-events-none relative z-10 flex-1 text-muted-foreground">
            Agregar
          </span>
        )}
        <CaretDownIcon className="text-muted-foreground pointer-events-none relative z-10 size-4 shrink-0" />
      </div>
      {/* `min-w-96` y no `w-auto` a secas: el editor lleva dos horas y el botón
          en una sola fila, y con el ancho por contenido la fila se quedaba
          corta y las etiquetas se salían de la caja. */}
      <PopoverContent align="start" className="w-auto min-w-96">
        <div className="flex flex-col gap-2">
          <BreakEditor onAdd={onAdd} />

          {value.length > 0 && (
            <ul className="flex flex-col">
              {getSortedBreakIndices(value).map((originalIndex) => {
                const brk = value[originalIndex]
                return (
                  <li
                    key={`${brk.startTime}-${brk.endTime}-${originalIndex}`}
                    className="flex items-center justify-between py-0.5 text-sm"
                  >
                    <span className="font-medium">
                      {formatTime12(brk.startTime)}
                      <span className="text-muted-foreground mx-1">→</span>
                      {formatTime12(brk.endTime)}
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      className="text-muted-foreground hover:text-foreground size-6"
                      aria-label={`Quitar descanso ${originalIndex + 1}`}
                      onClick={() => onRemove(originalIndex)}
                    >
                      <TrashIcon />
                    </Button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}

function BreakEditor({ onAdd }: { onAdd: (brk: Break) => void }) {
  const [startTime, setStartTime] = useState("")
  const [endTime, setEndTime] = useState("")

  return (
    <div className="flex w-full items-center gap-2">
      <div className="border-input flex flex-1 items-center gap-3 rounded-lg border px-3 py-2.5">
        <BreakTimeTrigger value={startTime} onChange={setStartTime} placeholder="Hora inicio" />
        <span className="text-muted-foreground shrink-0 text-xs">→</span>
        <BreakTimeTrigger value={endTime} onChange={setEndTime} placeholder="Hora final" />
      </div>
      <Button
        type="button"
        color="primary"
        size="icon"
        className="size-10 shrink-0 rounded-lg"
        aria-label="Agregar descanso"
        disabled={!startTime || !endTime}
        onClick={() => {
          onAdd({ startTime, endTime })
          setStartTime("")
          setEndTime("")
        }}
      >
        <PlusIcon weight="bold" />
      </Button>
    </div>
  )
}

function BreakTimeTrigger({
  value,
  onChange,
  placeholder,
}: {
  value: string
  onChange: (value: string) => void
  placeholder: string
}) {
  return (
    <Popover>
      <PopoverTrigger
        render={
          <button
            type="button"
            className={cn(
              // `truncate` y no `whitespace-nowrap`: si la fila se queda
              // corta el texto se recorta dentro de la caja en vez de
              // desbordarse por debajo del botón de agregar.
              "min-w-0 flex-1 truncate text-left text-sm outline-none",
              value ? "text-foreground font-medium" : "text-muted-foreground",
            )}
          />
        }
      >
        {value ? formatTime12(value) : placeholder}
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <TimePickerPanel value={value || undefined} onChange={onChange} />
      </PopoverContent>
    </Popover>
  )
}
