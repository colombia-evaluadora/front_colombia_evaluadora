const all = ["actividades-extracurriculares"] as const

/** Toda escritura invalida la raíz: listados, detalle, participantes, sesiones y servicio social cambian juntos. */
export const actividadesKeys = {
  all,
  lista: <P>(params: P) => [...all, "lista", params] as const,
  detalle: (id: number | "none") => [...all, "detalle", id] as const,
  responsables: (sede: number | "none", jornada: number | "none", search: string) =>
    [...all, "responsables", sede, jornada, search] as const,
  participantes: <P>(id: number | "none", params: P) => [...all, "participantes", id, params] as const,
  candidatos: (id: number | "none", search: string) => [...all, "candidatos", id, search] as const,
  sesiones: <P>(id: number | "none", params: P) => [...all, "sesiones", id, params] as const,
  sesion: (id: number | "none") => [...all, "sesion", id] as const,
  servicioSocial: {
    lista: <P>(params: P) => [...all, "servicio-social", "lista", params] as const,
    estudiante: (matricula: number | "none") => [...all, "servicio-social", "estudiante", matricula] as const,
    certificado: (matricula: number | "none") => [...all, "servicio-social", "certificado", matricula] as const,
    parametros: [...all, "servicio-social", "parametros"] as const,
  },
} as const
