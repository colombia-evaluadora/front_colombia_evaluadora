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
]
