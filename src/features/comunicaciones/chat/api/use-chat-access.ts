import { useAuth } from "@/features/auth/hooks/use-auth"
import { usePoliticaChatQuery } from "@/features/comunicaciones/chat/api/query/use-politica-chat-query"
import {
  POLITICA_CHAT_DENEGADA,
  perfilDeRoles,
  puedeMencionarMasivo,
  reglaDirecto,
  type PerfilChat,
  type PoliticaChat,
  type ReglaDirecto,
} from "@/features/comunicaciones/chat/lib/politica-chat"

const ESTUDIANTE_ROLE = "CEVAL-ESTUDIANTE"

export interface ChatAccess {
  esEstudiante: boolean
  // Crear canales, votaciones rápidas, administrar miembros y editar o eliminar canales.
  puedeGestionar: boolean
  perfil: PerfilChat
  politica: PoliticaChat
  // `@canal` / `@todos` (según la política de la institución).
  puedeMencionarMasivo: boolean
  // Regla de DM hacia otro perfil; todo `PROHIBIDO` mientras carga la política.
  reglaDirectoCon: (perfil: PerfilChat | undefined) => ReglaDirecto
  // "+ Nuevo mensaje" (SSO #1006): falso para el estudiante menor sin permiso y mientras carga.
  puedeIniciarConversaciones: boolean
  // Suspender mensajería (Administrador o Supervisor de sede); falso mientras carga.
  puedeSuspender: boolean
  // Pestaña Reportes de Moderación (solo Supervisor de sede); falso mientras carga.
  puedeRevisarReportes: boolean
}

// Igual que `useAsistenciaAccess`: el alcance sale de los roles del token.
// Lo que depende de la política de menores (DMs, @todos) sale del backend, no
// de este archivo: ver `lib/politica-chat.ts`.
export function useChatAccess(): ChatAccess {
  const { user } = useAuth()
  const roles = user?.roles ?? []
  const esEstudiante = roles.includes(ESTUDIANTE_ROLE)
  const perfil = perfilDeRoles(roles)
  const politica = usePoliticaChatQuery().data ?? POLITICA_CHAT_DENEGADA
  return {
    esEstudiante,
    puedeGestionar: !esEstudiante,
    perfil,
    politica,
    puedeMencionarMasivo: puedeMencionarMasivo(politica, perfil),
    reglaDirectoCon: (otro) => reglaDirecto(politica, perfil, otro ?? "DOCENTE"),
    puedeIniciarConversaciones: politica.puedeIniciarConversaciones !== false,
    puedeSuspender: politica.puedeSuspender === true,
    puedeRevisarReportes: politica.puedeRevisarReportes === true,
  }
}
