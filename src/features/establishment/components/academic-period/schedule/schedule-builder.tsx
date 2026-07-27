import { useMemo, useState } from "react"
import { MinusIcon, XIcon } from "@phosphor-icons/react"
import { toast } from "sonner"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

import {
  buildRuns,
  buildSlots,
  DAYS,
  formatClock,
  type Jornada,
  type ScheduleSubject,
} from "./schedule-data"

// Estilos derivados del color hex de la materia (definido en área/asignatura):
// fondo tenue, borde y texto del mismo color; el contador va en color pleno.
function subjectStyles(hex: string) {
  return {
    container: {
      backgroundColor: `${hex}1f`,
      borderColor: `${hex}80`,
      color: hex,
    } as React.CSSProperties,
    count: { backgroundColor: hex, color: "#fff" } as React.CSSProperties,
  }
}

type Schedule = Record<string, Record<string, string | undefined>>

interface CellInfo {
  skip: boolean
  rowSpan: number
  subjectId?: string
  blockSlots: string[]
}

function computeCells(
  schedule: Schedule,
  runs: string[][]
): Record<string, Record<string, CellInfo>> {
  const result: Record<string, Record<string, CellInfo>> = {}

  for (const day of DAYS) {
    const daySchedule = schedule[day.id] ?? {}
    const map: Record<string, CellInfo> = {}

    for (const run of runs) {
      let i = 0
      while (i < run.length) {
        const slotId = run[i]
        const subjectId = daySchedule[slotId]

        if (!subjectId) {
          map[slotId] = { skip: false, rowSpan: 1, blockSlots: [slotId] }
          i++
          continue
        }

        let j = i
        while (j + 1 < run.length && daySchedule[run[j + 1]] === subjectId) j++

        const blockSlots = run.slice(i, j + 1)
        map[slotId] = {
          skip: false,
          rowSpan: blockSlots.length,
          subjectId,
          blockSlots,
        }
        for (let k = i + 1; k <= j; k++) {
          map[run[k]] = { skip: true, rowSpan: 0, blockSlots: [] }
        }
        i = j + 1
      }
    }

    result[day.id] = map
  }

  return result
}

function spaced(text: string): string {
  return text.split("").join(" ")
}

interface ScheduleBuilderProps {
  jornada: Jornada
  onClose: () => void
  hideActions?: boolean
  // Materias disponibles para el curso, derivadas del plan de estudio
  // (nombre + intensidad horaria) y con el color de área/asignatura.
  subjects: ScheduleSubject[]
  // Opciones del select Grado/Grupo, tomadas de los grupos reales del grado.
  gradeGroups: string[]
}

