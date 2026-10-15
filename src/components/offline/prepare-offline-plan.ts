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
