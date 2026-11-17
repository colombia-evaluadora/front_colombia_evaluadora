const all = ["gestion-estudiantil", "configuracion"] as const
const proceso = [...all, "proceso"] as const

export const configuracionKeys = {
  all,
  acceso: (establecimiento: number | "none") => [...all, "acceso", establecimiento] as const,
  niveles: (establecimiento: number | "none") => [...all, "niveles", establecimiento] as const,
  proceso,
  plazos: (establecimiento: number | "none") => [...proceso, "plazos", establecimiento] as const,
  clasificaciones: (establecimiento: number | "none") => [...proceso, "clasificaciones", establecimiento] as const,
  sanciones: <P>(params: P) => [...proceso, "sanciones", params] as const,
  efectos: (establecimiento: number | "none") => [...proceso, "efectos", establecimiento] as const,
  causasReservadas: (establecimiento: number | "none") => [...all, "causas-reservadas", establecimiento] as const,
  servicioSocial: (establecimiento: number | "none") => [...all, "servicio-social", establecimiento] as const,
} as const