export function ScheduleBuilder({
  jornada,
  onClose,
  hideActions = false,
  subjects,
  gradeGroups,
}: ScheduleBuilderProps) {
  const [gradeGroup, setGradeGroup] = useState("")
  const [schedule, setSchedule] = useState<Schedule>({})
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState<string | null>(null)

  const subjectsById = useMemo(
    () => Object.fromEntries(subjects.map((s) => [s.id, s])),
    [subjects]
  )

  const todayWeekday = new Date().getDay()

  // Franjas y corridas derivadas de la jornada del periodo académico.
  const slots = useMemo(() => buildSlots(jornada), [jornada])
  const runs = useMemo(() => buildRuns(slots), [slots])
  const classSlotIds = useMemo(
    () => new Set(slots.filter((s) => s.kind === "class").map((s) => s.id)),
    [slots]
  )

  const cells = useMemo(() => computeCells(schedule, runs), [schedule, runs])

  const placedCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const day of Object.values(schedule)) {
      for (const [slotId, subjectId] of Object.entries(day)) {
        if (subjectId && classSlotIds.has(slotId)) {
          counts[subjectId] = (counts[subjectId] ?? 0) + 1
        }
      }
    }
    return counts
  }, [schedule, classSlotIds])

  const jornadaSummary = [
    jornada.startTime && jornada.endTime
      ? `${formatClock(jornada.startTime)}–${formatClock(jornada.endTime)}`
      : null,
    `${slots.filter((s) => s.kind === "class").length} bloques`,
    `${jornada.breaks.length} descanso(s)`,
  ]
    .filter(Boolean)
    .join(" · ")

  function setCell(dayId: string, slotId: string, subjectId: string) {
    setSchedule((prev) => ({
      ...prev,
      [dayId]: { ...(prev[dayId] ?? {}), [slotId]: subjectId },
    }))
  }

  function clearSlots(dayId: string, slotIds: string[]) {
    setSchedule((prev) => {
      const day = { ...(prev[dayId] ?? {}) }
      for (const slotId of slotIds) delete day[slotId]
      return { ...prev, [dayId]: day }
    })
  }

  function handleDrop(dayId: string, slotId: string) {
    const subject = draggingId ? subjectsById[draggingId] : undefined
    if (draggingId && subject) {
      const alreadyHere = schedule[dayId]?.[slotId] === draggingId
      const placed = placedCounts[draggingId] ?? 0
      // No permitir superar el cupo de horas de la materia.
      if (alreadyHere || placed < subject.blocks) {
        setCell(dayId, slotId, draggingId)
      }
    }
    setDragOver(null)
    setDraggingId(null)
  }

  function handleSave() {
    const total = Object.values(placedCounts).reduce(
      (acc, count) => acc + count,
      0
    )
    toast.success(
      `Horario guardado para ${gradeGroup} (${total} bloque(s) asignados).`
    )
    onClose()
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Grado / grupo */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium text-muted-foreground">
          Grado/Grupo
        </label>
        <Select
          value={gradeGroup}
          onValueChange={(value) => value && setGradeGroup(value)}
          disabled={gradeGroups.length === 0}
        >
          <SelectTrigger className="w-full sm:w-72">
            <SelectValue
              placeholder={
                gradeGroups.length === 0
                  ? "Sin grupos: agregá uno en la pestaña Grupo"
                  : "Seleccionar"
              }
            />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              {gradeGroups.map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>

      {/* Jornada heredada del periodo académico (solo lectura). */}
      <p className="text-xs text-muted-foreground">
        Jornada del periodo:{" "}
        <span className="font-medium text-foreground">{jornadaSummary}</span>
      </p>

      {/* Paleta de materias arrastrables (del plan de estudio). El contador
          muestra las horas que faltan por asignar; la materia desaparece al
          completar su cupo. */}
      <div className="flex flex-wrap gap-2">
        {subjects.length === 0 && (
          <p className="text-xs text-muted-foreground">
            No hay asignaturas en el plan de estudio de este periodo. Agregá
            asignaturas en la pestaña "Plan de estudio" para armar el horario.
          </p>
        )}
        {subjects.map((subject) => {
          const remaining = subject.blocks - (placedCounts[subject.id] ?? 0)
          if (remaining <= 0) return null

          const styles = subjectStyles(subject.color)
          return (
            <div
              key={subject.id}
              draggable
              onDragStart={(e) => {
                e.dataTransfer.setData("text/subject", subject.id)
                e.dataTransfer.effectAllowed = "copy"
                setDraggingId(subject.id)
              }}
              onDragEnd={() => {
                setDraggingId(null)
                setDragOver(null)
              }}
              style={styles.container}
              className={cn(
                "flex cursor-grab items-center gap-2 border px-2.5 py-1 text-xs font-medium select-none active:cursor-grabbing",
                draggingId === subject.id && "opacity-50"
              )}
            >
              <span>{subject.name}</span>
              <span
                style={styles.count}
                className="px-1.5 py-0.5 text-[10px] leading-none font-bold"
              >
                {remaining}B
              </span>
            </div>
          )
        })}
        {subjects.length > 0 &&
          subjects.every(
            (subject) => (placedCounts[subject.id] ?? 0) >= subject.blocks
          ) && (
            <p className="text-xs text-muted-foreground">
              Todas las materias fueron asignadas.
            </p>
          )}
      </div>

      {/* Grilla del horario */}
      {slots.length === 0 ? (
        <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
          Definí la hora de inicio, fin y el número de bloques en el periodo
          académico para armar el horario.
        </p>
      ) : (
      <div className="overflow-x-auto border">
        <table className="w-full min-w-[640px] table-fixed border-collapse">
          <thead>
            <tr className="border-b">
              <th className="w-16 border-r p-2" />
              {DAYS.map((day) => (
                <th
                  key={day.id}
                  className={cn(
                    "border-r p-2 text-center text-xs font-semibold tracking-wider last:border-r-0",
                    day.weekday === todayWeekday
                      ? "text-primary"
                      : "text-foreground"
                  )}
                >
                  {day.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {slots.map((slot) => {
              if (slot.kind !== "class") {
                return (
                  <tr key={slot.id} className="border-b last:border-b-0">
                    <td className="border-r p-2 text-right align-middle text-xs text-muted-foreground">
                      {slot.time}
                    </td>
                    <td
                      colSpan={DAYS.length}
                      className="bg-muted/30 p-3 text-center text-sm font-semibold tracking-[0.4em] text-muted-foreground/40 select-none"
                    >
                      {spaced(slot.label ?? "")}
                    </td>
                  </tr>
                )
              }

              return (
                <tr key={slot.id} className="h-[46px] border-b last:border-b-0">
                  <td className="border-r p-2 text-right align-top text-xs text-muted-foreground">
                    {slot.time}
                  </td>
                  {DAYS.map((day) => {
                    const info = cells[day.id]?.[slot.id]
                    if (info?.skip) return null

                    const cellKey = `${day.id}:${slot.id}`
                    const isOver = dragOver === cellKey
                    const subject = info?.subjectId
                      ? subjectsById[info.subjectId]
                      : undefined

                    return (
                      // `relative` + hijo `absolute inset-1`: así el bloque llena
                      // toda la altura de la celda fusionada (rowSpan), en vez de
                      // quedarse a 44px y dejar el resto en blanco.
                      <td
                        key={day.id}
                        rowSpan={info?.rowSpan ?? 1}
                        className="relative border-r p-0 last:border-r-0"
                        onDragOver={(e) => {
                          e.preventDefault()
                          e.dataTransfer.dropEffect = "copy"
                          setDragOver(cellKey)
                        }}
                        onDragLeave={() => {
                          setDragOver((prev) => (prev === cellKey ? null : prev))
                        }}
                        onDrop={(e) => {
                          e.preventDefault()
                          handleDrop(day.id, slot.id)
                        }}
                      >
                        {subject ? (
                          <div
                            style={subjectStyles(subject.color).container}
                            className="group absolute inset-1 flex items-center justify-between gap-1 border px-2 py-1.5"
                          >
                            <span className="text-left text-xs leading-tight font-medium">
                              {subject.name}
                            </span>
                            <div className="flex shrink-0 items-center gap-0.5 opacity-60 transition-opacity group-hover:opacity-100">
                              {info && info.rowSpan > 1 && (
                                <button
                                  type="button"
                                  aria-label={`Reducir ${subject.name}`}
                                  className=" p-0.5 hover:bg-black/10 dark:hover:bg-white/10"
                                  onClick={() =>
                                    clearSlots(day.id, [
                                      info.blockSlots[info.blockSlots.length - 1],
                                    ])
                                  }
                                >
                                  <MinusIcon className="size-3.5" />
                                </button>
                              )}
                              <button
                                type="button"
                                aria-label={`Quitar ${subject.name}`}
                                onClick={() =>
                                  clearSlots(day.id, info?.blockSlots ?? [])
                                }
                              >
                                <XIcon className="size-3.5" />
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div
                            className={cn(
                              "absolute inset-1 border border-dashed border-transparent transition-colors",
                              isOver && "border-primary bg-primary/5"
                            )}
                          />
                        )}
                      </td>
                    )
                  })}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      )}

      {/* Acciones */}
      {!hideActions && (
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="button" color="primary" onClick={handleSave}>
            Guardar
          </Button>
        </div>
      )}
    </div>
  )
}
