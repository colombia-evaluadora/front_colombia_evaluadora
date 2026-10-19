import { useEffect, useRef } from "react"

import { ArrowRightIcon, CheckCircleIcon, SparkleIcon, SpinnerIcon, WarningCircleIcon } from "@/components/ui/icons"

import { cn } from "@/lib/utils"
import { Bubble, BubbleContent } from "@/components/ui/bubble"
import { Message, MessageContent } from "@/components/ui/message"
import {
  MessageScroller,
  MessageScrollerButton,
  MessageScrollerContent,
  MessageScrollerItem,
  MessageScrollerViewport,
  useMessageScroller,
} from "@/components/ui/message-scroller"

import type { EstadoTurno } from "@/features/assistant/api/types"
import { RespuestaAgente } from "@/features/assistant/components/respuesta-agente"
import type { MensajeChat, PasoHerramienta } from "@/features/assistant/hooks/use-asistente"
import { etiquetaEstado } from "@/features/assistant/lib/sugerencias"

interface ChatMessageListProps {
  mensajes: MensajeChat[]
  enviando: boolean
  estado: EstadoTurno | null
  /** Herramientas del turno en curso, en orden de inicio. */
  herramientas?: PasoHerramienta[]
  bloqueado: boolean
  puedeAccionar?: boolean
  sugerencias: string[]
  onEnviar: (texto: string) => void
  onConfirmar: (mensaje: MensajeChat) => void
  onCancelar: (mensaje: MensajeChat) => void
  onReintentar: (mensaje: MensajeChat) => void
}

export function ChatMessageList({
  mensajes,
  enviando,
  estado,
  herramientas = [],
  bloqueado,
  puedeAccionar = true,
  sugerencias,
  onEnviar,
  onConfirmar,
  onCancelar,
  onReintentar,
}: ChatMessageListProps) {
  if (mensajes.length === 0) {
    return <Bienvenida sugerencias={sugerencias} bloqueado={bloqueado} onEnviar={onEnviar} />
  }

  const ultimo = mensajes.at(-1)
  // Solo la última pregunta ancla: con todas, al abrir el historial la vista saltaba a la primera.
  const ultimaPregunta = mensajes.findLast((m) => m.rol === "user")

  return (
    <MessageScroller>
      <MessageScrollerViewport>
        <MessageScrollerContent aria-busy={enviando} className="flex flex-col gap-6 px-5 py-5">
          {mensajes.map((mensaje) => {
            const esUsuario = mensaje.rol === "user"
            const cargando = enviando && mensaje === ultimo && !esUsuario && !mensaje.respuesta && !mensaje.error
            return (
              <MessageScrollerItem
                key={mensaje.id}
                messageId={mensaje.id}
                scrollAnchor={mensaje === ultimaPregunta}
                className="animate-in fade-in slide-in-from-bottom-2 duration-300 motion-reduce:animate-none"
              >
                {esUsuario ? (
                  <Message align="end">
                    <MessageContent>
                      <Bubble align="end" variant="default" className="max-w-[85%]">
                        <BubbleContent className="rounded-2xl rounded-br-md">
                          <span className="whitespace-pre-wrap">{mensaje.texto}</span>
                        </BubbleContent>
                      </Bubble>
                    </MessageContent>
                  </Message>
                ) : (
                  // Sin burbuja: tablas a todo el ancho.
                  <div className="flex gap-3">
                    <AvatarAsistente
                      className={cn("mt-0.5 size-6", cargando && "animate-pulse motion-reduce:animate-none")}
                    />
                    <div className="min-w-0 flex-1 text-sm">
                      {cargando ? (
                        <ProgresoTurno estado={estado} herramientas={herramientas} />
                      ) : (
                        <RespuestaAgente
                          mensaje={mensaje}
                          bloqueado={bloqueado || enviando}
                          puedeAccionar={puedeAccionar}
                          onResponder={onEnviar}
                          onConfirmar={onConfirmar}
                          onCancelar={onCancelar}
                          onReintentar={onReintentar}
                        />
                      )}
                    </div>
                  </div>
                )}
              </MessageScrollerItem>
            )
          })}
        </MessageScrollerContent>
      </MessageScrollerViewport>
      <MessageScrollerButton />
      <BajarAlFinal />
    </MessageScroller>
  )
}

