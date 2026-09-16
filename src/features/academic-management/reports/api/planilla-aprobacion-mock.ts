export interface DocenteAprobacionInfo {
  id: number
  nombreDocente: string
  asignatura: string
  gradoGrupo: string
}

export interface ActividadPlanilla {
  key: string
  titulo: string
  descripcion: string
}

export interface EstudiantePlanilla {
  id: number
  nombreCompleto: string
  /** Nota proyectada ya recalculada con el cambio tardío del docente. */
  definitivaProyectada: number
  /**
   * Valor que tenía ANTES del cambio tardío — solo se conoce cuando el
   * cambio movió la nota (si es `undefined`, la fila no cambió y no lleva
   * flecha). Compararlo contra `definitivaProyectada` es lo que decide si la
   * flecha sale verde (subió) o roja (bajó).
   */
  definitivaAnterior?: number
  /** Por qué el docente hizo el cambio tardío — solo aplica junto con
   *  `definitivaAnterior`, se muestra en el popover de la nota. */
  motivoCambio?: string
  notasPorActividad: Record<string, number | undefined>
}

export const ACTIVIDADES_PLANILLA: ActividadPlanilla[] = [
  { key: "taller-fracciones", titulo: "Taller de fracciones", descripcion: "Actividad calificable" },
  { key: "quiz-conceptos", titulo: "Quiz de conceptos", descripcion: "Actividad calificable" },
  { key: "participacion-clase", titulo: "Participación en clase", descripcion: "Actividad calificable" },
  { key: "evaluacion-unidad-1", titulo: "Evaluación unidad 1", descripcion: "Actividad calificable" },
]

export const DOCENTES_APROBACION: DocenteAprobacionInfo[] = [
  { id: 1, nombreDocente: "José Pérez", asignatura: "Educación Física", gradoGrupo: "601 M" },
  { id: 2, nombreDocente: "José Pérez", asignatura: "Educación Física", gradoGrupo: "601 M" },
  { id: 3, nombreDocente: "José Pérez", asignatura: "Educación Física", gradoGrupo: "601 M" },
]

export const ESTUDIANTES_PLANILLA_APROBACION: EstudiantePlanilla[] = [
  {
    id: 1,
    nombreCompleto: "Sebastián David Jaramillo Gómez",
    definitivaProyectada: 2.5,
    notasPorActividad: { "taller-fracciones": 3.0, "quiz-conceptos": 3.0, "participacion-clase": 3.0, "evaluacion-unidad-1": 3.0 },
  },
  {
    id: 2,
    nombreCompleto: "Valentina Sofía Torres Martínez",
    definitivaProyectada: 3.0,
    notasPorActividad: { "taller-fracciones": 3.0, "quiz-conceptos": 3.0, "participacion-clase": 3.0, "evaluacion-unidad-1": 3.0 },
  },
  {
    id: 3,
    nombreCompleto: "Juan Esteban Pérez Morales",
    definitivaProyectada: 3.0,
    notasPorActividad: { "taller-fracciones": 3.0, "quiz-conceptos": 3.0, "participacion-clase": 3.0, "evaluacion-unidad-1": 3.0 },
  },
  {
    id: 4,
    nombreCompleto: "Mariana Alejandra Castillo Ríos",
    definitivaProyectada: 2.5,
    definitivaAnterior: 3.0,
    motivoCambio: "No entregó el taller de fracciones en la fecha establecida.",
    notasPorActividad: { "taller-fracciones": 2.5, "quiz-conceptos": 2.5, "participacion-clase": 2.5, "evaluacion-unidad-1": 2.5 },
  },
  {
    id: 5,
    nombreCompleto: "Samuel Nicolás Patiño Gómez",
    definitivaProyectada: 2.5,
    notasPorActividad: { "taller-fracciones": 3.0, "quiz-conceptos": 3.0, "participacion-clase": 3.0, "evaluacion-unidad-1": undefined },
  },
  {
    id: 6,
    nombreCompleto: "Isabella Camila Herrera Díaz",
    definitivaProyectada: 3.0,
    definitivaAnterior: 2.5,
    motivoCambio: "Presentó una actividad de recuperación de la evaluación unidad 1.",
    notasPorActividad: { "taller-fracciones": 3.0, "quiz-conceptos": 3.0, "participacion-clase": 3.0, "evaluacion-unidad-1": 2.5 },
  },
  {
    id: 7,
    nombreCompleto: "Santiago José Gómez López",
    definitivaProyectada: 3.0,
    notasPorActividad: { "taller-fracciones": 3.0, "quiz-conceptos": 2.5, "participacion-clase": 2.5, "evaluacion-unidad-1": 2.5 },
  },
  {
    id: 8,
    nombreCompleto: "Natalia Andrea Ramírez Salgado",
    definitivaProyectada: 3.0,
    notasPorActividad: { "taller-fracciones": 3.0, "quiz-conceptos": 3.0, "participacion-clase": 3.0, "evaluacion-unidad-1": 3.0 },
  },
]
