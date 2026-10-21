import type { Conversacion } from "@/features/comunicaciones/chat/api/types"
import { useComunicadoQuery } from "@/features/comunicaciones/chat/api/query/use-comunicado-query"
import { useEleccionQuery } from "@/features/comunicaciones/chat/api/query/use-eleccion-query"
import { useEncuestaQuery } from "@/features/comunicaciones/chat/api/query/use-encuesta-query"
import { useEvaluacionQuery } from "@/features/comunicaciones/chat/api/query/use-evaluacion-query"
import { CrearComunicadoDialog } from "@/features/comunicaciones/chat/components/crear-comunicado-dialog"
import { CrearEleccionDialog } from "@/features/comunicaciones/chat/components/crear-eleccion-dialog"
import { CrearEncuestaDialog } from "@/features/comunicaciones/chat/components/crear-encuesta-dialog"
import { CrearEvaluacionDialog } from "@/features/comunicaciones/chat/components/crear-evaluacion-dialog"

/** Categorías con actividad propia que se editan con su diálogo de creación ("Editar …"). */
export const CATEGORIAS_EDITABLES = ["VOTACION", "ENCUESTA", "EXAMEN", "ANUNCIO"] as const

export const ETIQUETA_EDITAR: Record<(typeof CATEGORIAS_EDITABLES)[number], string> = {
  VOTACION: "Editar elección",
  ENCUESTA: "Editar encuesta",
  EXAMEN: "Editar evaluación",
  ANUNCIO: "Editar comunicado",
}

export const esActividadEditable = (c: Pick<Conversacion, "categoria" | "esCreador">) =>
  !!c.esCreador && (CATEGORIAS_EDITABLES as readonly string[]).includes(c.categoria)

/**
 * Abre el diálogo de edición de la actividad del canal (diseños 4058:62794, 4060:63421,
 * 4062:67466 y 4062:67938) con los datos actuales. comms-service solo deja editar a quien la creó y
 * mientras no haya participación (votos, respuestas o entregas); si ya la hay, el error del backend
 * se muestra en el diálogo.
 */
export function EditarActividad({
  conversacion: c,
  open,
  onClose,
}: {
  conversacion: Conversacion
  open: boolean
  onClose: () => void
}) {
  const id = open ? c.id : undefined
  const eleccion = useEleccionQuery(c.categoria === "VOTACION" ? id : undefined).data
  const encuesta = useEncuestaQuery(c.categoria === "ENCUESTA" ? id : undefined).data
  const evaluacion = useEvaluacionQuery(c.categoria === "EXAMEN" ? id : undefined).data
  const comunicado = useComunicadoQuery(c.categoria === "ANUNCIO" ? id : undefined).data
  const sinCambio = () => undefined

  if (!open) return null
  if (eleccion) {
    return <CrearEleccionDialog key={`e-${c.id}`} open editar={eleccion} onClose={onClose} onCreada={sinCambio} />
  }
  if (encuesta) {
    return <CrearEncuestaDialog key={`n-${c.id}`} open editar={encuesta} onClose={onClose} onCreada={sinCambio} />
  }
  if (evaluacion) {
    return <CrearEvaluacionDialog key={`v-${c.id}`} open editar={evaluacion} onClose={onClose} onCreada={sinCambio} />
  }
  if (comunicado) {
    return <CrearComunicadoDialog key={`c-${c.id}`} open editar={comunicado} onClose={onClose} onCreado={sinCambio} />
  }
  return null
}
