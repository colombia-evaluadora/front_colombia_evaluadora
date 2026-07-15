import type { UIMessage } from "@tanstack/ai-react"

import { Message, MessageContent, MessageGroup } from "@/components/ui/message"
import {
  MessageScroller,
  MessageScrollerContent,
  MessageScrollerItem,
  MessageScrollerProvider,
  MessageScrollerViewport,
} from "@/components/ui/message-scroller"
import { Spinner } from "@/components/ui/spinner"

function messageText(message: UIMessage): string {
  return message.parts
    .filter((part) => part.type === "text")
    .map((part) => part.content)
    .join("")
}

interface ChatMessageListProps {
  messages: UIMessage[]
  isLoading: boolean
}

export function ChatMessageList({ messages, isLoading }: ChatMessageListProps) {
  return (
    <MessageScrollerProvider>
      <MessageScroller className="flex-1 px-6">
        <MessageScrollerViewport>
          <MessageScrollerContent>
            <MessageGroup>
              {messages.map((message) =>
                message.role === "user" ? (
                  <MessageScrollerItem key={message.id}>
                    <Message align="end" className="max-w-[85%]">
                      <MessageContent className="rounded-2xl bg-muted px-4 py-2.5">
                        {messageText(message)}
                      </MessageContent>
                    </Message>
                  </MessageScrollerItem>
                ) : (
                  <MessageScrollerItem key={message.id}>
                    <Message align="start" className="max-w-none">
                      <MessageContent className="leading-relaxed">
                        {messageText(message)}
                      </MessageContent>
                    </Message>
                  </MessageScrollerItem>
                )
              )}
              {isLoading && (
                <MessageScrollerItem>
                  <Message align="start" className="max-w-none">
                    <MessageContent>
                      <Spinner />
                    </MessageContent>
                  </Message>
                </MessageScrollerItem>
              )}
            </MessageGroup>
          </MessageScrollerContent>
        </MessageScrollerViewport>
      </MessageScroller>
    </MessageScrollerProvider>
  )
}
