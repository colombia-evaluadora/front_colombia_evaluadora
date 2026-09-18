import { CaretDownIcon } from "@/components/ui/icons"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { inputTriggerVariants, inputVariants, useInputVariant } from "@/components/ui/input"
import { cn } from "@/lib/utils"

import type { MatriculaGrupo } from "@/features/planeador/api/query/use-actividad-matriculas-grupo-query"

export interface EstudiantesSelection {
  matriculaIds: number[]
  allSelected: boolean
}

interface EstudiantesMultiSelectProps {
  id?: string
  estudiantes: MatriculaGrupo[]
  value: number[]
  /** Mismo significado que `Actividad.asignarTodoElGrupo`: `true` = todo el
   *  grupo, `value` se ignora. Es un prop APARTE (no se infiere de
   *  `value.length === 0`) porque `false` con `value` vacío es un estado
   *  real y distinto — la actividad no se le asigna a nadie todavía, no
   *  "todavía no elegí" —, y las dos formas de estar vacío deben poder
   *  representarse. */
  allSelected: boolean
  onChange: (next: EstudiantesSelection) => void
  disabled?: boolean
  isPending?: boolean
  placeholder?: string
}

/**
 * "Estudiantes": mismo patrón que `TeachingLevelsMultiSelect` (`<Select>`
 * que abre un menú de checkboxes), pero sin la medición de overflow por
 * chips — un grupo puede tener 60+ estudiantes, y listarlos todos como
 * badges saturaría el trigger. En su lugar el trigger muestra un resumen
 * ("N estudiantes" / "Ningún estudiante" / "Todo el grupo").
 *
 * El checkbox "maestro" ("Seleccionar todos"/"Deseleccionar todos") es un
 * toggle real de dos extremos (todos ↔ ninguno), como el de cualquier
 * tabla — a diferencia de una versión anterior de este componente, que solo
 * dejaba VOLVER a "todo el grupo" y nunca representaba "a nadie" a
 * propósito: `Actividad.asignarTodoElGrupo: false` con `matriculasIds: []`
 * es un estado real que el backend acepta (`fn_actividad_crear`/
 * `_actualizar`, V224 — "false = solo matriculasIds"), así que guardar una
 * actividad sin nadie asignado tiene que ser posible.
 */
export function EstudiantesMultiSelect({
  id,
  estudiantes,
  value,
  allSelected,
  onChange,
  disabled = false,
  isPending = false,
  placeholder = "Seleccionar",
}: EstudiantesMultiSelectProps) {
  const resolvedVariant = useInputVariant()

  function isChecked(matriculaId: number) {
    return allSelected || value.includes(matriculaId)
  }

  function toggle(matriculaId: number) {
    if (allSelected) {
      // Todos tildados: destildar uno arma la lista explícita de los demás.
      onChange({
        matriculaIds: estudiantes.filter((e) => e.id !== matriculaId).map((e) => e.id),
        allSelected: false,
      })
      return
    }
    if (value.includes(matriculaId)) {
      onChange({ matriculaIds: value.filter((matId) => matId !== matriculaId), allSelected: false })
      return
    }
    const next = [...value, matriculaId]
    // Se volvió a tildar el último que faltaba: colapsa a "todo el grupo"
    // en vez de dejar una lista explícita del mismo tamaño — un solo
    // significado para "todos", nunca dos formas distintas de decirlo.
    onChange(
      next.length === estudiantes.length
        ? { matriculaIds: [], allSelected: true }
        : { matriculaIds: next, allSelected: false },
    )
  }

  const label = isPending
    ? "Cargando…"
    : estudiantes.length === 0
      ? placeholder
      : allSelected
        ? "Todo el grupo"
        : value.length === 0
          ? "Ningún estudiante"
          : `${value.length} estudiante${value.length === 1 ? "" : "s"}`

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <button
            id={id}
            type="button"
            disabled={disabled || isPending}
            className={cn(
              inputVariants({ variant: resolvedVariant }),
              inputTriggerVariants({ variant: resolvedVariant }),
              "flex h-11 items-center justify-between gap-2 text-left",
            )}
          />
        }
      >
        <span className={cn("truncate", estudiantes.length === 0 && "text-muted-foreground")}>{label}</span>
        <CaretDownIcon className="text-muted-foreground size-4 shrink-0" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="max-h-72 min-w-72 overflow-y-auto">
        {estudiantes.length === 0 ? (
          <div className="text-muted-foreground px-3 py-2 text-sm">Sin estudiantes en este grupo.</div>
        ) : (
          <>
            <DropdownMenuCheckboxItem
              checked={allSelected}
              onCheckedChange={() => onChange({ matriculaIds: [], allSelected: !allSelected })}
            >
              {allSelected ? "Deseleccionar todos" : "Seleccionar todos"}
            </DropdownMenuCheckboxItem>
            <DropdownMenuSeparator />
          </>
        )}
        {estudiantes.length > 0 &&
          estudiantes.map((estudiante) => (
            <DropdownMenuCheckboxItem
              key={estudiante.id}
              checked={isChecked(estudiante.id)}
              onCheckedChange={() => toggle(estudiante.id)}
            >
              {estudiante.nombre}
            </DropdownMenuCheckboxItem>
          ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
