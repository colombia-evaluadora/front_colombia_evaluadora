export const BASE = "/gestion-estudiantil/inclusion"
export const PIAR = `${BASE}/piar`

export const piarKeys = {
  all: ["piar"] as const,
  lista: (params: unknown) => ["piar", "lista", params] as const,
  aviso: (sede: string, jornada: string) => ["piar", "aviso", sede, jornada] as const,
  detalle: (id: number) => ["piar", "detalle", id] as const,
  historial: (id: number) => ["piar", "historial", id] as const,
  opciones: (id: number, tipo: string, extra?: number) => ["piar", "opciones", id, tipo, extra] as const,
}
