import { useAuth } from "@/features/auth/hooks/use-auth"

const ESTUDIANTE_ROLE = "CEVAL-ESTUDIANTE"

export interface ChatAccess {
  esEstudiante: boolean
  // Crear canales, votaciones rápidas, administrar miembros y editar o eliminar canales.
  puedeGestionar: boolean
}

// Igual que `useAsistenciaAccess`: el alcance sale de los roles del token.
export function useChatAccess(): ChatAccess {
  const { user } = useAuth()
  const esEstudiante = user?.roles.includes(ESTUDIANTE_ROLE) ?? false
  return { esEstudiante, puedeGestionar: !esEstudiante }
}
