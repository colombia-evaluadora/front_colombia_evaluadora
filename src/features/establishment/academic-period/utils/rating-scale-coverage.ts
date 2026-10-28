import type { GradingRange } from "@/features/establishment/academic-period/utils/grading-range"

export interface CoverageScale {
  nombre: string
  notaMinima: number
  notaMaxima: number
}

export type CoverageIssue =
  | { kind: "gap"; from: number; to: number }
  | { kind: "overlap"; a: string; b: string; from: number; to: number }

// Las notas se ubican con 1 decimal: se trabaja en décimas enteras para no
// arrastrar errores de punto flotante (6,0 − 0,1 = 5,9 exacto).
const tenths = (n: number) => Math.round(n * 10)
const fromTenths = (n: number) => n / 10

/**
 * Huecos y cruces de una escala (Regla 51): los rangos deben ser contiguos con
 * paso 0,1 y cubrir todo el Formato de calificación.
 */
export function getCoverageIssues(scales: CoverageScale[], range: GradingRange): CoverageIssue[] {
  const sorted = [...scales].sort((a, b) => a.notaMinima - b.notaMinima)
  const issues: CoverageIssue[] = []
  let covered = tenths(range.min) - 1
  let last: CoverageScale | null = null
  for (const scale of sorted) {
    const min = tenths(scale.notaMinima)
    const max = tenths(scale.notaMaxima)
    if (min > covered + 1) {
      issues.push({ kind: "gap", from: fromTenths(covered + 1), to: fromTenths(min - 1) })
    } else if (last && min <= covered) {
      issues.push({
        kind: "overlap",
        a: last.nombre,
        b: scale.nombre,
        from: fromTenths(min),
        to: fromTenths(Math.min(max, covered)),
      })
    }
    if (max > covered) {
      covered = max
      last = scale
    }
  }
  if (covered < tenths(range.max)) {
    issues.push({ kind: "gap", from: fromTenths(covered + 1), to: fromTenths(tenths(range.max)) })
  }
  return issues
}

const grade = new Intl.NumberFormat("es-CO", { minimumFractionDigits: 1, maximumFractionDigits: 1 })

export function formatGrade(n: number): string {
  return grade.format(n)
}

export function coverageIssueMessage(issue: CoverageIssue): string {
  const span = `${formatGrade(issue.from)} y ${formatGrade(issue.to)}`
  return issue.kind === "gap"
    ? `La escala no cubre las notas entre ${span}.`
    : `Las valoraciones ${issue.a} y ${issue.b} se cruzan entre ${span}.`
}
