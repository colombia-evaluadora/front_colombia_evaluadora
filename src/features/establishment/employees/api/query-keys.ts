const all = ["employees"] as const
const detalle = (id: number | string | null | undefined) => [...all, id] as const

export const employeeKeys = {
  all,
  lista: <P>(params: P) => [...all, "lista", params] as const,
  /** Detalle legado (GET /:ID), el que usa Establecimiento para el rector y la secretaria. */
  detalle,
  /** La ficha vista desde un establecimiento: cuelga del detalle. */
  ficha: (id: number | null, establishmentId: number | null) => [...detalle(id), "ficha", establishmentId] as const,
  porDocumento: (establishmentId: number | null, documentTypeId: number | null, identification: string) =>
    [...all, "por-documento", establishmentId, documentTypeId, identification] as const,
  /** Roles asignados del funcionario en un establecimiento (Sección 4.2). */
  roles: (id: number | null, establishmentId: number | null) => [...detalle(id), "roles", establishmentId] as const,
  sedesAsignables: (establishmentId: number | null) => [...all, "sedes-asignables", establishmentId] as const,
  /** Permisos de un rol asignado: cuelga del funcionario para invalidarse con él. */
  permisosRol: (id: number | null, asignacionId: number | null) => [...detalle(id), "permisos-rol", asignacionId] as const,
} as const
