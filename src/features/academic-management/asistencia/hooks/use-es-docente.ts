import { useAuth } from "@/features/auth/hooks/use-auth"
import { useMenuPermission } from "@/features/navigation/api/use-menu-permission"

const DOCENTE_ROLE = "CEVAL-DOCENTE"
const DIRECTOR_GRUPO_ROLE = "CEVAL-DIRECTOR_GRUPO"
const COORDINADOR_ROLE = "CEVAL-COORDINADOR"
const SUPER_ADMIN_ROLE = "CEVAL-SUPER_ADMINISTRADOR"

export function useEsCoordinador(): boolean {
  const { user } = useAuth()
  return user?.roles.includes(COORDINADOR_ROLE) ?? false
}

export interface AsistenciaAccess {
  isDocente: boolean
  /** Regla 76: puede registrar sin ser docente; registra cualquier clase de su alcance. */
  esAdminEstablecimiento: boolean
  isDirectorGrupo: boolean
  isCoordinador: boolean
  puedeRegistrar: boolean
  /** Regla 75: resuelve solicitudes de corrección (roles de `/aprobaciones`). */
  puedeAprobar: boolean
}

/**
 * Regla 75: roles que resuelven solicitudes (`/aprobaciones`); el back acota cada uno a su sede o establecimiento.
 * El super administrador queda fuera: el back lo deja aprobar, pero no se le muestra el aviso de pendientes.
 */
const APROBADOR_ROLES = [
  COORDINADOR_ROLE,
  "CEVAL-RECTOR",
  "CEVAL-JEFE_SISTEMA_ESTABLECIMIENTO",
  "CEVAL-AUXILIAR_ADMINISTRATIVO",
]

/** Regla 74: resuelve de una vez el alcance de lectura/escritura de asistencia para el usuario actual, incluyendo el caso de doble rol (docente + director de grupo). */
export function useAsistenciaAccess(): AsistenciaAccess {
  const { user } = useAuth()
  const roles = user?.roles ?? []
  const isDocente = roles.includes(DOCENTE_ROLE)
  const isDirectorGrupo = roles.includes(DIRECTOR_GRUPO_ROLE)
  const isCoordinador = roles.includes(COORDINADOR_ROLE)
  // Regla 76: quién escribe lo decide el menú ASISTENCIAS en Vistas base por rol (mismo permiso que el back).
  const { puedeCrear } = useMenuPermission("ASISTENCIAS")
  // Sin rol docente ni de director de grupo (categoría de sede), el back no lo acota a sus clases.
  const esAdminEstablecimiento = puedeCrear && !isDocente && !isDirectorGrupo

  return {
    isDocente: isDocente && puedeCrear,
    esAdminEstablecimiento,
    isDirectorGrupo,
    isCoordinador,
    puedeRegistrar: puedeCrear,
    puedeAprobar:
      !roles.includes(SUPER_ADMIN_ROLE) && APROBADOR_ROLES.some((rol) => roles.includes(rol)),
  }
}
