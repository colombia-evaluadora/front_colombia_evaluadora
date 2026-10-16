import { useState } from "react"
import { useRouterState } from "@tanstack/react-router"

import {
  ArrowLeftIcon,
  ChatCircleTextIcon,
  ClockCounterClockwiseIcon,
  CloudOffIcon,
  PlusIcon,
  SpinnerIcon,
} from "@/components/ui/icons"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { MessageScrollerProvider } from "@/components/ui/message-scroller"
import { useOnlineOnly } from "@/lib/offline/use-online-only"

import { ChatComposer } from "@/features/assistant/components/chat-composer"
import { ChatMessageList } from "@/features/assistant/components/chat-message-list"
import { ConversationList } from "@/features/assistant/components/conversation-list"
import { useAsistente } from "@/features/assistant/hooks/use-asistente"
import { sugerenciasPara } from "@/features/assistant/lib/sugerencias"

const SIN_CONEXION = "El asistente necesita conexión a internet."

export function AssistantSheet() {
  const asistente = useAsistente()
  const online = useOnlineOnly(SIN_CONEXION)
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const [vista, setVista] = useState<"chat" | "historial">("chat")

  return (
    <Sheet
      onOpenChange={(abierto) => {
        if (abierto && !online.disabled) asistente.restaurar()
      }}
    >
      <MessageScrollerProvider>
        <SheetTrigger render={<Button variant="outline" size="icon" color="muted" className="bg-background" />}>
          <ChatCircleTextIcon />
          <span className="sr-only">Abrir asistente</span>
        </SheetTrigger>
        <SheetContent side="right" className="flex w-full flex-col gap-0 sm:max-w-md">
          <SheetHeader className="border-b">
            <div className="flex items-center gap-1 pr-8">
              {vista === "historial" && (
                <Button variant="ghost" color="neutral" size="icon-sm" onClick={() => setVista("chat")}>
                  <ArrowLeftIcon />
                  <span className="sr-only">Volver al chat</span>
                </Button>
              )}
              <SheetTitle className="flex-1">{vista === "chat" ? "Asistente" : "Conversaciones"}</SheetTitle>
              {vista === "chat" && (
                <>
                  <Button
                    variant="ghost"
                    color="neutral"
                    size="icon-sm"
                    title="Historial"
                    disabled={online.disabled}
                    onClick={() => setVista("historial")}
                  >
                    <ClockCounterClockwiseIcon />
                    <span className="sr-only">Ver conversaciones</span>
                  </Button>
                  <Button
                    variant="ghost"
                    color="neutral"
                    size="icon-sm"
                    title="Nueva conversación"
                    disabled={asistente.mensajes.length === 0 && !asistente.conversacionId}
                    onClick={asistente.nuevaConversacion}
                  >
                    <PlusIcon />
                    <span className="sr-only">Nueva conversación</span>
                  </Button>
                </>
              )}
            </div>
            <SheetDescription className="sr-only">
              Asistente de Colombia Evaluadora: consulta información y prepara cambios que tú confirmas.
            </SheetDescription>
          </SheetHeader>

          {online.disabled && (
            <p className="flex items-center gap-2 border-b bg-yellow-22 px-6 py-2 text-sm" role="status">
              <CloudOffIcon className="size-4 shrink-0" />
              {SIN_CONEXION}
            </p>
          )}

          {vista === "historial" ? (
            <ConversationList
              activa={asistente.conversacionId}
              bloqueado={online.disabled}
              onAbrir={(id) => {
                setVista("chat")
                void asistente.cargarConversacion(id)
              }}
              onArchivada={(id) => {
                if (id === asistente.conversacionId) asistente.nuevaConversacion()
              }}
            />
          ) : asistente.cargandoHistorial ? (
            <div className="flex flex-1 items-center justify-center text-muted-foreground">
              <SpinnerIcon className="size-5 animate-spin" />
            </div>
          ) : (
            <>
              {asistente.errorHistorial && (
                <p className="px-6 pt-3 text-sm text-red">{asistente.errorHistorial}</p>
              )}
              <ChatMessageList
                mensajes={asistente.mensajes}
                enviando={asistente.enviando}
                estado={asistente.estado}
                bloqueado={online.disabled}
                sugerencias={sugerenciasPara(pathname)}
                onEnviar={(texto) => void asistente.enviar(texto)}
                onConfirmar={(m) => void asistente.confirmar(m)}
                onCancelar={(m) => void asistente.cancelar(m)}
                onReintentar={asistente.reintentar}
              />
              <ChatComposer
                onSend={(texto) => void asistente.enviar(texto)}
                onStop={asistente.detener}
                enviando={asistente.enviando}
                disabled={online.disabled}
                placeholder={online.disabled ? "Sin conexión" : undefined}
              />
            </>
          )}
        </SheetContent>
      </MessageScrollerProvider>
    </Sheet>
  )
}
