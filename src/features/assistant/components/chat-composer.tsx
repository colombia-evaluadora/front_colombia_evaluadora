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
