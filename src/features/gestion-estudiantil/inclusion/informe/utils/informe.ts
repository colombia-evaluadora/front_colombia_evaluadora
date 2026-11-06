import type { InformeInclusion } from "@/features/gestion-estudiantil/inclusion/informe/api/use-informe-query"

type Fila = InformeInclusion["cobertura"][number]

/** El backend desglosa por grado y asignatura; la pantalla (INF.1) suma por asignatura. */
export function porAsignatura(filas: Fila[]): Fila[] {
  const m = new Map<number, Fila>()
  for (const f of filas) {
    const a = m.get(f.fk_tasignatura)
    if (a) {
      a.con_ajustes += f.con_ajustes
      a.sin_ajustes += f.sin_ajustes
      a.pendiente_revision += f.pendiente_revision
    } else m.set(f.fk_tasignatura, { ...f })
  }
  return [...m.values()]
}
