# Assistant chat sheet (mocked TanStack AI)

## Goal

Add a chatbot UI, opened from a header button, styled with existing shadcn
message components. No real backend: responses are simulated with
`@shadcn/helpers/tanstack-ai` + `@tanstack/ai-react`, standing in for a future
Spring AI endpoint. This lets the frontend chat UI be built and demoed before
the real backend exists.

## Dependencies

- `@tanstack/ai-react` (`^0.16.4`) — provides `useChat`.
- `@shadcn/helpers` (`^0.1.0`) — provides `createChat` (subpath
  `@shadcn/helpers/tanstack-ai`).
- Peers `@tanstack/ai-client` / `@tanstack/ai` resolve transitively through
  `@tanstack/ai-react`. The `ai` (Vercel AI SDK) peer of `@shadcn/helpers` is
  for its `ai-sdk` subpath, which this feature does not use, and is left
  unmet (pnpm will warn, not fail).

## File structure

```
src/features/assistant/
  lib/
    mock-chat.ts            # createChat() singleton + transport()
  hooks/
    use-assistant-chat.ts   # wraps useChat with the mock connection
  components/
    assistant-trigger-button.tsx
    assistant-sheet.tsx
    chat-message-list.tsx
    chat-composer.tsx
```

## Mock script (`lib/mock-chat.ts`)

```ts
import { createChat } from "@shadcn/helpers/tanstack-ai"

export const assistantChat = createChat().assistant(
  "¡Hola! Soy el asistente de Colombia Evaluadora. Esta es una demo: " +
    "puedo responder con mensajes de ejemplo mientras conectamos un " +
    "modelo real."
)

export const assistantConnection = assistantChat.transport({
  fallback:
    "Esta es una demo sin modelo conectado todavía, así que no puedo " +
    "responder a mensajes libres por ahora.",
})
```

- `assistantChat` and `assistantConnection` are module-level singletons (not
  recreated per render); the script itself is stateless and pure, so sharing
  it across every mount of the sheet is safe.
- Because the fallback is unconditional, every free-text `sendMessage()` call
  streams the same canned reply — no scripted second turn is needed.

## `use-assistant-chat.ts`

```ts
import { useChat } from "@tanstack/ai-react"
import { assistantChat, assistantConnection } from "../lib/mock-chat"

export function useAssistantChat() {
  return useChat({
    initialMessages: assistantChat.get(1), // the canned greeting
    connection: assistantConnection,
  })
}
```

Returns `{ messages, sendMessage, isLoading, error, stop }` (subset of
`useChat`'s return actually used by the components below).

## Components

**`assistant-trigger-button.tsx`** — icon `Button` (`ChatCircleIcon` or
similar from `@phosphor-icons/react`, matching the style of `ModeToggle`),
wrapped in `SheetTrigger`. Rendered inside `assistant-sheet.tsx` so the
header only imports one component.

**`assistant-sheet.tsx`** — owns the `Sheet` open state (uncontrolled) and
calls `useAssistantChat()` once at the top so the trigger, message list, and
composer share the same chat instance. `SheetContent` uses a flex-col layout
(`flex h-full flex-col`) so the message list scrolls and the composer stays
pinned to the bottom:

```tsx
<Sheet>
  <AssistantTriggerButton />
  <SheetContent side="right" className="flex w-full flex-col sm:max-w-md">
    <SheetHeader>
      <SheetTitle>Asistente</SheetTitle>
    </SheetHeader>
    <ChatMessageList messages={messages} isLoading={isLoading} />
    <ChatComposer onSend={sendMessage} disabled={isLoading} />
  </SheetContent>
</Sheet>
```

**`chat-message-list.tsx`** — `MessageScrollerProvider` > `MessageScroller` >
`MessageScrollerViewport` > `MessageScrollerContent`, one
`MessageScrollerItem` per message. Each renders `Message` with
`align={message.role === "user" ? "end" : "start"}`, `MessageAvatar` (only
for assistant messages — "AI" initials), and `MessageContent` with the
message's joined text parts. While `isLoading`, an extra assistant `Message`
row renders a `Spinner` in place of content (typing indicator).

**`chat-composer.tsx`** — `InputGroup` with an `Input` (controlled local
`useState` for the draft text) and a send `Button` (icon, disabled when the
draft is empty or `disabled` is true). Enter submits; Shift+Enter is not
handled specially since this is a single-line input. On submit: call
`onSend(draft)`, clear the draft.

## Error handling

`useChat`'s `error` is surfaced as a small inline note under the message list
("No se pudo obtener respuesta.") — the mock's fallback path means this
should not trigger in normal use, but the hook always exposes `error`, so we
render it rather than silently swallowing it.

## Integration point

`protected-layout.tsx` renders `<AssistantSheet />` in the header's right-hand
button group, before `ModeToggle`/`ColorThemeToggle`.

## Out of scope (explicitly deferred)

- Persisting chat history across sheet close/reopen.
- Tool calls / reasoning display.
- Real network transport (`fetchServerSentEvents`) — this spec is mock-only;
  swapping in the real Spring AI backend is a separate future change that
  only touches `lib/mock-chat.ts` / `use-assistant-chat.ts`.

## Manual verification

- Open the sheet from the header button; the canned greeting appears
  immediately, right-aligned user bubble vs. left-aligned assistant bubble
  with avatar.
- Type a message and send it: user bubble appears, then the fallback text
  streams in word-by-word with a typing indicator beforehand.
- Resize the window / open on a narrow viewport: sheet remains usable
  (`sm:max-w-md`), composer stays pinned to the bottom, message list scrolls
  independently.
- Close and reopen the sheet: conversation resets to just the greeting
  (expected per the "out of scope" note above).
