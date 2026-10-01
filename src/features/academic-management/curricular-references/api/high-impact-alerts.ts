import type { CurricularReferenceImpact } from "@/features/academic-management/curricular-references/api/query/fetch-impact"
import type { CurricularReferenceDraft } from "@/features/academic-management/curricular-references/api/types/curricular-reference"

// Id del enfoque "Formativo" en el catálogo (ver catalogs.ts).
const FORMATIVO_APPROACH_ID = 122

export type HighImpactField =
  | "pedagogicalApproach"
  | "evaluationType"
  | "contentLabels"
  | "instrument"
  | "executionLabel"
  | "subjectLabel"
  | "educationLevels"
  | "areas"
  | "status"

export interface HighImpactAlert {
  field: HighImpactField
  /** "block" impide guardar; "confirm" exige la casilla. */
  kind: "confirm" | "block"
  title: string
  message: string
}

function plural(count: number, singular: string, pluralText: string) {
  return `${count} ${count === 1 ? singular : pluralText}`
}

/** Ítems que estaban al inicio y ya no están. */
export function getRemovedItems<T extends { id: number }>(initial: T[], next: T[]): T[] {
  const nextIds = new Set(next.map((item) => item.id))
  return initial.filter((item) => !nextIds.has(item.id))
}

/** Campos de alto impacto que cambiaron respecto a lo guardado. */
export function getChangedHighImpactFields(
  initial: CurricularReferenceDraft,
  next: CurricularReferenceDraft,
): HighImpactField[] {
  const fields: HighImpactField[] = []
  const approachChanged = initial.pedagogicalApproach?.id !== next.pedagogicalApproach?.id
  if (approachChanged) fields.push("pedagogicalApproach")
  // Si cambió el enfoque, el tipo va dentro de ese modal (Regla 2).
  if (!approachChanged && initial.evaluationType?.id !== next.evaluationType?.id) fields.push("evaluationType")
  if (initial.level1.trim() !== next.level1.trim() || initial.level2.trim() !== next.level2.trim()) {
    fields.push("contentLabels")
  }
  if (initial.instrument.trim() !== next.instrument.trim()) fields.push("instrument")
  if (initial.executionLabel.trim() !== next.executionLabel.trim()) fields.push("executionLabel")
  if (next.subjectLabel != null && next.subjectLabel.id !== initial.subjectLabel?.id) fields.push("subjectLabel")
  // Agregar niveles o áreas no tiene impacto; solo retirarlos.
  if (getRemovedItems(initial.educationLevels, next.educationLevels).length > 0) fields.push("educationLevels")
  if (getRemovedItems(initial.areas, next.areas).length > 0) fields.push("areas")
  if (initial.active && !next.active) fields.push("status")
  return fields
}

function evaluationTypeMessage(next: CurricularReferenceDraft, impact: CurricularReferenceImpact) {
  const graded = impact.gradedActivities > 0 ? ` (${impact.gradedActivities} con calificaciones registradas)` : ""
  return (
    `El tipo de evaluación pasa a "${next.evaluationType?.name ?? ""}" y afecta ` +
    `${plural(impact.activities, "actividad", "actividades")}${graded}. ` +
    "Las calificaciones existentes no se convierten a la nueva escala: se conservan como histórico."
  )
}

function names(items: { name: string }[]) {
  return items.map((item) => item.name).join(", ")
}

