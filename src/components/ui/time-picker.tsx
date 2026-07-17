"use client"

import * as React from "react"
import { ClockIcon } from "@phosphor-icons/react"

import { cn } from "@/lib/utils"
import { Button, buttonVariants } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"

type Period = "AM" | "PM"
type ClockMode = "hour" | "minute"

interface TimePickerProps {
  value?: string
  onChange?: (value: string) => void
  // Se llaman al click en Cancelar/Aceptar. El componente no tiene
  // noción de "abierto/cerrado" (eso lo maneja quien lo envuelve en un
  // Popover/Dialog) — Cancelar descarta cualquier texto tipeado sin
  // confirmar (blur) y vuelve al último estado commiteado; Aceptar
  // fuerza el commit de lo que esté tipeado en ese momento.
  onCancel?: () => void
  onAccept?: () => void
  className?: string
}

/**
 * TimePicker con dos vistas: text input (Material 3, default) y
 * analog clock (Material 2, alternativa). La primera permite tipear
 * hora y minuto directamente con inputs numéricos; la segunda es un
 * clock-face clickeable con barrido horario.
 *
 * El value es un string "HH:mm" en formato 24h (lo que se guarda en
 * la base / lo que se serializa). Internamente todo el estado (hour,
 * text drafts) vive en 12h — la conversión a 24h pasa una sola vez,
 * en `commit`, justo antes de subir el string al padre.
 */
export function TimePicker({
  value,
  onChange,
  onCancel,
  onAccept,
  className,
}: TimePickerProps) {
  const [view, setView] = React.useState<"text" | "analog">("text")

  // hour/minute/period son la fuente de verdad (12h). Se actualizan
  // sincrónicamente en el mismo handler que dispara `onChange`, así
  // que tanto el clock-face como el text input siempre pintan el
  // mismo estado — no hace falta un draft duplicado en el clock.
  const [hour, setHour] = React.useState(() => extractHour(value))
  const [minute, setMinute] = React.useState(() => extractMinute(value))
  const [period, setPeriod] = React.useState<Period>(() => derivePeriod(value))

  // Drafts de texto: separados de hour/minute porque mientras el user
  // tipea (ej. borra el campo para escribir "11") el valor intermedio
  // no siempre es un número válido de 1-2 dígitos completo.
  const [hourText, setHourText] = React.useState(() => pad(hour))
  const [minuteText, setMinuteText] = React.useState(() => pad(minute))

  // Si cambia el value desde afuera (form reset, etc.), sincronizamos
  // todo — incluidos los drafts de texto.
  React.useEffect(() => {
    const h = extractHour(value)
    const m = extractMinute(value)
    setHour(h)
    setMinute(m)
    setPeriod(derivePeriod(value))
    setHourText(pad(h))
    setMinuteText(pad(m))
  }, [value])

  function commit(nextHour: number, nextMinute: number, nextPeriod: Period) {
    setHour(nextHour)
    setMinute(nextMinute)
    setPeriod(nextPeriod)
    setHourText(pad(nextHour))
    setMinuteText(pad(nextMinute))
    const h24 = to24h(nextHour, nextPeriod)
    onChange?.(`${pad(h24)}:${pad(nextMinute)}`)
  }

  function commitHourText() {
    const safe = clamp(parseIntOrZero(hourText), 1, 12)
    commit(safe, minute, period)
  }

  function commitMinuteText() {
    const safe = clamp(parseIntOrZero(minuteText), 0, 59)
    commit(hour, safe, period)
  }

  function handleCancel() {
    // Descarta cualquier texto tipeado sin confirmar y vuelve al
    // último estado commiteado.
    setHourText(pad(hour))
    setMinuteText(pad(minute))
    onCancel?.()
  }

  function handleAccept() {
    // Fuerza el commit de cualquier edición de texto pendiente (si el
    // user tipeó y no hizo blur) antes de avisar al padre.
    commitHourText()
    commitMinuteText()
    onAccept?.()
  }

  return (
    <div className={cn("flex flex-col gap-6 border p-4", className)}>
      {/* Header único para las dos vistas — texto fijo "Ingresar
          hora" e ícono fijo de reloj. Lo único que cambia entre
          vistas es el contenido de abajo (inputs de texto vs
          clock-face); el header no debería "saltar" de label ni de
          ícono solo porque cambiás de modo de entrada. */}
      <div className="flex items-center justify-between">
        <span className="text-muted-foreground text-xs font-medium uppercase tracking-wider">
          Ingresar hora
        </span>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={() => setView((v) => (v === "text" ? "analog" : "text"))}
          aria-label={
            view === "text"
              ? "Cambiar a reloj analógico"
              : "Cambiar a ingreso manual"
          }
        >
          <ClockIcon weight="bold" />
        </Button>
      </div>

      <div className="flex justify-center">
        {view === "text" ? (
          <TextInputView
            hourText={hourText}
            minuteText={minuteText}
            period={period}
            onHourTextChange={setHourText}
            onMinuteTextChange={setMinuteText}
            onHourCommit={commitHourText}
            onMinuteCommit={commitMinuteText}
            onPeriodChange={(p) => commit(hour, minute, p)}
          />
        ) : (
          <AnalogClockView
            hour={hour}
            minute={minute}
            period={period}
            onSelectHour={(h) => commit(h, minute, period)}
            onSelectMinute={(m) => commit(hour, m, period)}
            onPeriodChange={(p) => commit(hour, minute, p)}
          />
        )}
      </div>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" size="sm" onClick={handleCancel}>
          Cancelar
        </Button>
        <Button type="button" size="sm" onClick={handleAccept}>
          Aceptar
        </Button>
      </div>
    </div>
  )
}

