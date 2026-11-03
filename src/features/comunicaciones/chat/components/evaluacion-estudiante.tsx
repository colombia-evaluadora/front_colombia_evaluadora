import { useState } from "react"
import { ErrorNoticeBanner } from "@/components/notice/error-notice-banner"

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
          <ErrorNoticeBanner error={enviar.isError ? enviar.error : null} />
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

      {/*
        Solo la nota que puso el docente, por intento: nunca respuestas correctas, puntos por
        pregunta ni qué estuvo bien o mal (comms-service tampoco los manda al estudiante).
      */}
      {nota != null ? (
        <p className="mt-4">
          <span className="block text-sm text-muted-foreground">Tu nota</span>
          <span className={cn("text-4xl font-bold tabular-nums", paso ? "text-green" : "text-red")}>
            {nota}
          </span>
          <span className="text-lg text-muted-foreground tabular-nums"> / {e.puntajeTotal}</span>
        </p>
      ) : (
        <p className="mt-4 text-lg font-semibold text-muted-foreground">Pendiente de calificación</p>
      )}

      {(e.misIntentos?.length ?? 0) > 1 && (
        <ol aria-label="Notas por intento" className="mx-auto mt-4 max-w-xs space-y-1 text-sm">
          {e.misIntentos?.map((i) => (
            <li key={i.numero} className="flex justify-between gap-4">
              <span className="text-muted-foreground">Intento {i.numero}</span>
              <span className="tabular-nums">
                {i.nota != null ? `${i.nota} / ${e.puntajeTotal}` : "Pendiente de calificación"}
              </span>
            </li>
          ))}
        </ol>
      )}

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
