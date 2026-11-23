/**
 * Roles territoriales (V210): el Supervisor territorial y el Administrador territorial. No participan
 * en la mensajería ni publican (Comunicaciones 4.4 y 7): sus comunicados se consultan en la vista
 * territorial. El claim `roles` del JWT trae el nombre del SSO con el prefijo `CEVAL-`.
 */
export const ROLES_TERRITORIALES = ["CEVAL-SUP_TER", "CEVAL-ADM_TER"] as const

export function esUsuarioTerritorial(roles: readonly string[] | null | undefined): boolean {
  return (roles ?? []).some((r) => (ROLES_TERRITORIALES as readonly string[]).includes(r.trim().toUpperCase()))
}
