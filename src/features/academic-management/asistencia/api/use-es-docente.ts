import { useAuth } from "@/features/auth/hooks/use-auth"

/** Claim de rol del token: `'CEVAL-' || TROL.CODIGO` (ver `lib/auth-mapper`). */
const DOCENTE_ROLE = "CEVAL-DOCENTE"

/**
 * Gobierna las dos mitades de la misma decisión: la vista restringida del
 * calendario (sin drill-down de rector) y el `MIAS` que manda el backend a
 * `fn_asistencia_calendario` / `fn_asistencia_resumen_horas`. Sin `MIAS` el
 * alcance que queda es el del rol —para un docente, toda su sede— y la
 * pantalla muestra clases de grupos que no dicta.
 */
export function useEsDocente(): boolean {
  const { user } = useAuth()
  return user?.roles.includes(DOCENTE_ROLE) ?? false
}
