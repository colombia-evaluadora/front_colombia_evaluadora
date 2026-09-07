import { useState } from "react"

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { inputTriggerVariants, inputVariants } from "@/components/ui/input"
import { CaretDownIcon, CaretRightIcon } from "@/components/ui/icons"
import { cn } from "@/lib/utils"

import { useGradosCatalogQuery, type GradoCatalogOption } from "@/features/establishment/academic-period/api/query/use-grados-catalog"
import { useGradeGroupsQuery } from "@/features/establishment/academic-period/api/query/use-grade-groups"
import { palabraGradoDesdeNombreCatalogo } from "@/features/planeador/lib/grado-nivel-educativo"
import { ASIGNATURA_OPTIONS } from "@/features/planeador/components/forms/form-editar-actividad"

export interface RangoFechasOption {
  value: string
  label: string
}

// Sin un catálogo real de periodos de evaluación poblado en el mock (la
// tabla `evaluationPeriodsDb` está vacía — ver `use-evaluation-periods.ts`),
// se deja este placeholder fijo, mismo criterio que `ASIGNATURA_OPTIONS`:
// documentado como aproximación, listo para reemplazar por
// `useEvaluationPeriodsQuery` el día que haya datos reales que mostrar acá.
export const RANGO_FECHAS_OPTIONS: RangoFechasOption[] = [
  { value: "1", label: "20/02/2026 | 30/05/2026" },
  { value: "2", label: "05/06/2026 | 30/11/2026" },
]

export interface FiltroPlanillaValue {
  grado: GradoCatalogOption
  grupoCodigo: string
  asignatura: string
  rangoFechas: RangoFechasOption
}

interface FiltroPlanillaCascadaProps {
  value: FiltroPlanillaValue | null
  onChange: (value: FiltroPlanillaValue | null) => void
}

/**
 * "Filtro" de la Planilla de calificación: un solo popover con columnas que
 * se van revelando de a una a medida que se elige — Grado → Grupo →
 * Asignatura → rango de fechas —, todas visibles lado a lado (no
 * submenús que se abren en cascada uno tapando al otro). No hay ningún
 * componente compartido para esto en el resto de la app, así que se arma acá
 * con columnas de a mano dentro de un `PopoverContent` angosto sin padding.
 *
 * El borrador de la elección en curso vive aparte de `value` (el filtro ya
 * aplicado): así, si se cierra el popover a mitad de camino (click afuera),
 * la próxima vez que se abre vuelve a mostrar el filtro aplicado, no el
 * borrador a medio elegir.
 */
