import type {
  HistorialAcademicoMatricula,
  HistorialAcademicoNotaPeriodo,
  HistorialAcademicoObservacion,
} from "@/features/gestion-estudiantil/prevencion/api/types"

/** Valor de la casilla «Resultado final del Período Académico» (lo que espera `PERIODOS`). */
export const PERIODO_FINAL = "FINAL"

/** 3.5 → «3,5». */
export const formatNota = (n: number | null | undefined) => (n == null ? "" : String(n).replace(".", ","))

/** «2026 · Mañana · Anual · Ciclo 1 · Quinto 5°B · Promovido» (con la sede, que el prototipo no trae pero distingue matrículas). */
export function etiquetaMatricula(m: HistorialAcademicoMatricula): string {
  return [m.anio, m.sede, m.jornada, m.modalidad, m.ciclo, m.grado_grupo, m.resultado]
    .filter((x) => x != null && x !== "")
    .join(" · ")
}

/** Fila de la tabla de observaciones: el backend no da asignatura, así que se muestran como «General». */
export interface FilaObservacion {
  id: string
  asignatura: string
  periodo: string
  observacion: string
  sinRegistro: boolean
}

export function filasObservaciones(
  periodos: HistorialAcademicoObservacion[],
  final: { observacion: string | null; sin_registro: boolean } | null | undefined,
): FilaObservacion[] {
  const filas: FilaObservacion[] = periodos.map((p) => ({
    id: String(p.fk_tperiodo_evaluacion),
    asignatura: "General",
    periodo: p.periodo,
    observacion: p.observacion ?? "",
    sinRegistro: p.sin_registro,
  }))
  if (final) {
    filas.push({
      id: PERIODO_FINAL,
      asignatura: "General",
      periodo: "Resultado final del Período Académico",
      observacion: final.observacion ?? "",
      sinRegistro: final.sin_registro,
    })
  }
  return filas
}

/** La nota guardada (definitiva) o, si no, la provisional. */
export function textoNota(p: HistorialAcademicoNotaPeriodo | undefined): string {
  if (!p || p.sin_registro) return "Sin registro"
  return p.definitiva ? (p.nota_texto ?? formatNota(p.nota)) : formatNota(p.nota_provisional)
}
