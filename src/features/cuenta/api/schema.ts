import * as z from "zod"

/** Pestañas de Mi cuenta. `?seccion=autorizaciones` llega desde la notificación AUTORIZACION_PENDIENTE. */
export const SECCIONES_CUENTA = ["datos", "seguridad", "sesiones", "autorizaciones"] as const
export type SeccionCuenta = (typeof SECCIONES_CUENTA)[number]

export const miCuentaSearchSchema = z.object({
  seccion: z.enum(SECCIONES_CUENTA).optional().catch(undefined),
})
