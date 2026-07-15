import type { AuditTable } from "@/features/audits/api/types/audit-table"

// `operationsToday` se completa en el handler a partir de tableOperationsDb.
// `icon` viaja como texto (mismo formato que el menú) y se resuelve a un
// componente en el cliente — no se puede mandar un componente React por red.
export const auditTablesDb: Omit<AuditTable, "operationsToday">[] = [
  { slug: "tnivel_ensenanza", name: "tnivel_ensenanza", icon: "Chart-Line-Up-Icon" },
  { slug: "tdepartamento", name: "tdepartamento", icon: "Map-Trifold-Icon" },
  { slug: "tmunicipio", name: "tmunicipio", icon: "Bank-Icon" },
  { slug: "tente", name: "tente", icon: "Graduation-Cap-Icon" },
  { slug: "tpais", name: "tpais", icon: "Globe-Icon" },
  { slug: "tmodelo_pedagogico", name: "tmodelo_pedagógico", icon: "Brain-Icon" },
  { slug: "tjornada", name: "tjornada", icon: "Clock-Icon" },
  { slug: "tcapacidad", name: "tcapacidad", icon: "Circles-Three-Icon" },
  { slug: "tpropiedad_juridica", name: "tpropiedad_juridica", icon: "Gavel-Icon" },
  { slug: "tespecialidad", name: "tespecialidad", icon: "Medal-Icon" },
  { slug: "tetnia", name: "tetnia", icon: "Users-Three-Icon" },
  { slug: "tresguardo", name: "tresguardo", icon: "Tree-Icon" },
  { slug: "tsector", name: "tsector", icon: "Buildings-Icon" },
  { slug: "tzona", name: "tzona", icon: "Compass-Icon" },
  { slug: "tcomuna", name: "tcomuna", icon: "Map-Pin-Icon" },
  { slug: "tbarrio", name: "tbarrio", icon: "House-Line-Icon" },
  { slug: "tgrado", name: "tgrado", icon: "List-Numbers-Icon" },
  { slug: "tgrupo", name: "tgrupo", icon: "Users-Four-Icon" },
  { slug: "tsede", name: "tsede", icon: "Address-Book-Icon" },
  { slug: "testado", name: "testado", icon: "Check-Circle-Icon" },
  { slug: "ttipo_documento", name: "ttipo_documento", icon: "IdentificationCard-Icon" },
  { slug: "tsexo", name: "tsexo", icon: "Gender-Intersex-Icon" },
  { slug: "trango_edad", name: "trango_edad", icon: "Calendar-Blank-Icon" },
  { slug: "tarea_conocimiento", name: "tarea_conocimiento", icon: "Book-Open-Icon" },
  { slug: "tasignatura", name: "tasignatura", icon: "Notebook-Icon" },
  { slug: "tdocente", name: "tdocente", icon: "Chalkboard-Teacher-Icon" },
  { slug: "tevaluador", name: "tevaluador", icon: "Clipboard-Text-Icon" },
  { slug: "tevaluacion", name: "tevaluacion", icon: "Clipboard-Check-Icon" },
  { slug: "tperiodo", name: "tperiodo", icon: "Calendar-Dots-Icon" },
  { slug: "tresultado", name: "tresultado", icon: "Trophy-Icon" },
]