# Assistant Chat Sheet Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a chatbot Sheet, opened from a header button, backed by a fully mocked TanStack AI conversation (no network, no real model) that stands in for a future Spring AI backend.

**Architecture:** A small `src/features/assistant/` module: a module-level mock script (`createChat` from `@shadcn/helpers/tanstack-ai`) feeds a `useChat` hook (`@tanstack/ai-react`), rendered through the existing `Message`/`MessageScroller`/`Sheet` UI primitives. The header in `protected-layout.tsx` gets one new trigger button.

**Tech Stack:** React, TanStack AI (`@tanstack/ai-react`, `@shadcn/helpers`), existing shadcn-style primitives in `src/components/ui/`, pnpm.

**Note on testing:** This codebase has no component/unit test harness (vitest is installed but there is no `test` script and zero `*.test.*` files anywhere in `src/`). Following that existing convention, verification for this plan is TypeScript compilation (`pnpm exec tsc -p tsconfig.app.json`) after each task plus a single end-to-end manual pass through the running app in the last task, rather than automated tests.

---

### Task 1: Install TanStack AI dependencies

**Files:**
- Modify: `package.json`
- Modify: `pnpm-lock.yaml`

- [ ] **Step 1: Install the packages**

Run: `pnpm add @tanstack/ai-react@^0.16.4 @shadcn/helpers@^0.1.0`

Expected: `package.json`'s `dependencies` gains `@tanstack/ai-react` and `@shadcn/helpers`; `pnpm-lock.yaml` updates. pnpm may print a peer-dependency warning about the unmet `ai` peer of `@shadcn/helpers` (from its unused `ai-sdk` export) — that warning is expected and safe to ignore, it does not fail the install.

- [ ] **Step 2: Verify the install resolved correctly**

Run: `pnpm exec node -e "require.resolve('@shadcn/helpers/tanstack-ai'); require.resolve('@tanstack/ai-react'); console.log('ok')"`
Expected: prints `ok` with no error.

- [ ] **Step 3: Commit**

```bash
git add package.json pnpm-lock.yaml
git commit -m "chore: add tanstack ai react and shadcn helpers dependencies"
```

---

### Task 2: Mock chat script

**Files:**
- Create: `src/features/assistant/lib/mock-chat.ts`

- [ ] **Step 1: Write the mock chat module**

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

- [ ] **Step 2: Typecheck**

Run: `pnpm exec tsc -p tsconfig.app.json`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/features/assistant/lib/mock-chat.ts
git commit -m "feat(assistant): add mocked tanstack ai chat script"
```

---

### Task 3: `useAssistantChat` hook

**Files:**
- Create: `src/features/assistant/hooks/use-assistant-chat.ts`

- [ ] **Step 1: Write the hook**

```ts
import { useChat } from "@tanstack/ai-react"

import { assistantChat, assistantConnection } from "../lib/mock-chat"

export function useAssistantChat() {
  return useChat({
    initialMessages: assistantChat.get(1),
    connection: assistantConnection,
  })
}
```

- [ ] **Step 2: Typecheck**

Run: `pnpm exec tsc -p tsconfig.app.json`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/features/assistant/hooks/use-assistant-chat.ts
git commit -m "feat(assistant): add useAssistantChat hook"
```

---

### Task 4: Message list component

**Files:**
- Create: `src/features/assistant/components/chat-message-list.tsx`

**Context:** `UIMessage` (from `@tanstack/ai-client`, re-exported through `@tanstack/ai-react`) has shape `{ id: string; role: 'system' | 'user' | 'assistant'; parts: MessagePart[] }`. Text parts have shape `{ type: 'text'; content: string }`. Only `text` parts are rendered — this feature does not use reasoning or tool-call parts (out of scope per the design spec).

- [ ] **Step 1: Write the component**

```tsx
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
```

- [ ] **Step 2: Typecheck**

Run: `pnpm exec tsc -p tsconfig.app.json`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/features/assistant/components/chat-message-list.tsx
git commit -m "feat(assistant): add chat message list component"
```

---

### Task 5: Chat composer component

**Files:**
- Create: `src/features/assistant/components/chat-composer.tsx`

- [ ] **Step 1: Write the component**

```tsx
import { useState, type FormEvent } from "react"
import { PaperPlaneTiltIcon } from "@phosphor-icons/react"

import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group"

interface ChatComposerProps {
  onSend: (text: string) => void
  disabled: boolean
}

export function ChatComposer({ onSend, disabled }: ChatComposerProps) {
  const [draft, setDraft] = useState("")

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const text = draft.trim()
    if (!text || disabled) {
      return
    }
    onSend(text)
    setDraft("")
  }

  return (
    <form onSubmit={handleSubmit} className="border-t p-4">
      <InputGroup>
        <InputGroupInput
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="Escribe un mensaje..."
          disabled={disabled}
          aria-label="Mensaje para el asistente"
        />
        <InputGroupAddon align="inline-end">
          <InputGroupButton
            type="submit"
            size="icon-sm"
            disabled={disabled || draft.trim().length === 0}
            aria-label="Enviar mensaje"
          >
            <PaperPlaneTiltIcon />
          </InputGroupButton>
        </InputGroupAddon>
      </InputGroup>
    </form>
  )
}
```

- [ ] **Step 2: Typecheck**

Run: `pnpm exec tsc -p tsconfig.app.json`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/features/assistant/components/chat-composer.tsx
git commit -m "feat(assistant): add chat composer component"
```

---

### Task 6: Trigger button and Sheet

