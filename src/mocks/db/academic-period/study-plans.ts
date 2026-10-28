import type { StudyPlanRecord } from "@/features/establishment/academic-period/api/types/study-plan"

function seed(
  codigo: number,
  asignaturaId: number,
  asignatura: string,
  intensidadHoraria: number,
  influenciaArea: number,
  obligatoria = true,
): StudyPlanRecord {
  return {
    codigo,
    asignaturaId,
    asignatura,
    intensidadHoraria,
    influenciaArea,
    numeroCreditos: 0,
    influyeDesempeno: obligatoria,
    matriculaObligatoria: obligatoria,
    aprobacionObligatoria: obligatoria,
    personalizado: false,
    academicPeriodId: 1,
    gradeId: 1,
  }
}

// Plan de Sexto (grado 1 del período 1) con las asignaturas sembradas en
// `subjects.ts`; Biología y Química se reparten Ciencias Naturales.
export const studyPlansDb: StudyPlanRecord[] = [
  seed(1, 1, "Matemáticas", 5, 100),
  seed(2, 2, "Lengua Castellana", 5, 100),
  seed(3, 3, "Inglés", 3, 100),
  seed(4, 4, "Biología", 3, 60),
  seed(5, 5, "Química", 2, 40),
  seed(6, 6, "Ciencias Sociales", 4, 100),
]

// El backend asigna el código al crear; el front no debe generarlo.
export function nextStudyPlanId(): number {
  return studyPlansDb.reduce((max, row) => Math.max(max, row.codigo), 0) + 1
}
