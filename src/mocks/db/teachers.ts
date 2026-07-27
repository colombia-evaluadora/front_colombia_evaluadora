import type { TeacherRecord } from "@/features/establishment/api/types/academic-period/teacher"

// Cada docente se asocia a un periodo académico (academicPeriodId) para que, al
// editar, cada periodo muestre solo los suyos.
export const teachersDb: TeacherRecord[] = [
  { academicPeriodId: 1, documento: "98595826", apellido: "MUNERA GOMEZ", nombre: "CARLOS ANTONIO", estado: "ACTIVO" },
  { academicPeriodId: 1, documento: "43567890", apellido: "RIOS VARGAS", nombre: "LUZ MARINA", estado: "ACTIVO" },
  { academicPeriodId: 1, documento: "71234567", apellido: "GOMEZ PEREZ", nombre: "JUAN DAVID", estado: "INACTIVO" },
  { academicPeriodId: 2, documento: "1088123456", apellido: "CASTRO LEON", nombre: "ANA SOFIA", estado: "ACTIVO" },
  { academicPeriodId: 2, documento: "43112233", apellido: "OSORIO MEJIA", nombre: "MARIA FERNANDA", estado: "ACTIVO" },
  { academicPeriodId: 2, documento: "70998877", apellido: "ZAPATA RUIZ", nombre: "ANDRES FELIPE", estado: "INACTIVO" },
  { academicPeriodId: 3, documento: "1017554433", apellido: "VELEZ HENAO", nombre: "LAURA CAMILA", estado: "ACTIVO" },
]
