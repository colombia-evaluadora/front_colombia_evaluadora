import { formatGrado } from "@/features/academic-management/asistencia/api/ui-mappings"
import type { EstadoSesion } from "@/features/academic-management/asistencia/api/types/asistencia"
import type {
  DiariaBloqueRow,
  DiariaCalendarioRow,
  DiariaPorGrupoRow,
} from "@/features/academic-management/asistencia/api/types/asistencia-diaria"
import type { TotalesEstudiante } from "@/features/academic-management/asistencia/api/query/use-asistencia-por-grupo-query"

/** Entrada "Asistencia diaria" del calendario: un día y un grupo. */
export interface EntradaDiaria {
  fecha: string
  fkGrupo: number
  grado: string
  grupo: string
  jornada: string
  /** «6°02», como el resto del módulo (código del grado + grupo). */
  etiqueta: string
  estado: EstadoSesion
}

/** Rótulo del grupo como en el resto del módulo: «6°02»; sin código, «Sexto 02». */
export function etiquetaGrupo(row: { grado: string | null; grado_valor?: string | null; grupo: string | null }): string {
  if (row.grado_valor) return `${formatGrado(row.grado_valor)}${row.grupo ?? ""}`
  return [row.grado, row.grupo].filter(Boolean).join(" ")
}

export function toEntradaDiaria(row: DiariaCalendarioRow): EntradaDiaria {
  return {
    fecha: row.fecha.slice(0, 10),
    fkGrupo: row.fk_tgrupo,
    grado: row.grado ?? "",
    grupo: row.grupo ?? "",
    jornada: row.jornada ?? "",
    etiqueta: etiquetaGrupo(row),
    estado: row.estado_sesion === "PENDIENTE" && row.vencida ? "VENCIDA" : row.estado_sesion,
  }
}

/** Opciones del Bloque de llegada: «2 · Aritmética» (el bloque se muestra 1-based, como en la planilla por clase). */
export function opcionesBloqueLlegada(bloques: DiariaBloqueRow[]): { value: number; label: string }[] {
  return [...bloques]
    .sort((a, b) => Number(a.bloque) - Number(b.bloque))
    .map((b) => ({ value: Number(b.bloque), label: `${Number(b.bloque) + 1} · ${b.asignatura}` }))
}

/** Totales del estudiante con la planilla diaria: el día cuenta una vez (Regla 115). */
export function totalesPorDia(rows: DiariaPorGrupoRow[]): Map<number, TotalesEstudiante> {
  const acc = new Map<number, { fallas: number; justificadas: number; retrasos: number; presentes: number; registrados: number }>()
  for (const r of rows) {
    const t = acc.get(r.fk_tmatricula) ?? { fallas: 0, justificadas: 0, retrasos: 0, presentes: 0, registrados: 0 }
    acc.set(r.fk_tmatricula, t)
    if (!r.en_grupo || r.tipo_valor == null) continue
    t.registrados += 1
    if (r.tipo_valor === 2) t.fallas += 1
    else t.presentes += 1
    if (r.tipo_valor === 5) t.retrasos += 1
    if (r.justificada) t.justificadas += 1
  }
  return new Map(
    [...acc].map(([fk, t]) => [
      fk,
      {
        fallas: t.fallas,
        justificadas: t.justificadas,
        retrasos: t.retrasos,
        porcentaje: t.registrados > 0 ? (t.presentes / t.registrados) * 100 : null,
      },
    ]),
  )
}
