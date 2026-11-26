import { ChipsSeleccion } from "@/components/chips-seleccion"
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
  /** Texto del trigger con todos tildados. Default pensado para "Estudiantes
   *  de la {rótulo}" (todo el grupo); la adaptación curricular lo cambia
   *  porque sus opciones son los estudiantes DE LA ACTIVIDAD, no del grupo. */
  allSelectedLabel?: string
  /** Marca el trigger como inválido (`aria-invalid`), para el "obligatorio"
   *  de la adaptación. */
  invalid?: boolean
  /** Se llama al abrir/cerrar el menú — la adaptación lo usa para marcar
   *  el campo "tocado" al cerrarlo. */
  onOpenChange?: (open: boolean) => void
}

/**
 * "Estudiantes": menú de checkboxes como `TeachingLevelsMultiSelect`. Una lista concreta se ve en chips con «+N»
 * (`ChipsSeleccion`, como todos los selectores múltiples); el texto de abajo describe el resumen que queda
 * para «todos» y «ninguno». Antes: mismo patrón que `TeachingLevelsMultiSelect` (`<Select>`
 * que abre un menú de checkboxes), pero sin la medición de overflow por
 * chips — un grupo puede tener 60+ estudiantes, y listarlos todos como
 * badges saturaría el trigger. En su lugar el trigger muestra un resumen
 * ("N estudiantes" / "Ningún estudiante" / "Todos los estudiantes del grupo").
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
  allSelectedLabel = "Todos los estudiantes del grupo",
  invalid = false,
  onOpenChange,
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

  const nombres = new Map(estudiantes.map((e) => [e.id, e.nombre]))
  const label = isPending
    ? "Cargando…"
    : estudiantes.length === 0
      ? placeholder
      : allSelected
        ? allSelectedLabel
        : value.length === 0
          ? "Ningún estudiante"
          : `${value.length} estudiante${value.length === 1 ? "" : "s"}`

  return (
    <DropdownMenu onOpenChange={onOpenChange ? (open) => onOpenChange(open) : undefined}>
      {/* Mismo armado que `SubjectsMultiSelect`: el recuadro es un div con el botón del menú por debajo
          (`absolute inset-0`) y los chips encima, así la «×» de cada chip no queda dentro de un botón. */}
      <div
        aria-invalid={invalid || undefined}
        className={cn(
          inputVariants({ variant: resolvedVariant }),
          inputTriggerVariants({ variant: resolvedVariant }),
          "relative flex h-10 items-center justify-between gap-2 text-left",
          (disabled || isPending) && "cursor-not-allowed bg-muted/50 opacity-70 hover:border-input",
        )}
      >
        <DropdownMenuTrigger
          render={
            <button
              id={id}
              type="button"
              disabled={disabled || isPending}
              aria-label={label}
              className="absolute inset-0 z-0 cursor-pointer bg-transparent outline-none disabled:cursor-not-allowed"
            />
          }
        />
        {/* Una lista concreta va en chips (como todos los selectores múltiples); «Todos los estudiantes del
            grupo», «Ningún estudiante» o «Cargando…» siguen como texto. */}
        {!isPending && !allSelected && value.length > 0 ? (
          <ChipsSeleccion
            className="relative z-10"
            elementos={value.map((m) => ({ id: m, label: nombres.get(m) ?? `Matrícula ${m}` }))}
            deshabilitado={disabled}
            onQuitar={(m) => onChange({ matriculaIds: value.filter((x) => x !== m), allSelected: false })}
          />
        ) : (
          <span
            className={cn("pointer-events-none relative z-10 truncate", estudiantes.length === 0 && "text-muted-foreground")}
          >
            {label}
          </span>
        )}
        <CaretDownIcon className="text-muted-foreground pointer-events-none relative z-10 size-5 shrink-0" />
      </div>
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
