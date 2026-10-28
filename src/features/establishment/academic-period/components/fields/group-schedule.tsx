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
import { InfoIcon, PrinterIcon, SpinnerIcon } from "@/components/ui/icons"
import { Spinner } from "@/components/ui/spinner"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

import { useHorarioQuery } from "@/features/establishment/academic-period/api/query/use-horario"
import { useStudyPlansQuery } from "@/features/establishment/academic-period/api/query/use-study-plans"
import { useUpdateHorario } from "@/features/establishment/academic-period/api/mutations/update-horario"
import type { AcademicPeriodBreak } from "@/features/establishment/academic-period/api/types/academic-period"
import type { GradeGroup } from "@/features/establishment/academic-period/api/types/grade-group"
import { getScheduleSlots } from "@/features/establishment/academic-period/utils/recesos"
import { DAYS } from "@/features/establishment/academic-period/utils/schedule-data"

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
  group,
  schedule,
}: {
  gradeId: number
  group: GradeGroup
  schedule: GroupScheduleSource
}) {
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

  const saved = new Map(
    entries.filter((e) => e.grupoId === group.id).map((e) => [cellKey(e.diaId, e.bloque), e.planItemId]),
  )
  const [draft, setDraft] = useState<Map<string, number> | null>(null)
  const cells = draft ?? saved
  const isDirty = draft != null

  const items = plan?.rows ?? []
  const used = new Map<number, number>()
  for (const id of cells.values()) used.set(id, (used.get(id) ?? 0) + 1)

  const slots = getScheduleSlots(schedule.startTime, schedule.endTime, schedule.blocks, schedule.breaks)

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
    const mine = [...cells].map(([key, planItemId]) => {
      const [diaId, bloque] = key.split("-").map(Number)
      return { grupoId: group.id, planItemId, diaId, bloque }
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
              render={<button type="button" className="text-muted-foreground" aria-label="Sobre el horario" />}
            >
              <InfoIcon className="size-4" />
            </TooltipTrigger>
            <TooltipContent className="max-w-xs">
              Cada asignatura llega hasta su intensidad horaria semanal: al completarla deja de
              aparecer en las demás celdas. Los recesos no se asignan.
            </TooltipContent>
          </Tooltip>
        </h4>
        <Tooltip>
          <TooltipTrigger render={<span tabIndex={0} />}>
            <Button size="sm" variant="outline" color="neutral" disabled>
              <PrinterIcon data-icon="inline-start" />
              Imprimir horario
            </Button>
          </TooltipTrigger>
          <TooltipContent>El PDF del horario todavía no está disponible.</TooltipContent>
        </Tooltip>
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

      {items.length === 0 ? (
        <p className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
          El grado aún no tiene plan de estudio. Agregue asignaturas en Plan de estudio para armar el
          horario.
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
                  <th key={day.id} scope="col" className="border-r border-border px-3 py-2.5 font-medium last:border-r-0">
                    {DAY_LABEL[day.id]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {slots.map((slot) =>
                slot.kind === "break" ? (
                  <tr key={`b-${slot.startTime}`} className="border-t border-border bg-muted/30">
                    <td colSpan={WEEK.length + 1} className="px-3 py-1.5 text-xs text-muted-foreground">
                      <span className="flex items-center gap-3">
                        {slot.label} · {slot.startTime}–{slot.endTime}
                        <span aria-hidden className="h-px flex-1 border-t border-dashed border-border" />
                      </span>
                    </td>
                  </tr>
                ) : (
                  <tr key={`k-${slot.block}`} className="border-t border-border">
                    <th scope="row" className="border-r border-border px-3 py-1.5 text-left font-normal whitespace-nowrap tabular-nums">
                      {slot.block} · {slot.startTime}–{slot.endTime}
                    </th>
                    {WEEK.map((day) => {
                      const key = cellKey(day.dayId, slot.block - 1)
                      const value = cells.get(key)
                      // Solo asignaturas con bloques libres, más la que ya tiene la celda.
                      const options = items.filter(
                        (item) => item.codigo === value || (used.get(item.codigo) ?? 0) < item.intensidadHoraria,
                      )
                      const changed = isDirty && saved.get(key) !== value
                      return (
                        <td
                          key={day.id}
                          className={cn(
                            "border-r border-border p-1 last:border-r-0",
                            // "Sin clase" con el mismo fondo de la columna del sábado.
                            (day.id === "sab" || value == null) && "bg-muted/30",
                            changed && "bg-orange-22",
                          )}
                        >
                          <ComboboxField
                            items={{
                              [NONE]: "Sin clase",
                              ...Object.fromEntries(items.map((i) => [String(i.codigo), i.asignatura])),
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

      {isDirty && (
        <div className="flex justify-end gap-2">
          <Button size="sm" variant="outline" color="neutral" onClick={() => setDraft(null)}>
            Descartar cambios
          </Button>
          <Button size="sm" color="primary" onClick={save} disabled={updateHorario.isPending}>
            {updateHorario.isPending && <SpinnerIcon data-icon="inline-start" className="animate-spin" />}
            Guardar horario
          </Button>
        </div>
      )}
    </section>
  )
}
