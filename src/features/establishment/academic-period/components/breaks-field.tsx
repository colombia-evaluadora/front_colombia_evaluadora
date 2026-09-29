import { useRef, useState } from "react"
import { CaretDownIcon, PlusIcon, XIcon } from "@/components/ui/icons"
import { ConfirmRemoveButton } from "@/components/confirm-remove-button"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { inputTriggerVariants, inputVariants, useInputVariant } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Separator } from "@/components/ui/separator"
import { TimePickerPanel, type TimePickerPanelHandle } from "@/components/ui/time-picker"
import { cn } from "@/lib/utils"
import { addOneMinute, timeToMinutes } from "@/features/establishment/academic-period/api/schema"

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

/** Motivo por el que el descanso no se puede agregar (null = válido). */
function getBreakError(
  brk: { startTime: string; endTime: string },
  existing: Break[],
  minTime?: string,
  maxTime?: string,
): string | null {
  if (!brk.startTime || !brk.endTime) return null
  const start = timeToMinutes(brk.startTime)
  const end = timeToMinutes(brk.endTime)
  if (start >= end) return "La hora inicial debe ser anterior a la final."
  if (minTime && start < timeToMinutes(minTime)) {
    return `El descanso no puede empezar antes de ${formatTime12(minTime)}.`
  }
  if (maxTime && end > timeToMinutes(maxTime)) {
    return `El descanso no puede terminar después de ${formatTime12(maxTime)}.`
  }
  const overlaps = existing.some(
    (b) => start < timeToMinutes(b.endTime) && end > timeToMinutes(b.startTime),
  )
  return overlaps ? "El descanso se cruza con otro ya agregado." : null
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
            className="text-xs"
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
              className="pointer-events-auto inline-flex cursor-pointer items-center hover:text-foreground"
            >
              <XIcon className="size-3" />
            </button>
          </Badge>
        )
      })}
      {extra > 0 && (
        <Badge variant="soft" color="muted" className="text-xs normal-case tracking-normal">
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
  minTime,
  maxTime,
}: {
  value: Break[]
  onAdd: (brk: Break) => void
  onRemove: (index: number) => void
  /** Límites de la jornada: los descansos deben quedar dentro. */
  minTime?: string
  maxTime?: string
}) {
  const resolvedVariant = useInputVariant()
  const [open, setOpen] = useState(false)
  const [draftStart, setDraftStart] = useState("")
  const [draftEnd, setDraftEnd] = useState("")

  function handleOpenChange(nextOpen: boolean) {
    if (
      !nextOpen &&
      draftStart &&
      draftEnd &&
      !getBreakError({ startTime: draftStart, endTime: draftEnd }, value, minTime, maxTime)
    ) {
      onAdd({ startTime: draftStart, endTime: draftEnd })
      setDraftStart("")
      setDraftEnd("")
    }
    setOpen(nextOpen)
  }

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <div
        className={cn(
          inputVariants({ variant: resolvedVariant }),
          inputTriggerVariants({ variant: resolvedVariant }),
          "relative flex h-auto min-h-11 items-center gap-1.5",
        )}
      >
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
      <PopoverContent align="start" className="w-auto min-w-96">
        <div className="flex flex-col gap-2">
          <BreakEditor
            startTime={draftStart}
            endTime={draftEnd}
            onStartTimeChange={setDraftStart}
            onEndTimeChange={setDraftEnd}
            onAdd={onAdd}
            existing={value}
            minTime={minTime}
            maxTime={maxTime}
          />

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
                    <ConfirmRemoveButton
                      label={`Quitar descanso ${originalIndex + 1}`}
                      description={`Se quitará el descanso de ${formatTime12(brk.startTime)} a ${formatTime12(brk.endTime)}. Esta acción no se puede deshacer.`}
                      className="text-muted-foreground hover:text-foreground size-6"
                      onConfirm={() => onRemove(originalIndex)}
                    />
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

function BreakEditor({
  startTime,
  endTime,
  onStartTimeChange,
  onEndTimeChange,
  onAdd,
  existing,
  minTime,
  maxTime,
}: {
  startTime: string
  endTime: string
  onStartTimeChange: (value: string) => void
  onEndTimeChange: (value: string) => void
  onAdd: (brk: Break) => void
  existing: Break[]
  minTime?: string
  maxTime?: string
}) {
  const error = getBreakError({ startTime, endTime }, existing, minTime, maxTime)
  const [startOpen, setStartOpen] = useState(false)
  const [endOpen, setEndOpen] = useState(false)

  function commitAndReset() {
    if (error) return
    onAdd({ startTime, endTime })
    onStartTimeChange("")
    onEndTimeChange("")
  }

  return (
    <div className="flex w-full flex-col gap-1">
    <div className="flex w-full items-center gap-2">
      <div className="border-input flex flex-1 items-center gap-3 rounded-lg border px-3 py-2.5">
        <BreakTimeTrigger
          value={startTime}
          onChange={(value) => {
            onStartTimeChange(value)
            // Sin hora final (o inicio >= final) la final se ajusta a +1 minuto.
            if (!endTime || value >= endTime) onEndTimeChange(addOneMinute(value) ?? "")
          }}
          placeholder="Hora inicio"
          open={startOpen}
          onOpenChange={(nextOpen) => {
            setStartOpen(nextOpen)
            if (!nextOpen) setEndOpen(true)
          }}
        />
        <span className="text-muted-foreground shrink-0 text-xs">→</span>
        <BreakTimeTrigger
          value={endTime}
          onChange={onEndTimeChange}
          placeholder="Hora final"
          open={endOpen}
          onOpenChange={(nextOpen) => {
            setEndOpen(nextOpen)
            if (!nextOpen && startTime && endTime) commitAndReset()
          }}
          onListoClose={() => setEndOpen(false)}
        />
      </div>
      <Button
        type="button"
        color="primary"
        size="icon"
        className="size-10 shrink-0 rounded-lg"
        aria-label="Agregar descanso"
        disabled={!startTime || !endTime || !!error}
        onClick={commitAndReset}
      >
        <PlusIcon weight="bold" />
      </Button>
    </div>
    {error && (
      <p role="alert" className="text-red text-xs">
        {error}
      </p>
    )}
    </div>
  )
}

function BreakTimeTrigger({
  value,
  onChange,
  placeholder,
  open,
  onOpenChange,
  onListoClose,
}: {
  value: string
  onChange: (value: string) => void
  placeholder: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onListoClose?: () => void
}) {
  const panelRef = useRef<TimePickerPanelHandle>(null)

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) (document.activeElement as HTMLElement | null)?.blur?.()
    onOpenChange(nextOpen)
  }

  function handleListoClick() {
    ;(document.activeElement as HTMLElement | null)?.blur?.()
    panelRef.current?.commit()
    if (onListoClose) onListoClose()
    else onOpenChange(false)
  }

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger
        render={
          <button
            type="button"
            className={cn(
              "min-w-0 flex-1 truncate text-left text-sm outline-none",
              value ? "text-foreground font-medium" : "text-muted-foreground",
            )}
          />
        }
      >
        {value ? formatTime12(value) : placeholder}
      </PopoverTrigger>
      <PopoverContent className="w-auto gap-0 p-0" align="start">
        <TimePickerPanel ref={panelRef} value={value || undefined} onChange={onChange} />
        <Separator />
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="w-full rounded-none font-normal"
          onClick={handleListoClick}
        >
          Listo
        </Button>
      </PopoverContent>
    </Popover>
  )
}
