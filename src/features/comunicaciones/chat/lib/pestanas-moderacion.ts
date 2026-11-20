export type PestanaModeracion = "reportes" | "suspensiones" | "configuracion"

/**
 * Pestañas del diálogo de Moderación según la política (SSO #1027): Reportes solo para quien revisa
 * (Supervisor de sede), Suspensiones para quien suspende (rector o supervisor) y Configuración solo
 * para el Administrador del establecimiento.
 */
export function pestanasModeracion(p: {
  esAdministrador: boolean
  puedeSuspender: boolean
  puedeRevisarReportes: boolean
}): [PestanaModeracion, string][] {
  const pestanas: [PestanaModeracion, string][] = []
  if (p.puedeRevisarReportes) pestanas.push(["reportes", "Reportes"])
  if (p.puedeSuspender) pestanas.push(["suspensiones", "Suspensiones"])
  if (p.esAdministrador) pestanas.push(["configuracion", "Configuración de la mensajería"])
  return pestanas
}
