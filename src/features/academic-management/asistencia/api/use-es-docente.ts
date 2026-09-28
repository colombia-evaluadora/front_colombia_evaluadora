import { useAuth } from "@/features/auth/hooks/use-auth"

const DOCENTE_ROLE = "CEVAL-DOCENTE"
const DIRECTOR_GRUPO_ROLE = "CEVAL-DIRECTOR_GRUPO"
const COORDINADOR_ROLE = "CEVAL-COORDINADOR"
const JEFE_AREA_ROLE = "CEVAL-JEFE_AREA"

export function useEsDocente(): boolean {
  const { user } = useAuth()
  return user?.roles.includes(DOCENTE_ROLE) ?? false
}

export function useEsDirectorGrupo(): boolean {
  const { user } = useAuth()
  return user?.roles.includes(DIRECTOR_GRUPO_ROLE) ?? false
}

export function useEsCoordinador(): boolean {
  const { user } = useAuth()
  return user?.roles.includes(COORDINADOR_ROLE) ?? false
}

export interface AsistenciaAccess {
  isDocente: boolean
  isDirectorGrupo: boolean
  isCoordinador: boolean
  esDocentePuro: boolean
  puedeRegistrar: boolean
}

/** Regla 74: resuelve de una vez el alcance de lectura/escritura de asistencia para el usuario actual, incluyendo el caso de doble rol (docente + director de grupo). */
export function useAsistenciaAccess(): AsistenciaAccess {
  const { user } = useAuth()
  const roles = user?.roles ?? []
  const isDocente = roles.includes(DOCENTE_ROLE)
  const isDirectorGrupo = roles.includes(DIRECTOR_GRUPO_ROLE)
  const isCoordinador = roles.includes(COORDINADOR_ROLE)
  const isJefeArea = roles.includes(JEFE_AREA_ROLE)
  const esDocentePuro = isDocente && !isDirectorGrupo && !isCoordinador && !isJefeArea

  return {
    isDocente,
    isDirectorGrupo,
    isCoordinador,
    esDocentePuro,
    puedeRegistrar: isDocente,
  }
}
