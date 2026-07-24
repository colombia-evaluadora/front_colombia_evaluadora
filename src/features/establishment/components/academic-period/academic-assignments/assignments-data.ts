// Pool de asignaturas y estado inicial de asignación por docente. La asignación
// es una interacción de cliente (mover asignaturas entre "disponibles" y
// "actuales"), así que el estado vive en el componente; acá solo los datos.

export interface AssignmentSubject {
  id: string
  nombre: string
  // Grado o grupo (p. ej. "901").
  gradoGrupo: string
  // Jornada abreviada: M (Mañana) · T (Tarde) · N (Noche).
  jornada: string
}

const SUBJECT_POOL: AssignmentSubject[] = [
  { id: "s1", nombre: "CIENCIAS SOCIALES", gradoGrupo: "901", jornada: "T" },
  { id: "s2", nombre: "CIENCIAS NATURALES", gradoGrupo: "601", jornada: "M" },
  { id: "s3", nombre: "CIENCIAS NATURALES", gradoGrupo: "602", jornada: "M" },
  { id: "s4", nombre: "DIMENSIÓN ÉTICA Y ESPIRITUAL", gradoGrupo: "701", jornada: "M" },
  { id: "s5", nombre: "DIMENSIÓN ÉTICA Y ESPIRITUAL", gradoGrupo: "901", jornada: "M" },
  { id: "s6", nombre: "DIMENSIÓN ÉTICA Y ESPIRITUAL", gradoGrupo: "702", jornada: "M" },
  { id: "s7", nombre: "DIMENSIÓN ÉTICA Y ESPIRITUAL", gradoGrupo: "902", jornada: "T" },
  { id: "s8", nombre: "DIMENSIÓN ÉTICA Y ESPIRITUAL", gradoGrupo: "801", jornada: "M" },
  { id: "s9", nombre: "DIMENSIÓN ÉTICA Y ESPIRITUAL", gradoGrupo: "903", jornada: "T" },
  { id: "s10", nombre: "MATEMÁTICAS", gradoGrupo: "701", jornada: "M" },
  { id: "s11", nombre: "MATEMÁTICAS", gradoGrupo: "801", jornada: "T" },
  { id: "s12", nombre: "INGLÉS", gradoGrupo: "601", jornada: "M" },
]

export interface TeacherAssignments {
  available: AssignmentSubject[]
  assigned: AssignmentSubject[]
}

// Estado inicial de un docente: una asignatura asignada, el resto disponibles.
export function defaultAssignments(): TeacherAssignments {
  return {
    assigned: SUBJECT_POOL.filter((s) => s.id === "s10").map((s) => ({ ...s })),
    available: SUBJECT_POOL.filter((s) => s.id !== "s10").map((s) => ({ ...s })),
  }
}