/**
 * Toggle AM/PM compartido por las dos vistas. Usa el `ToggleGroup` del
 * design system (mismo componente que cualquier otro grupo exclusivo
 * de la app) en vez de un `<div>` con dos `<button>` crudos — así
 * hereda foco, hover y el estilo "on" (`bg-muted text-foreground`) sin
 * reinventarlo. `multiple={false}` lo vuelve exclusivo (radio-like);
 * el guard en `onValueChange` evita que quede sin selección si Base UI
 * permite des-presionar el único ítem activo.
 */
function PeriodToggle({
  period,
  onPeriodChange,
  orientation,
  className,
}: {
  period: Period
  onPeriodChange: (p: Period) => void
  orientation: "horizontal" | "vertical"
  className?: string
}) {
  return (
    <ToggleGroup
      value={[period]}
      onValueChange={(next) => {
        const last = next[next.length - 1]
        if (last === "AM" || last === "PM") onPeriodChange(last)
      }}
      multiple={false}
      orientation={orientation}
      spacing={0}
      variant="outline"
      className={className}
    >
      <ToggleGroupItem value="AM" size="sm" aria-label="AM">
        AM
      </ToggleGroupItem>
      <ToggleGroupItem value="PM" size="sm" aria-label="PM">
        PM
      </ToggleGroupItem>
    </ToggleGroup>
  )
}

function TextInputView({
  hourText,
  minuteText,
  period,
  onHourTextChange,
  onMinuteTextChange,
  onHourCommit,
  onMinuteCommit,
  onPeriodChange,
}: {
  hourText: string
  minuteText: string
  period: Period
  onHourTextChange: (v: string) => void
  onMinuteTextChange: (v: string) => void
  onHourCommit: () => void
  onMinuteCommit: () => void
  onPeriodChange: (p: Period) => void
}) {
  return (
    <div className="flex items-end gap-2">
      <div className="flex flex-col gap-1">
        <Input
          type="text"
          inputMode="numeric"
          maxLength={2}
          value={hourText}
          onChange={(e) =>
            onHourTextChange(e.target.value.replace(/\D/g, "").slice(0, 2))
          }
          onBlur={onHourCommit}
          onKeyDown={(e) => {
            if (e.key === "Enter") onHourCommit()
          }}
          className="h-12 w-16 text-center text-2xl"
          aria-label="Hora"
        />
        <span className="text-muted-foreground text-center text-xs">Hora</span>
      </div>
      <span className="text-2xl font-medium">:</span>
      <div className="flex flex-col gap-1">
        <Input
          type="text"
          inputMode="numeric"
          maxLength={2}
          value={minuteText}
          onChange={(e) =>
            onMinuteTextChange(e.target.value.replace(/\D/g, "").slice(0, 2))
          }
          onBlur={onMinuteCommit}
          onKeyDown={(e) => {
            if (e.key === "Enter") onMinuteCommit()
          }}
          className="h-12 w-16 text-center text-2xl"
          aria-label="Minuto"
        />
        <span className="text-muted-foreground text-center text-xs">Minuto</span>
      </div>
      <PeriodToggle
        period={period}
        onPeriodChange={onPeriodChange}
        orientation="vertical"
        className="ml-2"
      />
    </div>
  )
}