export function FiltroPlanillaCascada({ value, onChange }: FiltroPlanillaCascadaProps) {
  const [open, setOpen] = useState(false)
  const [gradoDraft, setGradoDraft] = useState<GradoCatalogOption | null>(value?.grado ?? null)
  const [grupoDraft, setGrupoDraft] = useState<string | null>(value?.grupoCodigo ?? null)
  const [asignaturaDraft, setAsignaturaDraft] = useState<string | null>(value?.asignatura ?? null)

  const { data: grados = [] } = useGradosCatalogQuery()
  const { data: gruposResult } = useGradeGroupsQuery({
    filters: {},
    sorting: [],
    pageIndex: 0,
    pageSize: 100,
    gradeId: gradoDraft?.id,
    enabled: gradoDraft != null,
  })
  const grupos = gruposResult?.rows ?? []

  function handleOpenChange(next: boolean) {
    setOpen(next)
    if (!next) {
      // Vuelve al último filtro aplicado — un cierre a mitad de camino no
      // debe dejar el borrador a la vista la próxima vez que se abre.
      setGradoDraft(value?.grado ?? null)
      setGrupoDraft(value?.grupoCodigo ?? null)
      setAsignaturaDraft(value?.asignatura ?? null)
    }
  }

  function elegirGrado(grado: GradoCatalogOption) {
    setGradoDraft(grado)
    setGrupoDraft(null)
    setAsignaturaDraft(null)
  }

  function elegirGrupo(codigo: string) {
    setGrupoDraft(codigo)
    setAsignaturaDraft(null)
  }

  function elegirRango(rango: RangoFechasOption) {
    if (!gradoDraft || !grupoDraft || !asignaturaDraft) return
    onChange({ grado: gradoDraft, grupoCodigo: grupoDraft, asignatura: asignaturaDraft, rangoFechas: rango })
    setOpen(false)
  }

  const label = value
    ? [
        palabraGradoDesdeNombreCatalogo(value.grado.nombre) ?? value.grado.nombre,
        `${value.grado.valor}${value.grupoCodigo}`,
        value.asignatura,
        value.rangoFechas.label,
      ].join(" / ")
    : null

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger
        render={
          <button
            type="button"
            className={cn(
              inputVariants({ variant: "outlined" }),
              inputTriggerVariants({ variant: "outlined" }),
              "flex items-center justify-between gap-2 text-left",
              !label && "text-muted-foreground",
            )}
          />
        }
      >
        <span className="min-w-0 truncate">
          {label ?? "Grado, grupo, asignatura y rango de fechas"}
        </span>
        <CaretDownIcon className="text-muted-foreground size-4 shrink-0" />
      </PopoverTrigger>

      <PopoverContent align="start" className="w-auto flex-row gap-0 p-0">
        <FiltroColumna
          items={grados.map((grado) => ({
            key: grado.id,
            label: palabraGradoDesdeNombreCatalogo(grado.nombre) ?? grado.nombre,
          }))}
          selectedKey={gradoDraft?.id ?? null}
          onSelect={(key) => {
            const grado = grados.find((g) => g.id === key)
            if (grado) elegirGrado(grado)
          }}
        />

        {gradoDraft && (
          <FiltroColumna
            items={grupos.map((grupo) => ({
              key: grupo.codigo,
              label: `${gradoDraft.valor}${grupo.codigo}`,
            }))}
            selectedKey={grupoDraft}
            onSelect={elegirGrupo}
          />
        )}

        {gradoDraft && grupoDraft && (
          <FiltroColumna
            items={ASIGNATURA_OPTIONS.map((asignatura) => ({ key: asignatura, label: asignatura }))}
            selectedKey={asignaturaDraft}
            onSelect={setAsignaturaDraft}
          />
        )}

        {gradoDraft && grupoDraft && asignaturaDraft && (
          <FiltroColumna
            items={RANGO_FECHAS_OPTIONS.map((rango) => ({ key: rango.value, label: rango.label }))}
            selectedKey={value?.rangoFechas.value ?? null}
            onSelect={(key) => {
              const rango = RANGO_FECHAS_OPTIONS.find((r) => r.value === key)
              if (rango) elegirRango(rango)
            }}
            showCaret={false}
            className="border-r-0"
          />
        )}
      </PopoverContent>
    </Popover>
  )
}

interface FiltroColumnaProps<T extends string | number> {
  items: { key: T; label: string }[]
  selectedKey: T | null
  onSelect: (key: T) => void
  /** La última columna (rango de fechas) no encadena nada más — sin flecha. */
  showCaret?: boolean
  className?: string
}

function FiltroColumna<T extends string | number>({
  items,
  selectedKey,
  onSelect,
  showCaret = true,
  className,
}: FiltroColumnaProps<T>) {
  return (
    <ul className={cn("min-w-40 border-r py-1", className)}>
      {items.map((item) => (
        <li key={item.key}>
          <button
            type="button"
            onClick={() => onSelect(item.key)}
            className={cn(
              "flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm whitespace-nowrap hover:bg-muted-22",
              selectedKey === item.key && "bg-primary-22 text-primary font-semibold",
            )}
          >
            {item.label}
            {showCaret && <CaretRightIcon className="text-muted-foreground size-4 shrink-0" />}
          </button>
        </li>
      ))}
    </ul>
  )
}
