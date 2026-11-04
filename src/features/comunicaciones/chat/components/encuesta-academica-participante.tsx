import { useState } from "react"
import { format } from "date-fns"

import { ErrorNoticeBanner } from "@/components/notice/error-notice-banner"
import { Button } from "@/components/ui/button"
import { useResponderEncuesta } from "@/features/comunicaciones/chat/api/mutations/use-crear-encuesta"
import type { Encuesta } from "@/features/comunicaciones/chat/api/types"
import { ResponderPregunta } from "@/features/comunicaciones/chat/components/responder-pregunta"
import { AVISO_NO_ANONIMA } from "@/features/comunicaciones/chat/lib/encuesta-academica"
import { RESPUESTA_VACIA } from "@/features/comunicaciones/chat/lib/respuestas"

// Formulario de la modalidad del manual: arranca con la respuesta vigente y se puede cambiar hasta el
// cierre, sin el "se responde una sola vez" de la institucional. El llamador decide si está abierta.
export function FormularioAcademico({ encuesta: e }: { encuesta: Encuesta }) {
  const pregunta = e.preguntas[0]
  const vigente = e.miRespuesta ?? []
  const [opcionIds, setOpcionIds] = useState<number[]>(vigente)
  const [guardada, setGuardada] = useState(false)
  const responder = useResponderEncuesta(e.conversacionId)
  if (!pregunta) return null

  const sinCambios = opcionIds.length === vigente.length && opcionIds.every((id) => vigente.includes(id))

  return (
    <form
      aria-label={`Pregunta de ${e.nombre}`}
      onSubmit={(ev) => {
        ev.preventDefault()
        setGuardada(false)
        responder.mutate([{ preguntaId: pregunta.id, opcionIds, texto: null }], { onSuccess: () => setGuardada(true) })
      }}
      className="mb-4 rounded-xl border bg-card p-4 md:p-5"
    >
      <p className="mb-4 rounded-lg bg-blue-22 px-3 py-2 text-sm">{AVISO_NO_ANONIMA}</p>
      <ol>
        <ResponderPregunta
          numero={1}
          pregunta={pregunta}
          valor={{ ...RESPUESTA_VACIA, opcionIds }}
          onCambio={(cambio) => {
            setGuardada(false)
            if (cambio.opcionIds) setOpcionIds(cambio.opcionIds)
          }}
        />
      </ol>
      <ErrorNoticeBanner error={responder.isError ? responder.error : null} />
      <div className="mt-6 flex flex-wrap items-center justify-end gap-4">
        <span role="status" className="text-sm text-muted-foreground">
          {guardada
            ? "Tu respuesta quedó guardada."
            : e.fechaCierre
              ? `Puedes cambiar tu respuesta hasta el ${format(new Date(e.fechaCierre), "dd/MM/yyyy HH:mm")}.`
              : "Puedes cambiar tu respuesta hasta el cierre."}
        </span>
        <Button type="submit" disabled={opcionIds.length === 0 || sinCambios || responder.isPending} aria-busy={responder.isPending}>
          Guardar respuesta
        </Button>
      </div>
    </form>
  )
}
