import { forwardRef, useEffect, useImperativeHandle, useMemo, useState } from "react"
import { MinusIcon, XIcon } from "@/components/ui/icons"

import { cn } from "@/lib/utils"
import { Field, FieldLabel } from "@/components/ui/field"
import {
  ComboboxField,
  ComboboxFieldContent,
  ComboboxFieldItem,
  ComboboxFieldTrigger,
  ComboboxFieldValue,
  ComboboxGroup,
} from "@/components/ui/combobox"

import { useUpdateHorario } from "../api/mutations/update-horario"
import type { ScheduleEntry } from "../api/types/grade-config"
import { useHorarioQuery } from "../api/query/use-horario"
import {
  buildRuns,
  buildSlots,
  DAYS,
  type Jornada,
  type ScheduleSubject,
} from "./schedule-data"

function subjectStyles(hex: string) {
  return {
    container: {
      backgroundColor: `${hex}1f`,
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

interface ScheduleGroupOption {
  id: number
  label: string
}

interface ScheduleBuilderProps {
  jornada: Jornada
  subjects: ScheduleSubject[]
  gradeGroups: ScheduleGroupOption[]
  gradeId: number
}

export interface ScheduleBuilderHandle {
  save: (gradeId: number) => Promise<void>
}

export const ScheduleBuilder = forwardRef<
  ScheduleBuilderHandle,
  ScheduleBuilderProps
>(function ScheduleBuilder({ jornada, subjects, gradeGroups, gradeId }, ref) {
  const [gradeGroup, setGradeGroup] = useState("")
  const [schedulesByGroup, setSchedulesByGroup] = useState<
    Record<string, Schedule>
  >({})
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState<string | null>(null)
  const [hydrated, setHydrated] = useState(false)

  const schedule = schedulesByGroup[gradeGroup] ?? {}

  const { data: horarioEntries } = useHorarioQuery(gradeId)
  useEffect(() => {
    if (!hydrated && horarioEntries) {
      if (horarioEntries.length) {
        const byGroup: Record<string, Schedule> = {}
        for (const e of horarioEntries) {
          const dayLocal = DAYS.find((d) => d.dayId === e.diaId)?.id
          if (!dayLocal) continue
          const groupKey = String(e.grupoId)
          const slotId = `c${e.bloque + 1}`
          byGroup[groupKey] ??= {}
          byGroup[groupKey][dayLocal] ??= {}
          byGroup[groupKey][dayLocal][slotId] = String(e.planItemId)
        }
        setSchedulesByGroup(byGroup)
      }
      setHydrated(true)
    }
  }, [horarioEntries, hydrated])

  const updateHorario = useUpdateHorario()

  const subjectsById = useMemo(
    () => Object.fromEntries(subjects.map((s) => [s.id, s])),
    [subjects]
  )

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

  function setCell(dayId: string, slotId: string, subjectId: string) {
    if (!gradeGroup) return
    setSchedulesByGroup((prev) => {
      const current = prev[gradeGroup] ?? {}
      return {
        ...prev,
        [gradeGroup]: {
          ...current,
          [dayId]: { ...(current[dayId] ?? {}), [slotId]: subjectId },
        },
      }
    })
  }

  function clearSlots(dayId: string, slotIds: string[]) {
    if (!gradeGroup) return
    setSchedulesByGroup((prev) => {
      const current = prev[gradeGroup] ?? {}
      const day = { ...(current[dayId] ?? {}) }
      for (const slotId of slotIds) delete day[slotId]
      return { ...prev, [gradeGroup]: { ...current, [dayId]: day } }
    })
  }

  function handleDrop(dayId: string, slotId: string) {
    const subject = draggingId ? subjectsById[draggingId] : undefined
    if (draggingId && subject && gradeGroup) {
      const alreadyHere = schedule[dayId]?.[slotId] === draggingId
      const placed = placedCounts[draggingId] ?? 0
      if (alreadyHere || placed < subject.blocks) {
        setCell(dayId, slotId, draggingId)
      }
    }
    setDragOver(null)
    setDraggingId(null)
  }

  useImperativeHandle(
    ref,
    () => ({
      save: async (id: number) => {
        const entries: ScheduleEntry[] = []
        for (const [groupKey, groupSchedule] of Object.entries(
          schedulesByGroup
        )) {
          const grupoId = Number(groupKey)
          if (!Number.isFinite(grupoId)) continue
          for (const [dayLocalId, daySlots] of Object.entries(groupSchedule)) {
            const day = DAYS.find((d) => d.id === dayLocalId)
            if (!day) continue
            for (const [slotId, subjectId] of Object.entries(daySlots)) {
              if (!subjectId) continue
              // slotId "cN" (1-based) -> bloque 0-based
              const blockNumber = Number(slotId.replace(/^c/, ""))
              if (!Number.isFinite(blockNumber)) continue
              entries.push({
                grupoId,
                planItemId: Number(subjectId),
                diaId: day.dayId,
                bloque: blockNumber - 1,
              })
            }
          }
        }
        console.log("[horario save] entries", { gradeId: id, entries })
        await updateHorario.mutateAsync({ gradeId: id, entries })
      },
    }),
    [schedulesByGroup, updateHorario]
  )

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <Field
        orientation="vertical"
        variant="outlined"
        className="w-full gap-2 sm:w-72"
      >
        <FieldLabel htmlFor="schedule-grade-group">Grado/Grupo</FieldLabel>
        <ComboboxField
          value={gradeGroup}
          onValueChange={(value) => value && setGradeGroup(value)}
          disabled={gradeGroups.length === 0}
          items={Object.fromEntries(
            gradeGroups.map((option) => [String(option.id), option.label])
          )}
        >
          <ComboboxFieldTrigger id="schedule-grade-group" className="w-full">
            <ComboboxFieldValue
              placeholder={
                gradeGroups.length === 0
                  ? "Sin grupos: agregá uno en la pestaña Grupo"
                  : "Seleccionar"
              }
            />
          </ComboboxFieldTrigger>
          <ComboboxFieldContent>
            <ComboboxGroup>
              {gradeGroups.map((option) => (
                <ComboboxFieldItem key={option.id} value={String(option.id)}>
                  {option.label}
                </ComboboxFieldItem>
              ))}
            </ComboboxGroup>
          </ComboboxFieldContent>
        </ComboboxField>
      </Field>

      <div className="flex flex-wrap gap-2">
        {!gradeGroup ? (
          <p className="text-xs text-muted-foreground">
            Seleccioná un grado/grupo para ver las asignaturas disponibles.
          </p>
        ) : (
          <>
            {subjects.length === 0 && (
              <p className="text-xs text-muted-foreground">
                No hay asignaturas en el plan de estudio de este periodo. Agregá
                asignaturas en la pestaña "Plan de estudio" para armar el
                horario.
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
                    "flex cursor-grab items-center gap-2 rounded border-2 border-transparent px-2.5 py-1 text-xs font-medium text-foreground select-none active:cursor-grabbing",
                    draggingId === subject.id && "opacity-50"
                  )}
                >
                  <span>{subject.name}</span>
                  <span
                    style={styles.count}
                    className="rounded border-2 border-transparent px-0.5 text-xs leading-none font-bold"
                  >
                    {remaining}H
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
          </>
        )}
      </div>

      {slots.length === 0 ? (
        <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
          Definí la hora de inicio, fin y el número de bloques en el periodo
          académico para armar el horario.
        </p>
      ) : (
      <div className="min-w-0 overflow-x-auto border">
        <table className="w-full min-w-[640px] table-fixed border-collapse">
          <thead>
            <tr className="border-b">
              <th className="w-16 border-r p-2" />
              {DAYS.map((day) => (
                <th
                  key={day.id}
                  className="border-r p-2 text-center text-xs font-semibold tracking-wider text-foreground last:border-r-0"
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
                      className="bg-muted/30 p-3 text-center text-2xl font-semibold tracking-[0.4em] text-muted-foreground/40 select-none"
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
                            className="group absolute inset-1 flex items-center justify-between gap-1 rounded border-2 border-transparent px-2 py-1.5"
                          >
                            <span
                              title={subject.name}
                              className="text-left text-xs leading-tight font-medium text-foreground"
                            >
                              {subject.abbreviation || subject.name}
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
    </div>
  )
})
