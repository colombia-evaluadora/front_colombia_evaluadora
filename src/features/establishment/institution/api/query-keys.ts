const all = ["establishments"] as const
const orientaciones = [...all, "orientaciones"] as const

export const establishmentKeys = {
  all,
  lista: <P>(params: P) => [...all, params] as const,
  detalle: (id: number | string | null | undefined) => [...all, id] as const,
  options: () => [...all, "options"] as const,
  permisoGestion: () => [...all, "permiso-gestion"] as const,
  /** Orientaciones recibidas (informe, 2.3): prefijo de su lista, su contador y sus detalles. */
  orientaciones: {
    all: orientaciones,
    lista: <P>(params: P) => [...orientaciones, "lista", params] as const,
    detalle: (id: number | "none") => [...orientaciones, "detalle", id] as const,
  },
} as const
