import * as React from "react"
import { ChatCircleDotsIcon } from "@/components/ui/icons"
import type { UIMessage } from "@tanstack/ai-react"

import { cn } from "@/lib/utils"
import { Bubble, BubbleContent } from "@/components/ui/bubble"
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { Message, MessageContent } from "@/components/ui/message"
import {
  MessageScroller,
  MessageScrollerButton,
  MessageScrollerContent,
  MessageScrollerItem,
  MessageScrollerViewport,
} from "@/components/ui/message-scroller"

import { StreamingText } from "./streaming-text"

interface ChatMessageListProps {
  messages: UIMessage[]
  isLoading: boolean
}

function getMessageText(message: UIMessage) {
  return message.parts
    .filter((part) => part.type === "text")
    .map((part) => part.content)
    .join("")
}

export function ChatMessageList({ messages, isLoading }: ChatMessageListProps) {
  const seenIds = React.useRef<Set<string> | null>(null)

  if (seenIds.current === null) {
    seenIds.current = new Set(messages.map((message) => message.id))
  }

  React.useEffect(() => {
    const seen = seenIds.current!
    for (const message of messages) {
      seen.add(message.id)
    }
  })

  if (messages.length === 0) {
    return (
      <Empty className="flex-1">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <ChatCircleDotsIcon />
          </EmptyMedia>
          <EmptyTitle>Asistente</EmptyTitle>
          <EmptyDescription>Escribe un mensaje para comenzar la conversación.</EmptyDescription>
        </EmptyHeader>
      </Empty>
    )
  }

  return (
    <MessageScroller>
      <MessageScrollerViewport>
        <MessageScrollerContent aria-busy={isLoading} className="px-6 py-3 flex flex-col gap-4">
          {messages.map((message) => {
            const isUser = message.role === "user"
            const isNew = !seenIds.current!.has(message.id)
            const text = getMessageText(message)

            return (
              <MessageScrollerItem
                key={message.id}
                messageId={message.id}
                scrollAnchor={isUser}
                className={cn(
                  isNew &&
                    "animate-in fade-in slide-in-from-bottom-2 duration-300 motion-reduce:animate-none",
                )}
              >
                <Message align={isUser ? "end" : "start"}>
                  <MessageContent>
                    <Bubble align={isUser ? "end" : "start"} variant={isUser ? "default" : "muted"}>
                      <BubbleContent>
                        {!isUser && isNew ? <StreamingText text={text} /> : text}
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
