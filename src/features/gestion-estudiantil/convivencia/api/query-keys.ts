const all = ["convivencia"] as const

export const convivenciaKeys = {
  all,
  lista: <P>(params: P) => [...all, "lista", params] as const,
  /** Prefijo de todos los listados de casos (para invalidarlos sin tocar el resto). */
  listas: [...all, "lista"] as const,
  detalle: (id: number | "none") => [...all, "detalle", id] as const,
  /** Prefijo de todos los detalles de caso. */
  detalles: [...all, "detalle"] as const,
  pasos: (id: number | "none") => [...all, "pasos", id] as const,
  gestores: (id: number | "none") => [...all, "gestores", id] as const,
  funcionarios: <P>(params: P) => [...all, "funcionarios", params] as const,
  gestorPrevisto: (tipo: number | "none", matriculas: number[]) => [...all, "gestor-previsto", tipo, matriculas] as const,
  soportes: (accion: number | "none") => [...all, "soportes", accion] as const,
  siuce: <P>(params: P) => [...all, "siuce", params] as const,
} as const

const comiteAll = [...all, "comite"] as const

/**
 * Comité bajo `convivenciaKeys.all`: una mutación de casos también lo refresca; las del Comité
 * invalidan `comiteKeys.all` (y los casos solo si cambian lo que el caso muestra del Comité).
 */
export const comiteKeys = {
  all: comiteAll,
  periodos: () => [...comiteAll, "periodos"] as const,
  detalle: (periodo: number | "none") => [...comiteAll, "detalle", periodo] as const,
  sesiones: <P>(params: P) => [...comiteAll, "sesiones", params] as const,
  sesion: (id: number | "none") => [...comiteAll, "sesion", id] as const,
  casos: (comite: number | "none", search: string) => [...comiteAll, "casos", comite, search] as const,
  funcionarios: <P>(comite: number | "none", params: P) => [...comiteAll, "funcionarios", comite, params] as const,
  estudiantes: (comite: number | "none", search: string) => [...comiteAll, "estudiantes", comite, search] as const,
} as const

const procesosAll = [...all, "procesos"] as const

/** Procesos disciplinarios (3.5) bajo convivenciaKeys.all: una mutacion de Convivencia los refresca. */
export const procesosKeys = {
  all: procesosAll,
  lista: <P>(params: P) => [...procesosAll, "lista", params] as const,
  responsables: () => [...procesosAll, "responsables-filtro"] as const,
  detalle: (id: number | "none") => [...procesosAll, "detalle", id] as const,
  apertura: (recurso: string, ...args: unknown[]) => [...procesosAll, "apertura", recurso, ...args] as const,
  /** Opciones y cálculos de los modales de etapa (sanciones, límites, plazo de recurrir, opciones de recurso). */
  etapa: (recurso: string, ...args: unknown[]) => [...procesosAll, "etapa", recurso, ...args] as const,
} as const
