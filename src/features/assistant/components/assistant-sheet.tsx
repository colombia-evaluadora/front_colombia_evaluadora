import { ChatCircleTextIcon, ClockIcon } from "@/components/ui/icons"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { MessageScrollerProvider } from "@/components/ui/message-scroller"

import { useAssistantChat } from "@/features/assistant/hooks/use-assistant-chat"
import { ChatComposer } from "@/features/assistant/components/chat-composer"
import { ChatMessageList } from "@/features/assistant/components/chat-message-list"
import { ASSISTANT_DISPONIBLE } from "@/features/assistant/lib/availability"

export function AssistantSheet() {
  const { messages, sendMessage, isLoading, error } = useAssistantChat()

  return (
    <Sheet>
      <MessageScrollerProvider>
        <SheetTrigger render={<Button variant="outline" size="icon" color="muted" className="bg-background" />}>
          <ChatCircleTextIcon />
          <span className="sr-only">Abrir asistente</span>
        </SheetTrigger>
        <SheetContent side="right" className="flex w-full flex-col sm:max-w-md">
          <SheetHeader className="border-b">
            <div className="flex items-center gap-2">
              <SheetTitle>Asistente</SheetTitle>
              {!ASSISTANT_DISPONIBLE && (
                <Badge variant="soft" color="info">
                  <ClockIcon data-icon="inline-start" />
                  Próximamente
                </Badge>
              )}
            </div>
          </SheetHeader>
          <ChatMessageList messages={messages} isLoading={isLoading} />
          {error && <p className="px-6 text-sm text-red">No se pudo obtener respuesta.</p>}
          <ChatComposer
            onSend={sendMessage}
            disabled={isLoading || !ASSISTANT_DISPONIBLE}
            placeholder={ASSISTANT_DISPONIBLE ? undefined : "Próximamente"}
          />
        </SheetContent>
      </MessageScrollerProvider>
    </Sheet>
  )
}
