import { ChatCircleTextIcon } from "@/components/ui/icons"

import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { MessageScrollerProvider } from "@/components/ui/message-scroller"

import { useAssistantChat } from "@/features/assistant/hooks/use-assistant-chat"
import { ChatComposer } from "@/features/assistant/components/chat-composer"
import { ChatMessageList } from "@/features/assistant/components/chat-message-list"

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
            <SheetTitle>Asistente</SheetTitle>
          </SheetHeader>
          <ChatMessageList messages={messages} isLoading={isLoading} />
          {error && <p className="px-6 text-sm text-red">No se pudo obtener respuesta.</p>}
          <ChatComposer onSend={sendMessage} disabled={isLoading} />
        </SheetContent>
      </MessageScrollerProvider>
    </Sheet>
  )
}
