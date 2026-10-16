import { SparkleIcon, SpinnerIcon } from "@/components/ui/icons"

import { cn } from "@/lib/utils"
import { Bubble, BubbleContent } from "@/components/ui/bubble"
import { Button } from "@/components/ui/button"
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { Message, MessageContent } from "@/components/ui/message"
import {
  MessageScroller,
  MessageScrollerButton,
  MessageScrollerContent,
  MessageScrollerItem,
  MessageScrollerViewport,
} from "@/components/ui/message-scroller"

import type { EstadoTurno } from "@/features/assistant/api/types"
import { RespuestaAgente } from "@/features/assistant/components/respuesta-agente"
import type { MensajeChat } from "@/features/assistant/hooks/use-asistente"
import { etiquetaEstado } from "@/features/assistant/lib/sugerencias"

interface ChatMessageListProps {
  mensajes: MensajeChat[]
  enviando: boolean
  estado: EstadoTurno | null
  bloqueado: boolean
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
  bloqueado,
  sugerencias,
  onEnviar,
  onConfirmar,
  onCancelar,
  onReintentar,
}: ChatMessageListProps) {
  if (mensajes.length === 0) {
    return (
      <Empty className="flex-1">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <SparkleIcon />
          </EmptyMedia>
          <EmptyTitle>¿En qué te ayudo?</EmptyTitle>
          <EmptyDescription>
            Consulto información, te llevo a la pantalla correcta y preparo cambios que tú confirmas.
          </EmptyDescription>
        </EmptyHeader>
        <div className="flex w-full flex-col gap-2">
          {sugerencias.map((sugerencia) => (
            <Button
              key={sugerencia}
              variant="outline"
              color="neutral"
              size="sm"
              className="h-auto justify-start py-2 text-left whitespace-normal"
              disabled={bloqueado}
              onClick={() => onEnviar(sugerencia)}
            >
              {sugerencia}
            </Button>
          ))}
        </div>
      </Empty>
    )
  }

  const ultimo = mensajes.at(-1)

  return (
    <MessageScroller>
      <MessageScrollerViewport>
        <MessageScrollerContent aria-busy={enviando} className="flex flex-col gap-4 px-6 py-3">
          {mensajes.map((mensaje) => {
            const esUsuario = mensaje.rol === "user"
            const cargando = enviando && mensaje === ultimo && !esUsuario && !mensaje.respuesta && !mensaje.error
            return (
              <MessageScrollerItem
                key={mensaje.id}
                messageId={mensaje.id}
                scrollAnchor={esUsuario}
                className="animate-in fade-in slide-in-from-bottom-2 duration-300 motion-reduce:animate-none"
              >
                <Message align={esUsuario ? "end" : "start"}>
                  <MessageContent className={cn(!esUsuario && "w-full")}>
                    <Bubble
                      align={esUsuario ? "end" : "start"}
                      variant={esUsuario ? "default" : "muted"}
                      className={cn(!esUsuario && "max-w-full")}
                    >
                      <BubbleContent>
                        {esUsuario ? (
                          <span className="whitespace-pre-wrap">{mensaje.texto}</span>
                        ) : cargando ? (
                          <span className="flex items-center gap-2 text-muted-foreground" aria-live="polite">
                            <SpinnerIcon className="size-4 animate-spin" />
                            {etiquetaEstado(estado)}
                          </span>
                        ) : (
                          <RespuestaAgente
                            mensaje={mensaje}
                            bloqueado={bloqueado || enviando}
                            onResponder={onEnviar}
                            onConfirmar={onConfirmar}
                            onCancelar={onCancelar}
                            onReintentar={onReintentar}
                          />
                        )}
                      </BubbleContent>
                    </Bubble>
                  </MessageContent>
                </Message>
              </MessageScrollerItem>
            )
          })}
        </MessageScrollerContent>
      </MessageScrollerViewport>
      <MessageScrollerButton />
    </MessageScroller>
  )
}
