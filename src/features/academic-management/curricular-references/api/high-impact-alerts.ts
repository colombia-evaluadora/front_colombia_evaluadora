import type { CurricularReferenceImpact } from "@/features/academic-management/curricular-references/api/query/fetch-impact"
import type { CurricularReferenceDraft } from "@/features/academic-management/curricular-references/api/types/curricular-reference"

// Id del enfoque "Formativo" en el catálogo (ver catalogs.ts).
const FORMATIVO_APPROACH_ID = 122

export type HighImpactField = "pedagogicalApproach" | "instrument" | "executionLabel" | "subjectLabel"

export interface HighImpactAlert {
  field: HighImpactField
  title: string
  message: string
}

function plural(count: number, singular: string, pluralText: string) {
  return `${count} ${count === 1 ? singular : pluralText}`
}

/** Campos de alto impacto que cambiaron respecto a lo guardado. */
export function getChangedHighImpactFields(
  initial: CurricularReferenceDraft,
  next: CurricularReferenceDraft,
): HighImpactField[] {
  const fields: HighImpactField[] = []
  if (initial.pedagogicalApproach?.id !== next.pedagogicalApproach?.id) fields.push("pedagogicalApproach")
  if (initial.instrument.trim() !== next.instrument.trim()) fields.push("instrument")
  // Vacío = el backend conserva el rótulo actual: no es un cambio.
  const nextExecution = next.executionLabel.trim()
  if (nextExecution && nextExecution !== initial.executionLabel.trim()) fields.push("executionLabel")
  if (next.subjectLabel != null && next.subjectLabel.id !== initial.subjectLabel?.id) fields.push("subjectLabel")
  return fields
}

/** Contenido de los cuatro modales (Reglas 4, 13, 14 y 15). */
export function buildHighImpactAlerts(
  fields: HighImpactField[],
  next: CurricularReferenceDraft,
  impact: CurricularReferenceImpact,
): HighImpactAlert[] {
  const units = plural(impact.units, "unidad/proyecto", "unidades/proyectos")
  const activities = plural(impact.activities, "actividad", "actividades")

  return fields.map((field) => {
    switch (field) {
      case "pedagogicalApproach":
        return {
          field,
          title: "Cambio de Enfoque Pedagógico",
          message:
            `Este cambio afecta ${units} y ${activities}. ` +
            (next.pedagogicalApproach?.id === FORMATIVO_APPROACH_ID
              ? "Las actividades evaluativas existentes perderán acceso a sus instrumentos."
              : "Los registros narrativos existentes no se convierten automáticamente en instrumentos."),
        }
      case "instrument":
        return {
          field,
          title: "Cambio de nombre del documento agrupador",
          message: `${units} existentes cambiarán de rótulo.`,
        }
      case "executionLabel":
        return {
          field,
          title: "Cambio de nombre de la unidad de planeación",
          message: `${activities} existentes cambiarán de rótulo en toda vista donde aparecen listadas o reportadas.`,
        }
      case "subjectLabel":
        return {
          field,
          title: "Cambio de nombre del campo de área",
          message: `${units} y ${activities} existentes cambiarán el rótulo de su campo de área.`,
        }
    }
  })
}

/** Cancelar el modal revierte los campos a su valor anterior. */
export function revertHighImpactFields(
  values: CurricularReferenceDraft,
  initial: CurricularReferenceDraft,
  fields: HighImpactField[],
): CurricularReferenceDraft {
  const reverted = { ...values }
  for (const field of fields) {
    if (field === "pedagogicalApproach") {
      reverted.pedagogicalApproach = initial.pedagogicalApproach
      // Regla 2 pudo fijar el tipo al cambiar el enfoque: se revierte junto.
      reverted.evaluationType = initial.evaluationType
    } else if (field === "instrument") {
      reverted.instrument = initial.instrument
    } else if (field === "executionLabel") {
      reverted.executionLabel = initial.executionLabel
    } else {
      reverted.subjectLabel = initial.subjectLabel
    }
  }
  return reverted
}
