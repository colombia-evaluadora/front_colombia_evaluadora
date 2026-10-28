import { useState } from "react"

import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { CaretDownIcon, XIcon } from "@/components/ui/icons"
import { cn } from "@/lib/utils"

interface AreaLike {
  id: number
  label: string
}

interface SubjectLike {
  id: number
  label: string
  areaId: number | null
}

interface RequiredCurriculumSelectProps {
  // "AR": se eligen áreas (sus asignaturas las siguen); "AS": se eligen asignaturas.
  mode: "AR" | "AS"
  areas: AreaLike[]
  subjects: SubjectLike[]
  value: number[]
  onChange: (values: number[]) => void
  placeholder?: string
  emptyMessage: string
  disabled?: boolean
}

interface Chip {
  key: string
  label: string
  remove: number[]
}

// Obligatorias para la aprobación como árbol área > asignaturas. Arriba, lo
// elegido como chips: un área completa se resume en un solo chip.
export function RequiredCurriculumSelect({
  mode,
  areas,
  subjects,
  value,
  onChange,
  placeholder = "Ninguna",
  emptyMessage,
  disabled = false,
}: RequiredCurriculumSelectProps) {
  const [open, setOpen] = useState(false)
  const selected = new Set(value)

  const groups = areas.map((area) => ({
    area,
    subjects: subjects.filter((s) => s.areaId === area.id),
  }))
  const areaIds = new Set(areas.map((a) => a.id))
  const orphans = subjects.filter((s) => s.areaId == null || !areaIds.has(s.areaId))

  const areaChecked = (group: (typeof groups)[number]) =>
    mode === "AR"
      ? selected.has(group.area.id)
      : group.subjects.length > 0 && group.subjects.every((s) => selected.has(s.id))
  // Solo algunas asignaturas del área: el checkbox de ui/ no dibuja el estado
  // intermedio, así que se marca aquí con un cuadro relleno.
  const areaPartial = (group: (typeof groups)[number]) =>
    mode === "AS" && !areaChecked(group) && group.subjects.some((s) => selected.has(s.id))

  function toggleArea(group: (typeof groups)[number], checked: boolean) {
    if (mode === "AR") {
      onChange(checked ? [...value, group.area.id] : value.filter((v) => v !== group.area.id))
      return
    }
    const ids = group.subjects.map((s) => s.id)
    onChange(
      checked
        ? [...value, ...ids.filter((id) => !selected.has(id))]
        : value.filter((v) => !ids.includes(v)),
    )
  }

  function toggleSubject(id: number, checked: boolean) {
    onChange(checked ? [...value, id] : value.filter((v) => v !== id))
  }

  const chips: Chip[] =
    mode === "AR"
      ? areas
          .filter((a) => selected.has(a.id))
          .map((a) => ({ key: `a${a.id}`, label: a.label, remove: [a.id] }))
      : [...groups, { area: null, subjects: orphans }].flatMap((group) => {
          const picked = group.subjects.filter((s) => selected.has(s.id))
          if (group.area && picked.length > 0 && picked.length === group.subjects.length) {
            return [{ key: `a${group.area.id}`, label: group.area.label, remove: picked.map((s) => s.id) }]
          }
          return picked.map((s) => ({ key: `s${s.id}`, label: s.label, remove: [s.id] }))
        })

  const isEmpty = areas.length === 0 && subjects.length === 0

  return (
    <div className="flex flex-col gap-1">
      <div
        className={cn(
          "flex items-start gap-2 rounded-md border border-input px-3 py-2",
          disabled && "cursor-not-allowed bg-muted/50 opacity-70",
        )}
      >
        <div className="flex min-h-7 flex-1 flex-wrap items-center gap-2">
          {chips.length === 0 ? (
            <span className="text-sm text-muted-foreground">{placeholder}</span>
          ) : (
            chips.map((chip) => (
              <Badge key={chip.key} variant="soft" color="info" className="gap-1 pr-1">
                {chip.label}
                <button
                  type="button"
                  disabled={disabled}
                  aria-label={`Quitar ${chip.label}`}
                  onClick={() => onChange(value.filter((v) => !chip.remove.includes(v)))}
                  className="grid size-5 place-items-center rounded-full opacity-70 hover:opacity-100 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none disabled:pointer-events-none"
                >
                  <XIcon className="size-3.5" />
                </button>
              </Badge>
            ))
          )}
        </div>
        <button
          type="button"
          disabled={disabled}
          aria-expanded={open}
          aria-label={open ? "Ocultar áreas y asignaturas" : "Ver áreas y asignaturas"}
          onClick={() => setOpen((v) => !v)}
          className="grid size-7 shrink-0 place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none disabled:pointer-events-none"
        >
          <CaretDownIcon className={cn("size-5 transition-transform motion-reduce:transition-none", open && "rotate-180")} />
        </button>
      </div>

      {open && (
        <div className="max-h-80 overflow-y-auto rounded-md border border-input py-1">
          {isEmpty ? (
            <p className="px-3 py-2 text-sm text-muted-foreground">{emptyMessage}</p>
          ) : (
            <ul className="flex flex-col">
              {groups.map((group) => (
                <li key={group.area.id}>
                  <label
                    className={cn(
                      "flex cursor-pointer items-center gap-3 px-3 py-2 text-sm font-medium hover:bg-muted/50",
                      mode === "AS" && group.subjects.length === 0 && "cursor-default text-muted-foreground hover:bg-transparent",
                    )}
                  >
                    <Checkbox
                      checked={areaChecked(group)}
                      aria-checked={areaPartial(group) ? "mixed" : undefined}
                      className={cn(
                        areaPartial(group) &&
                          "border-primary before:absolute before:size-2 before:rounded-[1px] before:bg-primary",
                      )}
                      disabled={disabled || (mode === "AS" && group.subjects.length === 0)}
                      onCheckedChange={(checked) => toggleArea(group, Boolean(checked))}
                    />
                    {group.area.label}
                  </label>
                  {group.subjects.length > 0 && (
                    <ul>
                      {group.subjects.map((subject) => (
                        <li key={subject.id}>
                          <label
                            className={cn(
                              "flex items-center gap-3 py-2 pr-3 pl-9 text-sm",
                              mode === "AS" ? "cursor-pointer hover:bg-muted/50" : "text-muted-foreground",
                            )}
                          >
                            <Checkbox
                              checked={mode === "AR" ? selected.has(group.area.id) : selected.has(subject.id)}
                              disabled={disabled || mode === "AR"}
                              onCheckedChange={(checked) => toggleSubject(subject.id, Boolean(checked))}
                            />
                            {subject.label}
                          </label>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              ))}
              {mode === "AS" && orphans.length > 0 && (
                <li>
                  <span className="block px-3 py-2 text-sm font-medium text-muted-foreground">Sin área</span>
                  <ul>
                    {orphans.map((subject) => (
                      <li key={subject.id}>
                        <label className="flex cursor-pointer items-center gap-3 py-2 pr-3 pl-9 text-sm hover:bg-muted/50">
                          <Checkbox
                            checked={selected.has(subject.id)}
                            disabled={disabled}
                            onCheckedChange={(checked) => toggleSubject(subject.id, Boolean(checked))}
                          />
                          {subject.label}
                        </label>
                      </li>
                    ))}
                  </ul>
                </li>
              )}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
