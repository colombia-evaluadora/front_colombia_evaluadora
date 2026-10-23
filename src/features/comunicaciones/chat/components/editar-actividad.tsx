import type { CategoriaCanal } from "@/features/comunicaciones/chat/api/types"
import { useComunicadoQuery } from "@/features/comunicaciones/chat/api/query/use-comunicado-query"
import { useEleccionQuery } from "@/features/comunicaciones/chat/api/query/use-eleccion-query"
import { useEncuestaQuery } from "@/features/comunicaciones/chat/api/query/use-encuesta-query"
import { useEvaluacionQuery } from "@/features/comunicaciones/chat/api/query/use-evaluacion-query"
import {
  useBorradorActividadQuery,
  useBorradoresActividadQuery,
} from "@/features/comunicaciones/chat/api/query/use-borradores-actividad-query"
import { CATEGORIA_TIPO_BORRADOR } from "@/features/comunicaciones/chat/lib/borrador-actividad"
import { CrearComunicadoDialog } from "@/features/comunicaciones/chat/components/crear-comunicado-dialog"
import { CrearEleccionDialog } from "@/features/comunicaciones/chat/components/crear-eleccion-dialog"
import { CrearEncuestaDialog } from "@/features/comunicaciones/chat/components/crear-encuesta-dialog"
import { CrearEvaluacionDialog } from "@/features/comunicaciones/chat/components/crear-evaluacion-dialog"

/**
 * Abre el diálogo de edición de la actividad del canal (diseños 4058:62794, 4060:63421,
 * 4062:67466 y 4062:67938) con los datos actuales. comms-service solo deja editar a quien la creó y
 * mientras no haya participación (votos, respuestas o entregas); si ya la hay, el error del backend
 * se muestra en el diálogo.
 *
 * Los cambios se autoguardan como borrador de esa actividad (V594, uno por actividad y persona): si
 * quedó uno sin guardar, el diálogo lo retoma sobre lo publicado. Desde "Borradores y enviados" se
 * pasa `borradorId`.
 */
export function EditarActividad({
  conversacion: c,
  open,
  onClose,
  borradorId,
}: {
  conversacion: { id: number; categoria: CategoriaCanal }
  open: boolean
  onClose: () => void
  borradorId?: number
}) {
  const id = open ? c.id : undefined
  const eleccion = useEleccionQuery(c.categoria === "VOTACION" ? id : undefined).data
  const encuesta = useEncuestaQuery(c.categoria === "ENCUESTA" ? id : undefined).data
  const evaluacion = useEvaluacionQuery(c.categoria === "EXAMEN" ? id : undefined).data
  const comunicado = useComunicadoQuery(c.categoria === "ANUNCIO" ? id : undefined).data
  // Borrador pendiente de esta edición (si no vino uno explícito).
  const lista = useBorradoresActividadQuery({ enabled: open && !borradorId })
  const pendiente =
    borradorId ??
    lista.data?.find((b) => b.conversacionId === c.id && CATEGORIA_TIPO_BORRADOR[b.tipo] === c.categoria)?.id
  const detalle = useBorradorActividadQuery(open ? pendiente : undefined)
  const sinCambio = () => undefined

  if (!open) return null
  // Se espera a saber si hay borrador (los valores iniciales se leen una sola vez al montar). Si la
  // lista o el detalle fallan, se edita sobre lo publicado.
  if (!borradorId && lista.isLoading) return null
  if (pendiente && detalle.isLoading) return null
  const borrador = detalle.data ? { id: detalle.data.id, datos: detalle.data.datos } : undefined
  const key = `${c.id}-${borrador?.id ?? "publicado"}`

  if (eleccion) {
    return (
      <CrearEleccionDialog key={`e-${key}`} open editar={eleccion} borrador={borrador} onClose={onClose} onCreada={sinCambio} />
    )
  }
  if (encuesta) {
    return (
      <CrearEncuestaDialog key={`n-${key}`} open editar={encuesta} borrador={borrador} onClose={onClose} onCreada={sinCambio} />
    )
  }
  if (evaluacion) {
    return (
      <CrearEvaluacionDialog key={`v-${key}`} open editar={evaluacion} borrador={borrador} onClose={onClose} onCreada={sinCambio} />
    )
  }
  if (comunicado) {
    return (
      <CrearComunicadoDialog key={`c-${key}`} open editar={comunicado} borrador={borrador} onClose={onClose} onCreado={sinCambio} />
    )
  }
  return null
}
