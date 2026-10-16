/**
 * Lógica pura de la selección de "Preparar para usar sin conexión": qué
 * planillas (grupo × asignatura × periodo) descargar a partir de lo que el
 * docente eligió. Separada del diálogo para testearla sin DOM.
 */

export interface PrepareGrupo {
  grupoId: number
  gradoId: number
  nombre: string
}

export interface PrepareAsignatura {
  gradoId: number
  asignaturaId: number
  nombre: string
}

export interface PreparePeriodo {
  id: number
  nombre: string
  startDate: string
  endDate: string
}

export interface PrepareSelection {
  grupos: Set<number>
  /** Por `asignaturaId`: una asignatura elegida aplica a todos los grados que la tengan. */
  asignaturas: Set<number>
  periodos: Set<number>
}

/** Mismos params (y mismo orden de campos) que arma `PlaneadorPlanillaPage`. */
export interface PlanillaTarget {
  grupoId: number
  asignaturaId: number
  gradoId: number
  periodoId: number
}

export function buildPlanillaTargets(
  grupos: PrepareGrupo[],
  asignaturas: PrepareAsignatura[],
  selection: PrepareSelection,
): PlanillaTarget[] {
  const targets: PlanillaTarget[] = []
  for (const grupo of grupos) {
    if (!selection.grupos.has(grupo.grupoId)) continue
    for (const par of asignaturas) {
      if (par.gradoId !== grupo.gradoId || !selection.asignaturas.has(par.asignaturaId)) continue
      for (const periodoId of selection.periodos) {
        targets.push({ grupoId: grupo.grupoId, asignaturaId: par.asignaturaId, gradoId: grupo.gradoId, periodoId })
      }
    }
  }
  return targets
}

/** Asignaturas distintas (por id) para la lista de checkboxes. */
export function uniqueAsignaturas(pares: PrepareAsignatura[]): PrepareAsignatura[] {
  const seen = new Map<number, PrepareAsignatura>()
  for (const par of pares) if (!seen.has(par.asignaturaId)) seen.set(par.asignaturaId, par)
  return [...seen.values()].sort((a, b) => a.nombre.localeCompare(b.nombre))
}

/**
 * Periodos preseleccionados: el vigente hoy (por fechas `yyyy-MM-dd`); si
 * ninguno lo está (vacaciones), el último que ya empezó; si tampoco, el primero.
 */
export function defaultPeriodos(periodos: PreparePeriodo[], today: string): number[] {
  if (periodos.length === 0) return []
  const vigente = periodos.find((p) => p.startDate <= today && today <= p.endDate)
  if (vigente) return [vigente.id]
  const empezados = periodos.filter((p) => p.startDate <= today)
  return [(empezados.at(-1) ?? periodos[0]).id]
}

// ---- Offline de meses (`add-offline-meses-pwa` D-6) -------------------------

const DAY_MS = 864e5

/** Antigüedad de la última preparación: verde < 7 días, amarillo < 30, rojo después. */
export type PrepareFreshness = "fresca" | "envejeciendo" | "vieja"

export function prepareFreshness(lastPrepare: number, now = Date.now()): PrepareFreshness {
  const age = now - lastPrepare
  if (age < 7 * DAY_MS) return "fresca"
  if (age < 30 * DAY_MS) return "envejeciendo"
  return "vieja"
}

/**
 * Punto de control de una preparación en curso: qué tareas (por `hashKey` de
 * su queryKey) ya terminaron. Si la red se cae a mitad, "Continuar" salta lo
 * hecho. Vence a las 24 h: después conviene volver a bajar todo.
 */
export interface PrepareCheckpoint {
  startedAt: number
  done: string[]
}

export const CHECKPOINT_MAX_AGE_MS = DAY_MS

export function isCheckpointUsable(cp: PrepareCheckpoint | null, now = Date.now()): cp is PrepareCheckpoint {
  return cp != null && Array.isArray(cp.done) && now - cp.startedAt < CHECKPOINT_MAX_AGE_MS
}

/** Selección "todo el año": todos los grupos, asignaturas y periodos. */
export function fullYearSelection(
  grupos: PrepareGrupo[],
  asignaturas: PrepareAsignatura[],
  periodos: PreparePeriodo[],
): PrepareSelection {
  return {
    grupos: new Set(grupos.map((g) => g.grupoId)),
    asignaturas: new Set(asignaturas.map((a) => a.asignaturaId)),
    periodos: new Set(periodos.map((p) => p.id)),
  }
}
