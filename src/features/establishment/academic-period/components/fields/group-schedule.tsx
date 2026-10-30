import { useState } from "react"
import { getErrorMessage } from "@/lib/api-client"

import { useNotify } from "@/components/notice/notice-context"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  ComboboxField,
  ComboboxFieldContent,
  ComboboxFieldItem,
  ComboboxFieldTrigger,
  ComboboxFieldValue,
  ComboboxGroup,
} from "@/components/ui/combobox"
import { InfoIcon, SpinnerIcon, WarningIcon } from "@/components/ui/icons"
import { Spinner } from "@/components/ui/spinner"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

import { useHorarioQuery } from "@/features/establishment/academic-period/api/query/use-horario"
import { useStudyPlansQuery } from "@/features/establishment/academic-period/api/query/use-study-plans"
import { useUpdateHorario } from "@/features/establishment/academic-period/api/mutations/update-horario"
import type { AcademicPeriodBreak } from "@/features/establishment/academic-period/api/types/academic-period"
import type { GradeGroup } from "@/features/establishment/academic-period/api/types/grade-group"
import type { ScheduleCellCause } from "@/features/establishment/academic-period/api/types/grade-config"
import { getScheduleSlots } from "@/features/establishment/academic-period/utils/recesos"
import { DAYS } from "@/features/establishment/academic-period/utils/schedule-data"
import { PrintReportButton } from "@/features/establishment/academic-period/components/print-report-button"
import { usePeriodReadOnly } from "@/features/establishment/academic-period/utils/period-read-only"

// Lunes a sábado (Regla 71).
const WEEK = DAYS.filter((d) => d.id !== "dom")
const DAY_LABEL: Record<string, string> = {
  lun: "Lunes",
  mar: "Martes",
  mie: "Miércoles",
  jue: "Jueves",
  vie: "Viernes",
  sab: "Sábado",
}
const NONE = "none"
// Celda de una asignatura que salió del plan (Regla 74): no tiene renglón que elegir.
const ORPHAN = -1
const CAUSE_TEXT: Record<ScheduleCellCause, string> = {
  BLOQUES: "El bloque ya no está en la grilla del grado.",
  PLAN: "La asignatura salió del plan de estudio.",
  INTENSIDAD: "La asignatura supera su intensidad horaria.",
}

export interface GroupScheduleSource {
  startTime: string
  endTime: string
  blocks: number | null
  breaks: AcademicPeriodBreak[]
}

const cellKey = (diaId: number, bloque: number) => `${diaId}-${bloque}`

