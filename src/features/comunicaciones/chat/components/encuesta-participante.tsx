import { useState } from "react"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { CheckIcon } from "@/components/ui/icons"
import { Skeleton } from "@/components/ui/skeleton"
import { getErrorMessage } from "@/lib/api-client"
import type { Encuesta } from "@/features/comunicaciones/chat/api/types"
import { useResponderEncuesta } from "@/features/comunicaciones/chat/api/mutations/use-crear-encuesta"
import { estadoEleccion } from "@/features/comunicaciones/chat/lib/eleccion"
import { ResponderPregunta } from "@/features/comunicaciones/chat/components/responder-pregunta"
import { EncuestaResultados } from "@/features/comunicaciones/chat/components/encuesta-panel"
import {
  RESPUESTA_VACIA,
  estaRespondida,
  type RespuestaLocal,
} from "@/features/comunicaciones/chat/lib/respuestas"

// Vista de quien fue asignado a la encuesta: la responde una vez y luego ve los
// resultados si son públicos.
export function EncuestaParticipante({
  encuesta: e,
  isPending,
}: {
  encuesta: Encuesta | null | undefined
  isPending: boolean
}) {
  if (isPending) return <Skeleton className="mb-4 h-72 w-full" />
  if (!e) return null

  const estado = estadoEleccion(e)
  if (estado === "PROGRAMADA") {
    return (
      <p className="mb-4 rounded-xl border px-4 py-6 text-center text-sm text-muted-foreground">
        La encuesta todavía no ha abierto.
      </p>
    )
  }
  if (!e.yaRespondi && estado === "ACTIVA") return <Formulario encuesta={e} />

  return (
    <>
      {e.yaRespondi && (
        <section className="mb-4 rounded-xl border bg-card px-6 py-6 text-center">
          <span className="mx-auto mb-3 grid size-10 place-items-center rounded-full bg-green text-white">
            <CheckIcon aria-hidden className="size-6" />
          </span>
          <h3 className="text-xl font-bold">¡Gracias por responder!</h3>
          <p className="mt-1 text-sm text-muted-foreground">Tus respuestas quedaron registradas.</p>
        </section>
      )}
      <EncuestaResultados encuesta={e} isPending={false} />
    </>
  )
}

function Formulario({ encuesta: e }: { encuesta: Encuesta }) {
  const [respuestas, setRespuestas] = useState<Record<number, RespuestaLocal>>({})
  const [confirmar, setConfirmar] = useState(false)
  const responder = useResponderEncuesta(e.conversacionId)
  const sinResponder = e.preguntas.filter((p) => !estaRespondida(p.tipo, respuestas[p.id])).length

  const enviar = () =>
    responder.mutate(
      e.preguntas.map((p) => ({
        preguntaId: p.id,
        opcionIds: respuestas[p.id]?.opcionIds ?? [],
        texto: p.tipo === "REDACCION" ? respuestas[p.id]?.texto.trim() || null : null,
      })),
      { onSuccess: () => setConfirmar(false) },
    )

  return (
    <form
      aria-label={`Preguntas de ${e.nombre}`}
      onSubmit={(ev) => {
        ev.preventDefault()
        setConfirmar(true)
      }}
      className="mb-4 rounded-xl border bg-card p-4 md:p-5"
    >
      <ol className="space-y-6">
        {e.preguntas.map((p, i) => (
          <ResponderPregunta
            key={p.id}
            numero={i + 1}
            pregunta={p}
            valor={respuestas[p.id] ?? RESPUESTA_VACIA}
            onCambio={(cambio) =>
              setRespuestas((r) => ({ ...r, [p.id]: { ...RESPUESTA_VACIA, ...r[p.id], ...cambio } }))
            }
          />
        ))}
      </ol>

      <div className="mt-6 flex items-center justify-end gap-4">
        <span className="text-sm text-muted-foreground tabular-nums">
          {e.preguntas.length - sinResponder} de {e.preguntas.length} respondidas
        </span>
        <Button type="submit" disabled={sinResponder === e.preguntas.length}>
          Enviar
        </Button>
      </div>

      <AlertDialog open={confirmar} onOpenChange={(o) => !o && !responder.isPending && setConfirmar(false)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Enviar tus respuestas?</AlertDialogTitle>
            <AlertDialogDescription>
              {sinResponder > 0
                ? `${sinResponder === 1 ? "Dejaste 1 pregunta" : `Dejaste ${sinResponder} preguntas`} sin responder. `
                : ""}
              La encuesta se responde una sola vez.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {responder.isError && (
            <p role="alert" className="text-sm text-red">
              {getErrorMessage(responder.error)}
            </p>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel variant="fill" color="neutral" disabled={responder.isPending}>
              Seguir respondiendo
            </AlertDialogCancel>
            <AlertDialogAction disabled={responder.isPending} aria-busy={responder.isPending} onClick={enviar}>
              Enviar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </form>
  )
}
