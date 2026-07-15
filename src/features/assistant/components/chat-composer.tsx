import { useRef, useState } from "react"
import { useForm } from "@tanstack/react-form"
import { PaperclipIcon, PaperPlaneTiltIcon, XIcon } from "@phosphor-icons/react"

import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
  InputGroupText,
} from "@/components/ui/input-group"

interface ChatComposerProps {
  onSend: (text: string) => void
  disabled: boolean
}

export function ChatComposer({ onSend, disabled }: ChatComposerProps) {
  const [attachedFile, setAttachedFile] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const form = useForm({
    defaultValues: { message: "" },
    onSubmit: ({ value }) => {
      const text = value.message.trim()
      if (!text || disabled) {
        return
      }
      onSend(text)
      form.reset()
      clearAttachedFile()
    },
  })

  function clearAttachedFile() {
    setAttachedFile(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault()
        form.handleSubmit()
      }}
      className="border-t p-4"
    >
      <InputGroup>
        <form.Field name="message">
          {(field) => (
            <InputGroupInput
              value={field.state.value}
              onChange={(event) => field.handleChange(event.target.value)}
              placeholder="Escribe un mensaje..."
              disabled={disabled}
              aria-label="Mensaje para el asistente"
            />
          )}
        </form.Field>
        <InputGroupAddon align="block-end">
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            onChange={(event) =>
              setAttachedFile(event.target.files?.[0] ?? null)
            }
          />
          <InputGroupButton
            type="button"
            variant="ghost"
            size="icon-sm"
            disabled={disabled}
            onClick={() => fileInputRef.current?.click()}
            aria-label="Adjuntar archivo"
          >
            <PaperclipIcon />
          </InputGroupButton>
          {attachedFile && (
            <>
              <InputGroupText className="max-w-32 truncate">
                {attachedFile.name}
              </InputGroupText>
              <InputGroupButton
                type="button"
                variant="ghost"
                size="icon-xs"
                onClick={clearAttachedFile}
                aria-label="Quitar archivo adjunto"
              >
                <XIcon />
              </InputGroupButton>
            </>
          )}
          <InputGroupButton
            type="submit"
            size="icon-sm"
            variant="default"
            className="ml-auto"
            disabled={disabled}
            aria-label="Enviar mensaje"
          >
            <PaperPlaneTiltIcon />
          </InputGroupButton>
        </InputGroupAddon>
      </InputGroup>
    </form>
  )
}
