import { useState, type ReactNode } from "react"

import type { Conversacion } from "@/features/comunicaciones/chat/api/types"
import { useChatAccess } from "@/features/comunicaciones/chat/api/use-chat-access"
import type { AccionesAtajo } from "@/features/comunicaciones/chat/components/chat-composer"
import { CrearComunicadoDialog } from "@/features/comunicaciones/chat/components/crear-comunicado-dialog"
import { CrearEleccionDialog } from "@/features/comunicaciones/chat/components/crear-eleccion-dialog"
import { CrearEncuestaDialog } from "@/features/comunicaciones/chat/components/crear-encuesta-dialog"
import { VotacionRapidaDialog } from "@/features/comunicaciones/chat/components/votacion-rapida-dialog"
import { CHAT_FUNCIONES } from "@/features/comunicaciones/chat/lib/funciones-disponibles"
import { useMenuPermission } from "@/features/navigation/api/use-menu-permission"

type Dialogo = keyof AccionesAtajo

/**
 * Atajos "/" del compositor que abren diálogos de la página, con los mismos permisos que sus
 * menús: crear encuesta, elección o comunicado como "Agregar foro" (funcionarios) y la votación
 * rápida como el menú ⋮ (quien gestiona el foro o grupo). Lo que no se puede no se ofrece.
 */
export function useDialogosAtajos({
  conversacion: c,
  onCreado,
}: {
  conversacion: Conversacion | undefined
  onCreado: (conversacionId: number) => void
}): { acciones: AccionesAtajo; dialogos: ReactNode } {
  const { puedeGestionar } = useChatAccess()
  // El comunicado sale del permiso COMUNICADOS del rol (Roles y menús), no del perfil.
  const creaComunicados = useMenuPermission("COMUNICADOS").puedeCrear
  const [abierto, setAbierto] = useState<Dialogo | null>(null)
  const cerrar = () => setAbierto(null)
  const gestionaCanal = !!c && (c.tipo === "CANAL" || c.tipo === "GRUPO") && (c.esAdmin ?? puedeGestionar)

  const acciones: AccionesAtajo = {}
  if (puedeGestionar && CHAT_FUNCIONES.encuestas) acciones.encuesta = () => setAbierto("encuesta")
  if (gestionaCanal && CHAT_FUNCIONES.votacionRapida) acciones.votacion = () => setAbierto("votacion")
  if (puedeGestionar && CHAT_FUNCIONES.elecciones) acciones.eleccion = () => setAbierto("eleccion")
  if (creaComunicados && CHAT_FUNCIONES.comunicados) acciones.comunicado = () => setAbierto("comunicado")

  const dialogos = (
    <>
      {abierto === "encuesta" && <CrearEncuestaDialog open onClose={cerrar} onCreada={onCreado} />}
      {abierto === "eleccion" && <CrearEleccionDialog open onClose={cerrar} onCreada={onCreado} />}
      {abierto === "comunicado" && <CrearComunicadoDialog open onClose={cerrar} onCreado={onCreado} />}
      {abierto === "votacion" && c && <VotacionRapidaDialog conversacionId={c.id} open onClose={cerrar} />}
    </>
  )
  return { acciones, dialogos }
}
