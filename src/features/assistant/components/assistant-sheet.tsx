import { useRef, useState } from "react"
import { useRouterState } from "@tanstack/react-router"

import {
  ArrowLeftIcon,
  ChatCircleTextIcon,
  ClockCounterClockwiseIcon,
  CloudOffIcon,
  PlusIcon,
  SpinnerIcon,
  XIcon,
} from "@/components/ui/icons"
import { Button } from "@/components/ui/button"
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { MessageScrollerProvider } from "@/components/ui/message-scroller"
import { useOnlineOnly } from "@/lib/offline/use-online-only"

import { ChatComposer } from "@/features/assistant/components/chat-composer"
import { ChatMessageList } from "@/features/assistant/components/chat-message-list"
import { ConversationList } from "@/features/assistant/components/conversation-list"
import { useAsistente } from "@/features/assistant/hooks/use-asistente"
import { useSugerenciasQuery } from "@/features/assistant/api/queries"
import { elegirSugerencias } from "@/features/assistant/lib/sugerencias"
import { useMenuPermission } from "@/features/navigation/api/use-menu-permission"

const SIN_CONEXION = "El asistente necesita conexión a internet."

/** Menú del asistente: ver lo muestra; crear/editar permite acciones. */
export const MENU_ASISTENTE = "ASISTENTE"

export function AssistantSheet() {
  const permiso = useMenuPermission(MENU_ASISTENTE)
  // Mientras carga, todo denegado.
  if (!permiso.puedeVer) return null
  return <AssistantSheetContenido puedeAccionar={permiso.puedeCrear || permiso.puedeEditar} />
}

function AssistantSheetContenido({ puedeAccionar }: { puedeAccionar: boolean }) {
  const asistente = useAsistente({ puedeAccionar })
  const online = useOnlineOnly(SIN_CONEXION)
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const [vista, setVista] = useState<"chat" | "historial">("chat")
  const [abierto, setAbierto] = useState(false)
  const mensajeRef = useRef<HTMLTextAreaElement>(null)
  const sugerenciasQuery = useSugerenciasQuery(pathname, { enabled: abierto && !online.disabled })
  const sugerencias = elegirSugerencias(sugerenciasQuery.data?.sugerencias, pathname)

  return (
    <Sheet
      onOpenChange={(siguiente) => {
        setAbierto(siguiente)
        if (siguiente && !online.disabled) asistente.restaurar()
      }}
    >
      <MessageScrollerProvider>
        <SheetTrigger render={<Button variant="outline" size="icon" color="muted" className="bg-background" />}>
          <ChatCircleTextIcon />
          <span className="sr-only">Abrir asistente</span>
        </SheetTrigger>
        {/* Foco inicial en el mensaje. */}
        <SheetContent
          side="right"
          className="flex w-full flex-col gap-0 sm:max-w-md"
          initialFocus={mensajeRef}
          showCloseButton={false}
        >
          <SheetHeader className="border-b px-4 py-3">
            <div className="flex h-8 items-center gap-2">
              {vista === "historial" && (
                <Button variant="ghost" color="neutral" size="icon-sm" onClick={() => setVista("chat")}>
                  <ArrowLeftIcon />
                  <span className="sr-only">Volver al chat</span>
                </Button>
              )}
              <SheetTitle className="flex-1 truncate text-base">
                {vista === "chat" ? "Asistente" : "Conversaciones"}
              </SheetTitle>
              {vista === "chat" && (
                <>
                  <Button
                    variant="ghost"
                    color="neutral"
                    size="icon-sm"
                    title="Conversaciones anteriores"
                    disabled={online.disabled}
                    onClick={() => setVista("historial")}
                  >
                    <ClockCounterClockwiseIcon />
                    <span className="sr-only">Ver conversaciones anteriores</span>
                  </Button>
                  <Button
                    variant="outline"
                    color="neutral"
                    size="xs"
                    disabled={asistente.mensajes.length === 0 && !asistente.conversacionId}
                    onClick={asistente.nuevaConversacion}
                  >
                    <PlusIcon data-icon="inline-start" />
                    Nueva
                  </Button>
                </>
              )}
              {/* X en la fila: la del Sheet va absoluta. */}
              <SheetClose render={<Button variant="ghost" color="neutral" size="icon-sm" />}>
                <XIcon />
                <span className="sr-only">Cerrar asistente</span>
              </SheetClose>
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
                herramientas={asistente.herramientas}
                puedeAccionar={puedeAccionar}
                bloqueado={online.disabled}
                sugerencias={sugerencias}
                onEnviar={(texto) => void asistente.enviar(texto)}
                onConfirmar={(m) => void asistente.confirmar(m)}
                onCancelar={(m) => void asistente.cancelar(m)}
                onReintentar={asistente.reintentar}
              />
              <ChatComposer
                onSend={(texto) => void asistente.enviar(texto)}
                onStop={asistente.detener}
                inputRef={mensajeRef}
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
