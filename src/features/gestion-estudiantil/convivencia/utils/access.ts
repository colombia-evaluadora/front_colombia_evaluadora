/** Escribir casos (crear, modificar, registrar acciones). */
export const GESTION_ROLES = ["CEVAL-COORDINADOR", "CEVAL-DOCENTE", "CEVAL-RECTOR", "CEVAL-PSICO_ORIENTADOR"]
/** Asignar gestor, cambiar tipo, cerrar y anular; también escribir el Comité y exportar el SIUCE. */
export const SUPERVISION_ROLES = ["CEVAL-COORDINADOR", "CEVAL-RECTOR"]
/** Ver el Comité: además de quien lo gestiona, orientación y trabajo social. */
export const COMITE_VER_ROLES = [...SUPERVISION_ROLES, "CEVAL-PSICO_ORIENTADOR", "CEVAL-TRABAJADOR_SOCIAL"]

interface PermisoMenu {
  puedeVer: boolean
  puedeCrear: boolean
  puedeEditar: boolean
}

const tiene = (roles: string[], permitidos: string[]) => permitidos.some((r) => roles.includes(r))

export function accesoConvivencia(roles: string[], permiso: PermisoMenu) {
  const gestiona = tiene(roles, GESTION_ROLES)
  const supervisa = tiene(roles, SUPERVISION_ROLES)
  return {
    puedeCrear: permiso.puedeCrear && gestiona,
    puedeGestionar: permiso.puedeEditar && gestiona,
    /** Gestor, tipo, cerrar y anular. */
    puedeSupervisar: permiso.puedeEditar && supervisa,
    puedeVerComite: permiso.puedeVer && tiene(roles, COMITE_VER_ROLES),
    puedeGestionarComite: permiso.puedeEditar && supervisa,
    puedeExportarSiuce: permiso.puedeVer && supervisa,
  }
}

export const SIN_ACCESO = accesoConvivencia([], { puedeVer: false, puedeCrear: false, puedeEditar: false })