function buildAlert(
  field: HighImpactField,
  initial: CurricularReferenceDraft,
  next: CurricularReferenceDraft,
  impact: CurricularReferenceImpact,
): HighImpactAlert | null {
  const units = plural(impact.units, "unidad/proyecto", "unidades/proyectos")
  const activities = plural(impact.activities, "actividad", "actividades")
  const hasUse = impact.units + impact.activities > 0

  switch (field) {
    case "pedagogicalApproach": {
      if (!hasUse) return null
      const typeChanged = initial.evaluationType?.id !== next.evaluationType?.id
      return {
        field,
        kind: "confirm",
        title: "Cambio de Enfoque Pedagógico",
        message:
          `Este cambio afecta ${units} y ${activities}. ` +
          (next.pedagogicalApproach?.id === FORMATIVO_APPROACH_ID
            ? "Las actividades evaluativas existentes perderán acceso a sus instrumentos."
            : "Los registros narrativos existentes no se convierten automáticamente en instrumentos.") +
          (typeChanged && impact.activities > 0 ? ` ${evaluationTypeMessage(next, impact)}` : ""),
      }
    }
    case "evaluationType":
      if (impact.activities === 0) return null
      return {
        field,
        kind: "confirm",
        title: "Cambio de Tipo de Evaluación",
        message: evaluationTypeMessage(next, impact),
      }
    case "contentLabels":
      if (impact.contentUnits + impact.contentActivities === 0) return null
      return {
        field,
        kind: "confirm",
        title: "Cambio de nombre del contenido curricular",
        message:
          `${plural(impact.contentUnits, "unidad/proyecto", "unidades/proyectos")} y ` +
          `${plural(impact.contentActivities, "actividad", "actividades")} cambiarán de rótulo en Unidad, ` +
          "Planeador, listados y reportes.",
      }
    case "instrument":
      if (impact.units === 0) return null
      return {
        field,
        kind: "confirm",
        title: "Cambio de nombre del documento agrupador",
        message: `${units} existentes cambiarán de rótulo.`,
      }
    case "executionLabel":
      if (impact.activities === 0) return null
      return {
        field,
        kind: "confirm",
        title: "Cambio de nombre de la unidad de planeación",
        message: `${activities} existentes cambiarán de rótulo en toda vista donde aparecen listadas o reportadas.`,
      }
    case "subjectLabel":
      if (!hasUse) return null
      return {
        field,
        kind: "confirm",
        title: "Cambio de nombre del campo de área",
        message: `${units} y ${activities} existentes cambiarán el rótulo de su campo de área.`,
      }
    case "educationLevels": {
      const removed = names(getRemovedItems(initial.educationLevels, next.educationLevels))
      if (impact.levelUnits + impact.levelActivities > 0) {
        return {
          field,
          kind: "block",
          title: "Retiro de Nivel educativo",
          message:
            `No es posible retirar ${removed}: hay ` +
            `${plural(impact.levelUnits, "unidad/proyecto", "unidades/proyectos")} y ` +
            `${plural(impact.levelActivities, "actividad", "actividades")} en sus grados.`,
        }
      }
      if (impact.levelComponents === 0) return null
      return {
        field,
        kind: "confirm",
        title: "Retiro de Nivel educativo",
        message:
          `${plural(impact.levelComponents, "componente", "componentes")} de ${next.level1 || "nivel 1"} ` +
          `en grados de ${removed} pasarán a Inactivo y saldrán de los grados vinculados.`,
      }
    }
    case "areas": {
      const removed = names(getRemovedItems(initial.areas, next.areas))
      if (impact.areaUnits + impact.areaActivities > 0) {
        return {
          field,
          kind: "block",
          title: "Retiro de Área o dimensión",
          message:
            `No es posible retirar ${removed}: la usan ` +
            `${plural(impact.areaUnits, "unidad/proyecto", "unidades/proyectos")} y ` +
            `${plural(impact.areaActivities, "actividad", "actividades")}.`,
        }
      }
      if (impact.areaComponents === 0) return null
      return {
        field,
        kind: "confirm",
        title: "Retiro de Área o dimensión",
        message:
          `${plural(impact.areaComponents, "componente", "componentes")} de ${next.level1 || "nivel 1"} ` +
          `en ${removed} pasarán a Inactivo y el área dejará de estar disponible en Unidad y Planeador.`,
      }
    }
    case "status":
      if (!hasUse) return null
      return {
        field,
        kind: "confirm",
        title: "Inactivación del Referente",
        message:
          `Bajo este referente hay ${units} y ${activities}. No se podrán crear nuevas; ` +
          "las existentes se conservan en solo lectura con sus datos históricos.",
      }
  }
}

/** Contenido de los modales; omite los campos sin registros afectados. */
export function buildHighImpactAlerts(
  fields: HighImpactField[],
  initial: CurricularReferenceDraft,
  next: CurricularReferenceDraft,
  impact: CurricularReferenceImpact,
): HighImpactAlert[] {
  return fields
    .map((field) => buildAlert(field, initial, next, impact))
    .filter((alert): alert is HighImpactAlert => alert != null)
}

/** Si hay bloqueos, solo se muestran esos. */
export function getVisibleAlerts(alerts: HighImpactAlert[]): HighImpactAlert[] {
  const blocks = alerts.filter((alert) => alert.kind === "block")
  return blocks.length > 0 ? blocks : alerts
}

/** Cancelar el modal revierte los campos a su valor anterior. */
export function revertHighImpactFields(
  values: CurricularReferenceDraft,
  initial: CurricularReferenceDraft,
  fields: HighImpactField[],
): CurricularReferenceDraft {
  const reverted = { ...values }
  for (const field of fields) {
    switch (field) {
      case "pedagogicalApproach":
        reverted.pedagogicalApproach = initial.pedagogicalApproach
        // Regla 2 pudo fijar el tipo al cambiar el enfoque: se revierte junto.
        reverted.evaluationType = initial.evaluationType
        break
      case "evaluationType":
        reverted.evaluationType = initial.evaluationType
        break
      case "contentLabels":
        reverted.level1 = initial.level1
        reverted.level2 = initial.level2
        break
      case "instrument":
        reverted.instrument = initial.instrument
        break
      case "executionLabel":
        reverted.executionLabel = initial.executionLabel
        break
      case "subjectLabel":
        reverted.subjectLabel = initial.subjectLabel
        break
      case "educationLevels":
        reverted.educationLevels = initial.educationLevels
        break
      case "areas":
        reverted.areas = initial.areas
        break
      case "status":
        reverted.active = initial.active
        break
    }
  }
  return reverted
}