// Horario de clase del grupo (Reglas 71 a 73): en cada día y bloque se elige
// una asignatura del plan del grado, sin pasar su intensidad horaria.
export function GroupSchedule({
  gradeId,
  academicPeriodId,
  group,
  schedule,
}: {
  gradeId: number
  academicPeriodId?: number
  group: GradeGroup
  schedule: GroupScheduleSource
}) {
  const { readOnly } = usePeriodReadOnly()
  const { notify } = useNotify()
  const { data: plan, isPending: planPending } = useStudyPlansQuery({
    filters: {},
    sorting: [],
    pageIndex: 0,
    pageSize: 100,
    gradeId,
  })
  const { data: entries = [], isPending: horarioPending } = useHorarioQuery(gradeId)
  const updateHorario = useUpdateHorario()

  const savedEntries = new Map(
    entries.filter((e) => e.grupoId === group.id).map((e) => [cellKey(e.diaId, e.bloque), e]),
  )
  const saved = new Map([...savedEntries].map(([key, e]) => [key, e.planItemId ?? ORPHAN]))
  const [draft, setDraft] = useState<Map<string, number> | null>(null)
  const cells = draft ?? saved
  const isDirty = draft != null

  const items = plan?.rows ?? []
  const used = new Map<number, number>()
  for (const id of cells.values()) if (id !== ORPHAN) used.set(id, (used.get(id) ?? 0) + 1)

  const slots = getScheduleSlots(
    schedule.startTime,
    schedule.endTime,
    schedule.blocks,
    schedule.breaks,
  )

  // Regla 74: lo afectado se conserva y se marca hasta que se corrige. Una celda
  // que no se tocó viaja con su horarioId y el back la guarda tal cual.
  const unchanged = (key: string) => savedEntries.has(key) && saved.get(key) === cells.get(key)
  const affectedCause = (key: string) =>
    unchanged(key) && savedEntries.get(key)?.afectado
      ? (savedEntries.get(key)?.causa ?? "PLAN")
      : null
  const gridBlocks = slots.filter((slot) => slot.kind !== "break").length
  const outOfGrid = [...cells.keys()].filter((key) => Number(key.split("-")[1]) >= gridBlocks)
  const affectedCount = [...cells.keys()].filter((key) => affectedCause(key) != null).length
  const dayName = (diaId: number) => DAY_LABEL[WEEK.find((d) => d.dayId === diaId)?.id ?? ""] ?? ""

  function removeOutOfGrid() {
    const next = new Map(cells)
    for (const key of outOfGrid) next.delete(key)
    setDraft(next)
  }

  function setCell(key: string, value: string) {
    const next = new Map(cells)
    if (value === NONE) next.delete(key)
    else next.set(key, Number(value))
    setDraft(next)
  }

  async function save() {
    // `fn_horario_guardar` reemplaza el horario de todo el grado: se mandan
    // también los demás grupos tal como están.
    const others = entries.filter((e) => e.grupoId !== group.id)
    const mine = [...cells].map(([key, value]) => {
      const [diaId, bloque] = key.split("-").map(Number)
      return {
        grupoId: group.id,
        planItemId: value === ORPHAN ? null : value,
        diaId,
        bloque,
        horarioId: unchanged(key) ? savedEntries.get(key)?.horarioId : undefined,
      }
    })
    try {
      await updateHorario.mutateAsync({ gradeId, entries: [...others, ...mine] })
      setDraft(null)
      notify(`Se guardó el horario de ${group.codigo}.`)
    } catch (error) {
      notify(getErrorMessage(error), { variant: "error" })
    }
  }

  if (planPending || horarioPending) {
    return (
      <div className="flex justify-center py-8">
        <Spinner />
      </div>
    )
  }

  return (
    <section aria-label={`Horario de ${group.codigo}`} className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <h4 className="flex items-center gap-1 text-lg font-semibold">
          Horario de {group.codigo}
          <Tooltip>
            <TooltipTrigger
              render={
                <button
                  type="button"
                  className="text-muted-foreground"
                  aria-label="Sobre el horario"
                />
              }
            >
              <InfoIcon className="size-4" />
            </TooltipTrigger>
            <TooltipContent className="max-w-xs">
              Cada asignatura llega hasta su intensidad horaria semanal: al completarla deja de
              aparecer en las demás celdas. Los recesos no se asignan.
            </TooltipContent>
          </Tooltip>
        </h4>
        {academicPeriodId != null && (
          // Imprime lo guardado, no lo que se está editando.
          <PrintReportButton
            label="Imprimir horario"
            report="periodo-horarios"
            filters={{ FK_PERIODO: academicPeriodId, FK_GRUPOS: [group.id] }}
            emptyReason={savedEntries.size === 0 ? "El grupo aún no tiene horario guardado." : undefined}
            confirm={
              affectedCount > 0
                ? {
                    title: "Horario con bloques por corregir",
                    description: `El horario de ${group.codigo} tiene ${affectedCount} bloques afectados por un cambio. ¿Desea generarlo así?`,
                  }
                : undefined
            }
          />
        )}
        {items.length > 0 && (
          <div className="ml-auto flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
            <span>Bloques usados / intensidad horaria:</span>
            {items.map((item) => {
              const count = used.get(item.codigo) ?? 0
              const full = count >= item.intensidadHoraria
              return (
                <Badge
                  key={item.codigo}
                  variant="soft"
                  color={full ? "success" : "neutral"}
                  className="border border-current/20"
                >
                  {full && <span aria-hidden className="size-1.5 rounded-full bg-current" />}
                  {item.asignatura} {count}/{item.intensidadHoraria}
                </Badge>
              )
            })}
          </div>
        )}
      </div>

      {(affectedCount > 0 || outOfGrid.length > 0) && (
        <div className="flex items-start gap-2 rounded-md border border-orange-stroke bg-orange-22 px-3 py-2 text-sm">
          <WarningIcon className="mt-0.5 size-4 shrink-0 text-orange" aria-hidden />
          <div className="flex flex-1 flex-col gap-1">
            <span>
              El horario de {group.codigo} tiene {affectedCount}{" "}
              {affectedCount === 1 ? "bloque afectado" : "bloques afectados"} por un cambio (marca
              ‹!›). Revíselos y corríjalos.
            </span>
            {outOfGrid.length > 0 && (
              <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                Fuera de la grilla del grado:{" "}
                {outOfGrid
                  .map((key) => {
                    const [diaId, bloque] = key.split("-").map(Number)
                    return `${dayName(diaId)} bloque ${bloque + 1}`
                  })
                  .join(", ")}
                .
                {!readOnly && (
                  <Button size="sm" variant="outline" color="neutral" onClick={removeOutOfGrid}>
                    Quitar los de fuera de la grilla
                  </Button>
                )}
              </span>
            )}
          </div>
        </div>
      )}

      {items.length === 0 ? (
        <p className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
          El grado aún no tiene plan de estudio. Agregue asignaturas en Plan de estudio para armar
          el horario.
        </p>
      ) : slots.length === 0 ? (
        <p className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
          Defina la Hora inicio, la Hora final y el Número de bloques para armar el horario.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full min-w-[720px] border-collapse text-sm">
            <thead>
              <tr className="bg-muted/40 text-left">
                <th scope="col" className="w-44 border-r border-border px-3 py-2.5 font-medium">
                  Bloque
                </th>
                {WEEK.map((day) => (
                  <th
                    key={day.id}
                    scope="col"
                    className="border-r border-border px-3 py-2.5 font-medium last:border-r-0"
                  >
                    {DAY_LABEL[day.id]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {slots.map((slot) =>
                slot.kind === "break" ? (
                  <tr key={`b-${slot.startTime}`} className="border-t border-border bg-muted/30">
                    <td
                      colSpan={WEEK.length + 1}
                      className="px-3 py-1.5 text-xs text-muted-foreground"
                    >
                      <span className="flex items-center gap-3">
                        {slot.label} · {slot.startTime}–{slot.endTime}
                        <span
                          aria-hidden
                          className="h-px flex-1 border-t border-dashed border-border"
                        />
                      </span>
                    </td>
                  </tr>
                ) : (
                  <tr key={`k-${slot.block}`} className="border-t border-border">
                    <th
                      scope="row"
                      className="border-r border-border px-3 py-1.5 text-left font-normal whitespace-nowrap tabular-nums"
                    >
                      {slot.block} · {slot.startTime}–{slot.endTime}
                    </th>
                    {WEEK.map((day) => {
                      const key = cellKey(day.dayId, slot.block - 1)
                      const value = cells.get(key)
                      // Solo asignaturas con bloques libres, más la que ya tiene la celda.
                      const options = items.filter(
                        (item) =>
                          item.codigo === value ||
                          (used.get(item.codigo) ?? 0) < item.intensidadHoraria,
                      )
                      const changed = isDirty && saved.get(key) !== value
                      const cause = affectedCause(key)
                      return (
                        <td
                          key={day.id}
                          className={cn(
                            "relative border-r border-border p-1 last:border-r-0",
                            // "Sin clase" con el mismo fondo de la columna del sábado.
                            (day.id === "sab" || value == null) && "bg-muted/30",
                            changed && "bg-orange-22",
                            cause && "bg-red-22",
                          )}
                        >
                          {cause && (
                            <Tooltip>
                              <TooltipTrigger
                                render={
                                  <span
                                    tabIndex={0}
                                    aria-label={CAUSE_TEXT[cause]}
                                    className="absolute top-0.5 right-1 z-10 text-xs font-semibold text-red"
                                  />
                                }
                              >
                                ‹!›
                              </TooltipTrigger>
                              <TooltipContent>{CAUSE_TEXT[cause]}</TooltipContent>
                            </Tooltip>
                          )}
                          <ComboboxField
                            disabled={readOnly}
                            items={{
                              [NONE]: "Sin clase",
                              ...Object.fromEntries(
                                items.map((i) => [String(i.codigo), i.asignatura]),
                              ),
                              ...(value === ORPHAN
                                ? {
                                    [String(ORPHAN)]:
                                      `${savedEntries.get(key)?.asignatura ?? "Asignatura"} (fuera del plan)`,
                                  }
                                : {}),
                            }}
                            value={value != null ? String(value) : NONE}
                            onValueChange={(next) => next && setCell(key, next)}
                          >
                            <ComboboxFieldTrigger
                              size="sm"
                              aria-label={`${DAY_LABEL[day.id]}, bloque ${slot.block}`}
                              className={cn(
                                // Se ve como texto; al pasar el mouse o abrirlo, como select con borde redondeado.
                                // Borde neutro también al enfocar o abrir: sin el azul del campo normal.
                                // La variante standard deja el borde de abajo y px-0: se anulan acá.
                                "h-8 rounded-md border border-transparent border-b-transparent bg-transparent px-3 py-0 shadow-none hover:border-input hover:border-b-input hover:bg-background focus-within:border-input focus-within:border-b-input focus-within:ring-0 data-[popup-open]:border-input data-[popup-open]:border-b-input data-[popup-open]:bg-background data-[popup-open]:ring-0",
                                value == null && "text-muted-foreground",
                              )}
                            >
                              {/* La capa del valor es absoluta y no hereda el padding del recuadro: se repone para que el texto quede donde el cursor. */}
                              <ComboboxFieldValue className="pl-3" />
                            </ComboboxFieldTrigger>
                            <ComboboxFieldContent>
                              <ComboboxGroup>
                                <ComboboxFieldItem value={NONE}>Sin clase</ComboboxFieldItem>
                                {options.map((item) => (
                                  <ComboboxFieldItem key={item.codigo} value={String(item.codigo)}>
                                    {item.asignatura}
                                  </ComboboxFieldItem>
                                ))}
                              </ComboboxGroup>
                            </ComboboxFieldContent>
                          </ComboboxField>
                        </td>
                      )
                    })}
                  </tr>
                ),
              )}
            </tbody>
          </table>
        </div>
      )}

      {isDirty && !readOnly && (
        <div className="flex justify-end gap-2">
          <Button size="sm" variant="outline" color="neutral" onClick={() => setDraft(null)}>
            Descartar cambios
          </Button>
          <Button size="sm" color="primary" onClick={save} disabled={updateHorario.isPending}>
            {updateHorario.isPending && (
              <SpinnerIcon data-icon="inline-start" className="animate-spin" />
            )}
            Guardar horario
          </Button>
        </div>
      )}
    </section>
  )
}
