import { useState, type Ref } from "react"

import { ArrowUpIcon, StopIcon } from "@/components/ui/icons"
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupTextarea } from "@/components/ui/input-group"

// Tope del backend (`texto-max-caracteres`).
export const MAX_CARACTERES = 4000

interface ChatComposerProps {
  onSend: (text: string) => void
  onStop: () => void
  enviando: boolean
  disabled: boolean
  placeholder?: string
  inputRef?: Ref<HTMLTextAreaElement>
}

export function ChatComposer({
  onSend,
  onStop,
  enviando,
  disabled,
  placeholder = "Escribe un mensaje...",
  inputRef,
}: ChatComposerProps) {
  const [texto, setTexto] = useState("")
  const largo = texto.length > MAX_CARACTERES

  function enviar() {
    const limpio = texto.trim()
    if (!limpio || disabled || enviando || largo) return
    onSend(limpio)
    setTexto("")
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault()
        enviar()
      }}
      className="flex flex-col gap-1.5 px-4 pt-2 pb-3"
    >
      <InputGroup className="rounded-xl bg-background px-2 py-1 shadow-sm">
        <InputGroupTextarea
          ref={inputRef}
          value={texto}
          onChange={(event) => setTexto(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault()
              enviar()
            }
          }}
          placeholder={placeholder}
          disabled={disabled}
          rows={1}
          className="min-h-9 border-none bg-transparent px-2 py-1.5"
          aria-label="Mensaje para el asistente"
        />
        <InputGroupAddon align="block-end" className="pt-1">
          {largo && (
            <span className="text-xs text-red">
              {texto.length}/{MAX_CARACTERES}
            </span>
          )}
          {enviando ? (
            <InputGroupButton type="button" variant="fill" size="icon-sm" className="ml-auto" onClick={onStop}>
              <StopIcon />
              <span className="sr-only">Detener respuesta</span>
            </InputGroupButton>
          ) : (
            <InputGroupButton
              type="submit"
              variant="fill"
              size="icon-sm"
              className="ml-auto"
              disabled={disabled || largo || texto.trim() === ""}
            >
              <ArrowUpIcon />
              <span className="sr-only">Enviar</span>
            </InputGroupButton>
          )}
        </InputGroupAddon>
      </InputGroup>
      <p className="px-1 text-[11px] text-muted-foreground">
        Enter envía, Shift + Enter agrega una línea. Revisa las respuestas antes de usarlas.
      </p>
    </form>
  )
}