export function AvatarAsistente({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground",
        className,
      )}
    >
      <SparkleIcon className="size-[60%]" />
    </span>
  )
}

function Bienvenida({
  sugerencias,
  bloqueado,
  onEnviar,
}: {
  sugerencias: string[]
  bloqueado: boolean
  onEnviar: (texto: string) => void
}) {
  return (
    <div className="flex flex-1 flex-col justify-end gap-6 overflow-y-auto px-5 pt-6 pb-4">
      <div className="flex flex-col gap-2">
        <AvatarAsistente className="mb-1 size-9" />
        <h3 className="text-xl font-semibold tracking-tight text-balance">¿En qué te ayudo hoy?</h3>
        <p className="max-w-[38ch] text-sm text-muted-foreground">
          Consulto información, te llevo a la pantalla correcta y preparo cambios que tú confirmas.
        </p>
      </div>
      {sugerencias.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <p className="text-xs font-medium text-muted-foreground">Prueba con</p>
          <ul className="flex flex-col divide-y overflow-hidden rounded-lg border bg-background">
            {sugerencias.map((sugerencia) => (
              <li key={sugerencia}>
                <button
                  type="button"
                  disabled={bloqueado}
                  onClick={() => onEnviar(sugerencia)}
                  className="group flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm transition-colors outline-none hover:bg-primary-22 focus-visible:bg-primary-22 disabled:pointer-events-none disabled:opacity-50"
                >
                  <SparkleIcon className="size-4 shrink-0 text-muted-foreground group-hover:text-primary group-focus-visible:text-primary" />
                  <span className="flex-1">{sugerencia}</span>
                  <ArrowRightIcon className="size-4 shrink-0 text-primary opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100 motion-reduce:transition-none" />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

/** Turno en curso: estado general y, debajo, cada herramienta en orden. */
function ProgresoTurno({ estado, herramientas }: { estado: EstadoTurno | null; herramientas: PasoHerramienta[] }) {
  return (
    <div className="flex flex-col gap-2" aria-live="polite">
      <span className="flex items-center gap-2 pt-0.5 text-muted-foreground">
        <SpinnerIcon className="size-4 animate-spin" />
        {etiquetaEstado(estado)}
      </span>
      {herramientas.length > 0 && (
        <ol className="ml-2 flex flex-col gap-1.5 border-l pl-3 text-xs">
          {herramientas.map((paso) => (
            <li key={paso.id} className="flex items-center gap-1.5">
              {paso.estado === "EN_CURSO" ? (
                <SpinnerIcon className="size-3.5 animate-spin text-muted-foreground" />
              ) : paso.estado === "OK" ? (
                <CheckCircleIcon className="size-3.5 text-green" />
              ) : (
                <WarningCircleIcon className="size-3.5 text-yellow" />
              )}
              <span className={paso.estado === "EN_CURSO" ? "" : "text-muted-foreground"}>{paso.etiqueta}</span>
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}

/**
 * Al montar baja al último mensaje. La librería lo intenta mientras el Sheet
 * anima (sin alto) y falla, así que se reintenta unos frames.
 */
function BajarAlFinal() {
  const { scrollToEnd } = useMessageScroller()
  const scrollRef = useRef(scrollToEnd)
  scrollRef.current = scrollToEnd
  useEffect(() => {
    let intentos = 0
    let frame = 0
    const bajar = () => {
      scrollRef.current({ behavior: "instant" })
      const v = document.querySelector<HTMLElement>("[data-slot=message-scroller-viewport]")
      const abajo = v && v.scrollHeight - v.clientHeight - v.scrollTop < 2
      if (!abajo && ++intentos < 30) frame = requestAnimationFrame(bajar)
    }
    frame = requestAnimationFrame(bajar)
    return () => cancelAnimationFrame(frame)
  }, [])
  return null
}