**Files:**
- Create: `src/features/assistant/components/assistant-trigger-button.tsx`
- Create: `src/features/assistant/components/assistant-sheet.tsx`

- [ ] **Step 1: Write the trigger button**

```tsx
import { ChatCircleTextIcon } from "@phosphor-icons/react"

import { Button } from "@/components/ui/button"
import { SheetTrigger } from "@/components/ui/sheet"

export function AssistantTriggerButton() {
  return (
    <SheetTrigger render={<Button variant="outline" size="icon" />}>
      <ChatCircleTextIcon />
      <span className="sr-only">Abrir asistente</span>
    </SheetTrigger>
  )
}
```

- [ ] **Step 2: Write the sheet**

```tsx
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"

import { useAssistantChat } from "../hooks/use-assistant-chat"
import { AssistantTriggerButton } from "./assistant-trigger-button"
import { ChatComposer } from "./chat-composer"
import { ChatMessageList } from "./chat-message-list"

export function AssistantSheet() {
  const { messages, sendMessage, isLoading, error } = useAssistantChat()

  return (
    <Sheet>
      <AssistantTriggerButton />
      <SheetContent side="right" className="flex w-full flex-col sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Asistente</SheetTitle>
        </SheetHeader>
        <ChatMessageList messages={messages} isLoading={isLoading} />
        {error && (
          <p className="px-6 text-sm text-destructive">
            No se pudo obtener respuesta.
          </p>
        )}
        <ChatComposer onSend={sendMessage} disabled={isLoading} />
      </SheetContent>
    </Sheet>
  )
}
```

- [ ] **Step 3: Typecheck**

Run: `pnpm exec tsc -p tsconfig.app.json`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/features/assistant/components/assistant-trigger-button.tsx src/features/assistant/components/assistant-sheet.tsx
git commit -m "feat(assistant): add assistant trigger button and sheet"
```

---

### Task 7: Wire the sheet into the header

**Files:**
- Modify: `src/components/layout/protected-layout.tsx`

**Context:** current header (lines 1-37) renders `ModeToggle` and `ColorThemeToggle` in a `div.flex.gap-2` on the right side of the header. Add `AssistantSheet` as the first item in that group.

- [ ] **Step 1: Add the import**

In `src/components/layout/protected-layout.tsx`, add near the other local imports (after the `AppSidebar` import):

```tsx
import { AssistantSheet } from "@/features/assistant/components/assistant-sheet"
```

- [ ] **Step 2: Render it in the header**

Change:

```tsx
             <div className="flex gap-2">
          <ModeToggle />
          <ColorThemeToggle />
        </div>  
```

to:

```tsx
        <div className="flex gap-2">
          <AssistantSheet />
          <ModeToggle />
          <ColorThemeToggle />
        </div>
```

(This also fixes the pre-existing inconsistent indentation on those lines.)

- [ ] **Step 3: Typecheck**

Run: `pnpm exec tsc -p tsconfig.app.json`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/layout/protected-layout.tsx
git commit -m "feat(assistant): render assistant sheet trigger in header"
```

---

### Task 8: Manual end-to-end verification

**Files:** none (verification only)

- [ ] **Step 1: Start the dev server**

Run: `pnpm dev`
Expected: Vite starts without errors; note the local URL it prints.

- [ ] **Step 2: Open the app and log in to reach a protected route**

Navigate to the printed URL in a browser, sign in with the mock auth flow already in the app, and land on any protected page (e.g. Pagos).

- [ ] **Step 3: Open the assistant sheet**

Click the new chat-bubble icon button in the header (left of the theme toggles).
Expected: a right-side sheet titled "Asistente" opens; the canned greeting ("¡Hola! Soy el asistente...") appears immediately in a left-aligned bubble with an "IA" avatar.

- [ ] **Step 4: Send a free-text message**

Type any text (e.g. "hola") and submit.
Expected: your message appears right-aligned with no avatar; a left-aligned typing indicator (spinner) appears briefly, then is replaced by the fallback text streaming in word-by-word ("Esta es una demo sin modelo conectado todavía...").

- [ ] **Step 5: Check narrow-viewport behavior**

Resize the browser window to a narrow width (e.g. ~375px) with the sheet open.
Expected: the sheet stays usable and does not overflow; the composer stays pinned to the bottom; the message list scrolls independently if content overflows vertically.

- [ ] **Step 6: Check close/reopen reset**

Close the sheet (X button or clicking outside) and reopen it.
Expected: the conversation resets to just the canned greeting (documented as out-of-scope-for-persistence behavior in the design spec).

- [ ] **Step 7: Run the full typecheck once more**

Run: `pnpm exec tsc -p tsconfig.app.json`
Expected: no errors.

- [ ] **Step 8: Commit if any fixes were needed during manual verification**

If steps 1-6 required code changes, stage and commit them with a message describing the fix. If no changes were needed, skip this step — there is nothing to commit.

---

## Spec coverage check

- Dependencies (`@tanstack/ai-react`, `@shadcn/helpers`) → Task 1.
- `lib/mock-chat.ts` singleton script + fallback → Task 2.
- `hooks/use-assistant-chat.ts` → Task 3.
- `chat-message-list.tsx` (bubbles, avatar, typing indicator) → Task 4.
- `chat-composer.tsx` (input + send, disabled while loading) → Task 5.
- `assistant-trigger-button.tsx` + `assistant-sheet.tsx` (flex-col layout, error surfaced) → Task 6.
- Header integration in `protected-layout.tsx` → Task 7.
- Manual verification checklist from the spec (greeting on open, send/fallback, narrow viewport, reset on reopen) → Task 8.
