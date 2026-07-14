import type { UIMessage } from "@tanstack/ai-react"

import {
  Message,
  MessageAvatar,
  MessageContent,
  MessageGroup,
} from "@/components/ui/message"
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
              {messages.map((message) => (
                <MessageScrollerItem key={message.id}>
                  <Message
                    align={message.role === "user" ? "end" : "start"}
                    className="max-w-[85%]"
                  >
                    {message.role !== "user" && (
                      <MessageAvatar>IA</MessageAvatar>
                    )}
                    <MessageContent>{messageText(message)}</MessageContent>
                  </Message>
                </MessageScrollerItem>
              ))}
              {isLoading && (
                <MessageScrollerItem>
                  <Message align="start" className="max-w-[85%]">
                    <MessageAvatar>IA</MessageAvatar>
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
