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

interface EstudiantesMultiSelectProps {
  id?: string
  estudiantes: MatriculaGrupo[]
  value: number[]
  onChange: (matriculaIds: number[]) => void
  disabled?: boolean
  isPending?: boolean
  placeholder?: string
}

/**
 * "Estudiantes": mismo patrón que `TeachingLevelsMultiSelect` (`<Select>`
 * que abre un menú de checkboxes), pero sin la medición de overflow por
 * chips — un grupo puede tener 60+ estudiantes, y listarlos todos como
 * badges saturaría el trigger. En su lugar el trigger muestra un resumen
 * ("N estudiantes" / "Todo el grupo" cuando están todos tildados).
 *
 * `value` vacío es "todavía no se elige nadie a mano" — el caller lo trata
 * como `ASIGNAR_TODO_EL_GRUPO` (ver `Actividad.asignarTodoElGrupo`), no como
 * "ningún estudiante": ese es el comportamiento de siempre antes de que
 * existiera este campo, así que arrancar en `[]` no cambia nada para quien
 * no lo toca.
 */
export function EstudiantesMultiSelect({
  id,
  estudiantes,
  value,
  onChange,
  disabled = false,
  isPending = false,
  placeholder = "Seleccionar",
}: EstudiantesMultiSelectProps) {
  const resolvedVariant = useInputVariant()

  function toggle(matriculaId: number) {
    onChange(value.includes(matriculaId) ? value.filter((id) => id !== matriculaId) : [...value, matriculaId])
  }

  const label = isPending
    ? "Cargando…"
    : value.length === 0
      ? placeholder
      : value.length === estudiantes.length
        ? "Todo el grupo"
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
        <span className={cn("truncate", value.length === 0 && "text-muted-foreground")}>{label}</span>
        <CaretDownIcon className="text-muted-foreground size-4 shrink-0" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="max-h-72 min-w-72 overflow-y-auto">
        {estudiantes.length === 0 ? (
          <div className="text-muted-foreground px-3 py-2 text-sm">Sin estudiantes en este grupo.</div>
        ) : (
          <>
            {/* Todos tildados = "Deseleccionar todos"; cualquier otro estado
                (ninguno o algunos) = "Seleccionar todos" — mismo criterio
                que un checkbox "maestro" de tabla: clickearlo siempre lleva
                a un extremo (todos o ninguno), nunca a un estado intermedio. */}
            <DropdownMenuCheckboxItem
              checked={value.length === estudiantes.length}
              onCheckedChange={() =>
                onChange(value.length === estudiantes.length ? [] : estudiantes.map((e) => e.id))
              }
            >
              {value.length === estudiantes.length ? "Deseleccionar todos" : "Seleccionar todos"}
            </DropdownMenuCheckboxItem>
            <DropdownMenuSeparator />
          </>
        )}
        {estudiantes.length > 0 &&
          estudiantes.map((estudiante) => (
            <DropdownMenuCheckboxItem
              key={estudiante.id}
              checked={value.includes(estudiante.id)}
              onCheckedChange={() => toggle(estudiante.id)}
            >
              {estudiante.nombre}
            </DropdownMenuCheckboxItem>
          ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
