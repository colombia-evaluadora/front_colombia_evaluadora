import { useMemo, useState } from "react"

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { inputTriggerVariants, inputVariants } from "@/components/ui/input"
import { CaretDownIcon, CaretRightIcon } from "@/components/ui/icons"
import { cn } from "@/lib/utils"

import { useDocenteGruposQuery } from "@/features/planeador/api/query/use-docente-grupos-query"
import { useDocenteGradoAsignaturaQuery } from "@/features/planeador/api/query/use-docente-grado-asignatura-query"
import { usePlaneadorPeriodosEvaluacionQuery } from "@/features/planeador/api/query/use-planeador-periodos-evaluacion-query"
import type { EvaluationPeriod } from "@/features/establishment/academic-period/api/types/evaluation-period"
import { formatDate } from "@/features/planeador/lib/format-date"

/** `grupo_codigo` viene `null` en los datos reales — `grupo_nombre` ("01",
 *  "302", …) es el que sí trae valor, así que se prioriza acá. */
function grupoLabel(grupo: { grupoCodigo: string; grupoNombre: string }): string {
  return grupo.grupoCodigo || grupo.grupoNombre
}

export interface FiltroPlanillaValue {
  gradoId: number
  gradoNombre: string
  grupoId: number
  grupoCodigo: string
  asignaturaId: number
  asignaturaNombre: string
  periodoEvaluacion: EvaluationPeriod
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
 * Grado/Grupo salen de `GET /planeador/docentes/grupos` (una fila por grupo
 * del DOCENTE autenticado, con su grado embebido — se agrupa acá por
 * `gradoId` para armar las dos primeras columnas) y Asignatura de
 * `GET /planeador/docentes/grado-asignatura` (pares grado↔asignatura del
 * mismo docente), filtrada por el grado elegido — mismos endpoints reales
 * documentados en la colección Postman `planeador-planilla`, sección 2.
 *
 * El borrador de la elección en curso vive aparte de `value` (el filtro ya
 * aplicado): así, si se cierra el popover a mitad de camino (click afuera),
 * la próxima vez que se abre vuelve a mostrar el filtro aplicado, no el
 * borrador a medio elegir.
 */
export function FiltroPlanillaCascada({ value, onChange }: FiltroPlanillaCascadaProps) {
  const [open, setOpen] = useState(false)
  const [gradoIdDraft, setGradoIdDraft] = useState<number | null>(value?.gradoId ?? null)
  const [grupoIdDraft, setGrupoIdDraft] = useState<number | null>(value?.grupoId ?? null)
  const [asignaturaIdDraft, setAsignaturaIdDraft] = useState<number | null>(
    value?.asignaturaId ?? null,
  )
  const [periodoIdDraft, setPeriodoIdDraft] = useState<number | null>(
    value?.periodoEvaluacion.id ?? null,
  )

  const { data: docenteGrupos = [] } = useDocenteGruposQuery()
  const { data: docenteGradoAsignatura = [] } = useDocenteGradoAsignaturaQuery()
  const { data: periodos = [] } = usePlaneadorPeriodosEvaluacionQuery()

  // La columna Grado sale de `docentes/grado-asignatura` (grado↔asignatura
  // que dicta el docente), no de `docentes/grupos`: son dos universos
  // distintos — un docente puede dictar una asignatura en un grado sin
  // necesariamente tener un grupo propio ahí, así que armar "Grado" a
  // partir de los grupos podía dejarlo vacío aunque sí hubiera datos en
  // grado-asignatura.
  const grados = useMemo(() => {
    const porId = new Map<number, { id: number; nombre: string }>()
    for (const par of docenteGradoAsignatura) {
      if (!porId.has(par.gradoId)) {
        porId.set(par.gradoId, { id: par.gradoId, nombre: par.gradoNombre })
      }
    }
    return [...porId.values()]
  }, [docenteGradoAsignatura])

  const grupos = useMemo(
    () => docenteGrupos.filter((grupo) => grupo.gradoId === gradoIdDraft),
    [docenteGrupos, gradoIdDraft],
  )

  const asignaturas = useMemo(
    () => docenteGradoAsignatura.filter((par) => par.gradoId === gradoIdDraft),
    [docenteGradoAsignatura, gradoIdDraft],
  )

  function handleOpenChange(next: boolean) {
    setOpen(next)
    if (!next) {
      setGradoIdDraft(value?.gradoId ?? null)
      setGrupoIdDraft(value?.grupoId ?? null)
      setAsignaturaIdDraft(value?.asignaturaId ?? null)
      setPeriodoIdDraft(value?.periodoEvaluacion.id ?? null)
    }
  }

  function elegirGrado(gradoId: number) {
    setGradoIdDraft(gradoId)
    setGrupoIdDraft(null)
    setAsignaturaIdDraft(null)
    setPeriodoIdDraft(null)
  }

  function elegirGrupo(grupoId: number) {
    setGrupoIdDraft(grupoId)
    setAsignaturaIdDraft(null)
    setPeriodoIdDraft(null)
  }

  function elegirAsignatura(asignaturaId: number) {
    setAsignaturaIdDraft(asignaturaId)
    setPeriodoIdDraft(null)
  }

  function elegirPeriodo(periodo: EvaluationPeriod) {
    const grado = grados.find((g) => g.id === gradoIdDraft)
    const grupo = grupos.find((g) => g.grupoId === grupoIdDraft)
    const asignatura = asignaturas.find((a) => a.asignaturaId === asignaturaIdDraft)
    if (!grado || !grupo || !asignatura) return
    setPeriodoIdDraft(periodo.id)
    onChange({
      gradoId: grado.id,
      gradoNombre: grado.nombre,
      grupoId: grupo.grupoId,
      grupoCodigo: grupoLabel(grupo),
      asignaturaId: asignatura.asignaturaId,
      asignaturaNombre: asignatura.asignaturaNombre,
      periodoEvaluacion: periodo,
    })
    setOpen(false)
  }

  const label = value
    ? [
        value.gradoNombre,
        value.grupoCodigo,
        value.asignaturaNombre,
        `${formatDate(value.periodoEvaluacion.startDate)} | ${formatDate(value.periodoEvaluacion.endDate)}`,
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
          items={grados.map((grado) => ({ key: grado.id, label: grado.nombre }))}
          selectedKey={gradoIdDraft}
          onSelect={elegirGrado}
        />

        {gradoIdDraft != null && (
          <FiltroColumna
            items={grupos.map((grupo) => ({ key: grupo.grupoId, label: grupoLabel(grupo) }))}
            selectedKey={grupoIdDraft}
            onSelect={elegirGrupo}
          />
        )}

        {gradoIdDraft != null && grupoIdDraft != null && (
          <FiltroColumna
            items={asignaturas.map((asignatura) => ({
              key: asignatura.asignaturaId,
              label: asignatura.asignaturaNombre,
            }))}
            selectedKey={asignaturaIdDraft}
            onSelect={elegirAsignatura}
          />
        )}

        {gradoIdDraft != null && grupoIdDraft != null && asignaturaIdDraft != null && (
          <FiltroColumna
            items={periodos.map((periodo) => ({
              key: periodo.id,
              label: `${periodo.nombre}: ${formatDate(periodo.startDate)} | ${formatDate(periodo.endDate)}`,
            }))}
            selectedKey={periodoIdDraft}
            onSelect={(key) => {
              const periodo = periodos.find((p) => p.id === key)
              if (periodo) elegirPeriodo(periodo)
            }}
            showCaret={false}
            className="border-r-0"
          />
        )}
      </PopoverContent>
    </Popover>
  )
}

export interface FiltroColumnaProps<T extends string | number> {
  items: { key: T; label: string }[]
  selectedKey: T | null
  onSelect: (key: T) => void
  showCaret?: boolean
  className?: string
}

export function FiltroColumna<T extends string | number>({
  items,
  selectedKey,
  onSelect,
  showCaret = true,
  className,
}: FiltroColumnaProps<T>) {
  return (
    <ul className={cn("min-w-40 border-r py-1", className)}>
      {items.length === 0 && (
        <li className="text-muted-foreground px-3 py-2 text-sm whitespace-nowrap">Sin opciones</li>
      )}
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
