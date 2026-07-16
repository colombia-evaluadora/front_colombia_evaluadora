import type { AuditTable } from "@/features/audits/api/types/audit-table"

// Fields por tabla: las opciones que ve el usuario en el dropdown "Campo"
// del filtro por campo del sheet. Compartido con `table-operations.ts`
// (que usa la misma lista para generar `entityFields` por operación).
export const TABLE_FIELDS: Record<string, string[]> = {
  tnivel_ensenanza: ["Código", "Nombre", "Descripción", "Orden"],
  tdepartamento: ["Código", "Nombre", "Región", "ISO 3166-2"],
  tmunicipio: ["Código", "Nombre", "Departamento", "Categoría"],
  tente: ["Código", "Nombre", "Departamento", "Municipio"],
  tpais: ["Código", "Nombre", "ISO 3166-1"],
  tmodelo_pedagogico: ["Código", "Nombre", "Descripción"],
  tjornada: ["Código", "Nombre", "Horario"],
  tcapacidad: ["Código", "Nombre", "Tipo", "Capacidad"],
  tpropiedad_juridica: ["Código", "Nombre", "Naturaleza"],
  tespecialidad: ["Código", "Nombre", "Área"],
  tetnia: ["Código", "Nombre", "Pueblo"],
  tresguardo: ["Código", "Nombre", "Etnia", "Departamento"],
}

const GENERIC_FIELDS = ["Código", "Nombre", "Estado", "Descripción"]

export function getTableFields(slug: string): string[] {
  return TABLE_FIELDS[slug] ?? GENERIC_FIELDS
}

// `operationsToday` se completa en el handler a partir de tableOperationsDb.
// `icon` viaja como texto (mismo formato que el menú) y se resuelve a un
// componente React en el cliente — no se puede mandar un componente por red.
export const auditTablesDb: Omit<AuditTable, "operationsToday">[] = [
  { slug: "tnivel_ensenanza", name: "tnivel_ensenanza", icon: "Chart-Line-Up-Icon", fields: getTableFields("tnivel_ensenanza") },
  { slug: "tdepartamento", name: "tdepartamento", icon: "Map-Trifold-Icon", fields: getTableFields("tdepartamento") },
  { slug: "tmunicipio", name: "tmunicipio", icon: "Bank-Icon", fields: getTableFields("tmunicipio") },
  { slug: "tente", name: "tente", icon: "Graduation-Cap-Icon", fields: getTableFields("tente") },
  { slug: "tpais", name: "tpais", icon: "Globe-Icon", fields: getTableFields("tpais") },
  { slug: "tmodelo_pedagogico", name: "tmodelo_pedagógico", icon: "Brain-Icon", fields: getTableFields("tmodelo_pedagogico") },
  { slug: "tjornada", name: "tjornada", icon: "Clock-Icon", fields: getTableFields("tjornada") },
  { slug: "tcapacidad", name: "tcapacidad", icon: "Circles-Three-Icon", fields: getTableFields("tcapacidad") },
  { slug: "tpropiedad_juridica", name: "tpropiedad_juridica", icon: "Gavel-Icon", fields: getTableFields("tpropiedad_juridica") },
  { slug: "tespecialidad", name: "tespecialidad", icon: "Medal-Icon", fields: getTableFields("tespecialidad") },
  { slug: "tetnia", name: "tetnia", icon: "Users-Three-Icon", fields: getTableFields("tetnia") },
  { slug: "tresguardo", name: "tresguardo", icon: "Tree-Icon", fields: getTableFields("tresguardo") },
  { slug: "tsector", name: "tsector", icon: "Buildings-Icon", fields: getTableFields("tsector") },
  { slug: "tzona", name: "tzona", icon: "Compass-Icon", fields: getTableFields("tzona") },
  { slug: "tcomuna", name: "tcomuna", icon: "Map-Pin-Icon", fields: getTableFields("tcomuna") },
  { slug: "tbarrio", name: "tbarrio", icon: "House-Line-Icon", fields: getTableFields("tbarrio") },
  { slug: "tgrado", name: "tgrado", icon: "List-Numbers-Icon", fields: getTableFields("tgrado") },
  { slug: "tgrupo", name: "tgrupo", icon: "Users-Four-Icon", fields: getTableFields("tgrupo") },
  { slug: "tsede", name: "tsede", icon: "Address-Book-Icon", fields: getTableFields("tsede") },
  { slug: "testado", name: "testado", icon: "Check-Circle-Icon", fields: getTableFields("testado") },
  { slug: "ttipo_documento", name: "ttipo_documento", icon: "IdentificationCard-Icon", fields: getTableFields("ttipo_documento") },
  { slug: "tsexo", name: "tsexo", icon: "Gender-Intersex-Icon", fields: getTableFields("tsexo") },
  { slug: "trango_edad", name: "trango_edad", icon: "Calendar-Blank-Icon", fields: getTableFields("trango_edad") },
  { slug: "tarea_conocimiento", name: "tarea_conocimiento", icon: "Book-Open-Icon", fields: getTableFields("tarea_conocimiento") },
  { slug: "tasignatura", name: "tasignatura", icon: "Notebook-Icon", fields: getTableFields("tasignatura") },
  { slug: "tdocente", name: "tdocente", icon: "Chalkboard-Teacher-Icon", fields: getTableFields("tdocente") },
  { slug: "tevaluador", name: "tevaluador", icon: "Clipboard-Text-Icon", fields: getTableFields("tevaluador") },
  { slug: "tevaluacion", name: "tevaluacion", icon: "Clipboard-Check-Icon", fields: getTableFields("tevaluacion") },
  { slug: "tperiodo", name: "tperiodo", icon: "Calendar-Dots-Icon", fields: getTableFields("tperiodo") },
  { slug: "tresultado", name: "tresultado", icon: "Trophy-Icon", fields: getTableFields("tresultado") },
]
