import type { GradeGroupRecord } from "@/features/establishment/academic-period/api/types/grade-group"

function seed(
  id: number,
  gradeId: number,
  codigo: string,
  directorId: number | null,
  metodologia: string,
  cupo: number,
): GradeGroupRecord {
  // El período 1 es de la jornada Mañana.
  return {
    id,
    gradeId,
    codigo,
    jornada: "Mañana",
    jornadaName: "Mañana",
    directorId,
    metodologia,
    metodologiaName: metodologia,
    cupo,
    dictaTodas: false,
  }
}

// Grupos de los grados sembrados del período 1 (ver `grades.ts`).
export const gradeGroupsDb: GradeGroupRecord[] = [
  seed(1, 1, "6°A", 4, "Tradicional", 35),
  seed(2, 1, "6°B", null, "Tradicional", 30),
  seed(3, 1, "6°C", 5, "Escuela Nueva", 32),
  seed(4, 2, "7°A", null, "Tradicional", 35),
  seed(5, 2, "7°B", null, "Tradicional", 35),
  seed(6, 3, "8°A", null, "Tradicional", 35),
  seed(7, 3, "8°B", null, "Tradicional", 35),
  seed(8, 4, "11°A", null, "Tradicional", 35),
]