function AnalogClockView({
  hour,
  minute,
  period,
  onSelectHour,
  onSelectMinute,
  onPeriodChange,
}: {
  hour: number
  minute: number
  period: Period
  onSelectHour: (hour: number) => void
  onSelectMinute: (minute: number) => void
  onPeriodChange: (p: Period) => void
}) {
  // Modo del reloj: "hour" muestra los 12 números; al hacer click pasa
  // a "minute" y muestra múltiplos de 5. El readout de abajo ("HH" /
  // "mm") permite volver a "hour" en cualquier momento — sin eso el
  // reloj queda pegado en modo minuto sin forma de reabrir horas.
  const [mode, setMode] = React.useState<ClockMode>("hour")

  function handleClick(value: number) {
    if (mode === "hour") {
      onSelectHour(value)
      setMode("minute")
    } else {
      onSelectMinute(value)
    }
  }

  // La manecilla es una barra vertical anclada por abajo al centro:
  // con `rotate(0deg)` ya apunta hacia arriba, que es exactamente
  // donde están posicionados el "12" (modo hora) y el "0" (modo
  // minuto) — ver `angle` más abajo, que usa el mismo offset de -90°
  // para calcular las posiciones de los chips. Por eso acá NO restamos
  // 90: alinear ambos cálculos (uno con el offset y otro sin él) es lo
  // que producía el desfase de 90°. Tampoco sumamos `minute/60` a la
  // hora — eso sería el barrido "real" de un reloj de pared, pero acá
  // la manecilla tiene que apuntar exacto al chip resaltado, no a un
  // punto intermedio entre dos horas.
  const hourAngle = hour * 30
  const minuteAngle = minute * 6

  const values = mode === "hour"
    ? [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]
    : [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55]

  return (
    <div className="flex flex-col items-center gap-3">
      {/* Readout HH:mm + AM/PM en la misma fila — el toggle de
          período va al lado de la hora (lo que está editando), no al
          lado del reloj (que es el selector, no el valor). Cada mitad
          del HH:mm es un Button ghost clickeable para saltar al modo
          correspondiente del clock-face. */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1 text-4xl font-semibold">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setMode("hour")}
            className={cn(
              "h-auto px-2 py-1 text-4xl normal-case tracking-normal",
              mode === "hour" && "text-primary"
            )}
          >
            {pad(hour)}
          </Button>
          <span>:</span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setMode("minute")}
            className={cn(
              "h-auto px-2 py-1 text-4xl normal-case tracking-normal",
              mode === "minute" && "text-primary"
            )}
          >
            {pad(minute)}
          </Button>
        </div>

        <PeriodToggle
          period={period}
          onPeriodChange={onPeriodChange}
          orientation="vertical"
        />
      </div>

      <div className="relative aspect-square w-56 shrink-0 rounded-full border bg-background">
        {/* Marcas horarias (12 alrededor) o marcas de minutos
            (cada 5), según `mode`. Reusa `buttonVariants` (mismo
            foco/hover/transition que cualquier Button de la app) con
            un override a círculo — el clock-face es de por sí una
            excepción visual al `rounded-none` general, como los
            Avatar. */}
        {values.map((value, i) => {
          const angle = (i * 30 - 90) * (Math.PI / 180)
          const leftPct = 50 + 42 * Math.cos(angle)
          const topPct = 50 + 42 * Math.sin(angle)
          const isSelected =
            mode === "hour" ? value === hour : value === minute
          return (
            <button
              key={value}
              type="button"
              onClick={() => handleClick(value)}
              className={cn(
                buttonVariants({
                  variant: isSelected ? "default" : "ghost",
                  size: "icon-sm",
                }),
                "absolute rounded-full text-sm normal-case tracking-normal",
                !isSelected && "border-transparent"
              )}
              style={{
                left: `${leftPct}%`,
                top: `${topPct}%`,
                transform: "translate(-50%, -50%)",
              }}
            >
              {value}
            </button>
          )
        })}

        {/* Manecilla: barra vertical anclada por abajo al centro
            del reloj, rotada según `mode`. Termina en 33% (no 42%,
            que es donde están centrados los chips) para que la
            punta quede justo antes del chip en vez de taparle el
            número. `pointer-events-none` para que nunca se coma el
            click de un chip debajo. */}
        <div
          className="pointer-events-none absolute left-1/2 bg-foreground"
          style={{
            top: "50%",
            width: "2px",
            height: "33%",
            marginLeft: "-1px",
            transform: `translateY(-100%) rotate(${
              mode === "hour" ? hourAngle : minuteAngle
            }deg)`,
            transformOrigin: "bottom center",
          }}
        />
        {/* Centro (dot) — pointer-events-none por la misma razón. */}
        <div className="pointer-events-none absolute top-1/2 left-1/2 size-4 -translate-x-1/2 -translate-y-1/2 rounded-full bg-foreground" />
      </div>
    </div>
  )
}

// Helpers
function pad(n: number): string {
  return String(n).padStart(2, "0")
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n))
}

function parseIntOrZero(s: string): number {
  const n = parseInt(s, 10)
  return Number.isNaN(n) ? 0 : n
}

function extractHour(value?: string): number {
  if (!value) return 12
  const [h] = value.split(":")
  const n = parseInt(h, 10)
  if (Number.isNaN(n)) return 12
  // Convertimos de 24h a 12h para el input
  if (n === 0) return 12
  if (n > 12) return n - 12
  return n
}

function extractMinute(value?: string): number {
  if (!value) return 0
  const [, m] = value.split(":")
  const n = parseInt(m, 10)
  return Number.isNaN(n) ? 0 : n
}

function derivePeriod(value?: string): Period {
  if (!value) return "AM"
  const [h] = value.split(":")
  const n = parseInt(h, 10)
  if (Number.isNaN(n)) return "AM"
  return n >= 12 ? "PM" : "AM"
}

function to24h(hour12: number, period: Period): number {
  if (period === "AM") {
    return hour12 === 12 ? 0 : hour12
  }
  return hour12 === 12 ? 12 : hour12 + 12
}
