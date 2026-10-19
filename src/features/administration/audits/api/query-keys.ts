const sesionesRoot = ["audits"] as const
const sesiones = [...sesionesRoot, "sessions"] as const
const sesion = (sessionId: string) => [...sesiones, sessionId] as const
const tablasRoot = ["audit-tables"] as const
const tabla = (tableSlug: string) => [...tablasRoot, tableSlug] as const
const operacionesTabla = (tableSlug: string) => [...tabla(tableSlug), "operations"] as const

// Dos raíces por valor histórico: ["audits", ...] (sesiones) y ["audit-tables", ...] (tablas)
export const auditKeys = {
  sesiones: {
    all: sesionesRoot,
    lista: <P>(params: P) => [...sesionesRoot, params] as const,
    stats: <P>(params: P) => [...sesionesRoot, "stats", params] as const,
    // prefijo de detalle y operaciones de todas las sesiones
    detalles: sesiones,
    detalle: sesion,
    operaciones: <P>(sessionId: string, params: P) => [...sesion(sessionId), "operations", params] as const,
  },
  tablas: {
    all: tablasRoot,
    lista: <P>(params: P) => [...tablasRoot, params] as const,
    detalle: tabla,
    operaciones: {
      all: operacionesTabla,
      lista: <P>(tableSlug: string, params: P) => [...operacionesTabla(tableSlug), params] as const,
      stats: <P>(tableSlug: string, params: P) => [...operacionesTabla(tableSlug), "stats", params] as const,
      cambios: (tableSlug: string, operationId: string, showAll: boolean) =>
        [...operacionesTabla(tableSlug), operationId, "changes", { showAll }] as const,
    },
  },
  tiposOperacion: ["audit-operation-types"] as const,
  estadosSesion: ["audit-session-statuses"] as const,
} as const
