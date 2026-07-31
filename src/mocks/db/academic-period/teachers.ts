import type { TeacherRecord } from "@/features/establishment/academic-period/api/types/teacher"

// Cada docente se asocia a una sede (sedeId). Así, cualquier periodo de esa
// sede —incluido uno recién creado— muestra a sus docentes en asignaciones
// académicas.
export const teachersDb: TeacherRecord[] = [
  { sedeId: 1, documento: "98595826", apellido: "MUNERA GOMEZ", nombre: "CARLOS ANTONIO", estado: "ACTIVO" },
  { sedeId: 1, documento: "43567890", apellido: "RIOS VARGAS", nombre: "LUZ MARINA", estado: "ACTIVO" },
  { sedeId: 1, documento: "71234567", apellido: "GOMEZ PEREZ", nombre: "JUAN DAVID", estado: "INACTIVO" },
  { sedeId: 2, documento: "1088123456", apellido: "CASTRO LEON", nombre: "ANA SOFIA", estado: "ACTIVO" },
  { sedeId: 2, documento: "43112233", apellido: "OSORIO MEJIA", nombre: "MARIA FERNANDA", estado: "ACTIVO" },
  { sedeId: 2, documento: "70998877", apellido: "ZAPATA RUIZ", nombre: "ANDRES FELIPE", estado: "INACTIVO" },
  { sedeId: 3, documento: "1017554433", apellido: "VELEZ HENAO", nombre: "LAURA CAMILA", estado: "ACTIVO" },
]
