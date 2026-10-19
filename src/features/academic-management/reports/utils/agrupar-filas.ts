import type { FilaInforme } from "@/features/academic-management/reports/api/types"

export interface ColumnaAsignatura {
  id: number
  abreviacion: string
  nombre: string
  orden: number
}

export interface EstudianteFilas {
  matriculaId: number
  nombreCompleto: string
  documento: string
  filas: FilaInforme[]
}

/** La columna "Pe". El backend manda la abreviación ("P1"); recortar el
 *  nombre no sirve de respaldo porque "Primer periodo" no trae dígitos. */
export function etiquetaPeriodo(fila: FilaInforme): string {
  return fila.periodoAbreviacion || fila.periodoNombre || "—"
}

/** Las columnas salen de los datos, no de un catálogo fijo: cada grupo tiene
 *  su propio plan de estudio. */
export function columnasDeFilas(filas: FilaInforme[]): ColumnaAsignatura[] {
  const porId = new Map<number, ColumnaAsignatura>()
  for (const fila of filas) {
    for (const asignatura of fila.asignaturas) {
      if (porId.has(asignatura.asignaturaId)) continue
      porId.set(asignatura.asignaturaId, {
        id: asignatura.asignaturaId,
        abreviacion: asignatura.abreviacion,
        nombre: asignatura.nombre,
        orden: asignatura.orden,
      })
    }
  }
  return Array.from(porId.values()).sort((a, b) => a.orden - b.orden)
}

/** El endpoint devuelve una fila por (estudiante, período); la tabla muestra
 *  una fila por estudiante con una sub-fila por período. */
export function agruparPorEstudiante(filas: FilaInforme[]): EstudianteFilas[] {
  const porMatricula = new Map<number, EstudianteFilas>()
  for (const fila of filas) {
    const actual = porMatricula.get(fila.matriculaId)
    if (actual) {
      actual.filas.push(fila)
      continue
    }
    porMatricula.set(fila.matriculaId, {
      matriculaId: fila.matriculaId,
      nombreCompleto: fila.nombreCompleto,
      documento: fila.documento,
      filas: [fila],
    })
  }
  return Array.from(porMatricula.values())
}
