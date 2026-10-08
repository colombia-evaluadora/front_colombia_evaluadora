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
import { cn } from "@/lib/utils"
import type { Evaluacion } from "@/features/comunicaciones/chat/api/types"
import {
  useEnviarEvaluacion,
  type RespuestaNueva,
} from "@/features/comunicaciones/chat/api/mutations/use-acciones-evaluacion"
import { estadoEleccion } from "@/features/comunicaciones/chat/lib/eleccion"
import { aprobo } from "@/features/comunicaciones/chat/lib/evaluacion"
import { ResponderPregunta } from "@/features/comunicaciones/chat/components/responder-pregunta"
import {
  RESPUESTA_VACIA,
  estaRespondida,
  type RespuestaLocal,
} from "@/features/comunicaciones/chat/lib/respuestas"

type Respuestas = Record<number, RespuestaLocal>

// Vista del estudiante: responde el cuestionario y lo envía; después ve su entrega.
export function EvaluacionEstudiante({
  evaluacion: e,
  isPending,
}: {
  evaluacion: Evaluacion | null | undefined
  isPending: boolean
}) {
  const [intentando, setIntentando] = useState(false)

  if (isPending) return <Skeleton className="mb-4 h-72 w-full" />
  if (!e) return null

  const estado = estadoEleccion(e)
  const quedan = e.intentos == null ? null : e.intentos - e.intentosUsados
  const puedeIntentar = estado === "ACTIVA" && (quedan == null || quedan > 0)

  if (estado === "PROGRAMADA") {
    return (
      <p className="mb-4 rounded-xl border px-4 py-6 text-center text-sm text-muted-foreground">
        La evaluación todavía no ha abierto.
      </p>
    )
  }

  if (e.intentosUsados === 0 || intentando) {
    if (!puedeIntentar) {
      return (
        <p className="mb-4 rounded-xl border px-4 py-6 text-center text-sm text-muted-foreground">
          La evaluación cerró sin que la enviaras.
        </p>
      )
    }
    return <Cuestionario key={e.intentosUsados} evaluacion={e} onEnviada={() => setIntentando(false)} />
  }

  return (
    <Entregada
      evaluacion={e}
      quedan={quedan}
      onReintentar={puedeIntentar ? () => setIntentando(true) : undefined}
    />
  )
}

function Cuestionario({ evaluacion: e, onEnviada }: { evaluacion: Evaluacion; onEnviada: () => void }) {
  const [respuestas, setRespuestas] = useState<Respuestas>({})
  const [confirmar, setConfirmar] = useState(false)
  const enviar = useEnviarEvaluacion(e.conversacionId)
  const sinResponder = e.preguntas.filter((p) => !estaRespondida(p.tipo, respuestas[p.id])).length

  const poner = (id: number, cambio: Partial<Respuestas[number]>) =>
    setRespuestas((r) => ({ ...r, [id]: { ...RESPUESTA_VACIA, ...r[id], ...cambio } }))

  const mandar = () => {
    const lista: RespuestaNueva[] = e.preguntas.map((p) => ({
      preguntaId: p.id,
      opcionIds: respuestas[p.id]?.opcionIds ?? [],
      texto: p.tipo === "REDACCION" ? respuestas[p.id]?.texto.trim() || null : null,
    }))
    enviar.mutate(lista, {
      onSuccess: () => {
        setConfirmar(false)
        onEnviada()
      },
    })
  }

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
            onCambio={(cambio) => poner(p.id, cambio)}
            extra={`${p.puntos} ${p.puntos === 1 ? "punto" : "puntos"}`}
          />
        ))}
      </ol>

      <div className="mt-6 flex items-center justify-end gap-4">
        <span className="text-sm text-muted-foreground tabular-nums">
          {e.preguntas.length - sinResponder} de {e.preguntas.length} respondidas
        </span>
        <Button type="submit">Enviar</Button>
      </div>

      <AlertDialog open={confirmar} onOpenChange={(o) => !o && !enviar.isPending && setConfirmar(false)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Enviar tus respuestas?</AlertDialogTitle>
            <AlertDialogDescription>
              {sinResponder > 0
                ? `Te ${sinResponder === 1 ? "falta 1 pregunta" : `faltan ${sinResponder} preguntas`} por responder; ${sinResponder === 1 ? "contará" : "contarán"} como sin respuesta. `
                : ""}
              Después de enviarlas no podrás cambiarlas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {enviar.isError && (
            <p role="alert" className="text-sm text-red">
              {getErrorMessage(enviar.error)}
            </p>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel variant="fill" color="neutral" disabled={enviar.isPending}>
              Seguir respondiendo
            </AlertDialogCancel>
            <AlertDialogAction disabled={enviar.isPending} aria-busy={enviar.isPending} onClick={mandar}>
              Enviar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </form>
  )
}

function Entregada({
  evaluacion: e,
  quedan,
  onReintentar,
}: {
  evaluacion: Evaluacion
  quedan: number | null
  onReintentar?: () => void
}) {
  const nota = e.miNota
  const paso = nota != null && aprobo(nota, e.puntajeTotal)

  return (
    <section aria-label="Tu entrega" className="mb-4 rounded-xl border bg-card px-6 py-8 text-center">
      <span className="mx-auto mb-4 grid size-12 place-items-center rounded-full bg-green text-white">
        <CheckIcon aria-hidden className="size-7" />
      </span>
      <h3 className="text-2xl font-bold">Enviaste tu evaluación</h3>

      {nota != null ? (
        <p className="mt-4">
          <span className="block text-sm text-muted-foreground">
            {e.miNotaPendiente ? "Nota parcial" : "Tu nota"}
          </span>
          <span className={cn("text-4xl font-bold tabular-nums", paso ? "text-green" : "text-red")}>
            {nota}
          </span>
          <span className="text-lg text-muted-foreground tabular-nums"> / {e.puntajeTotal}</span>
        </p>
      ) : null}

      <p className="mx-auto mt-3 max-w-md text-sm text-muted-foreground">
        {nota == null
          ? "Verás tu nota cuando cierre la evaluación."
          : e.miNotaPendiente
            ? "Las preguntas abiertas se suman cuando tu docente las califique."
            : paso
              ? "Aprobaste esta evaluación."
              : "No alcanzaste el puntaje para aprobar."}
      </p>

      {onReintentar && (
        <div className="mt-5 space-y-2">
          <Button type="button" variant="outline" onClick={onReintentar}>
            Volver a intentar
          </Button>
          <p className="text-xs text-muted-foreground">
            {quedan == null ? "Tienes intentos ilimitados." : `Te ${quedan === 1 ? "queda 1 intento" : `quedan ${quedan} intentos`}.`}
          </p>
        </div>
      )}
    </section>
  )
}
