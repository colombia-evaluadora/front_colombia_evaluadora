import { useRef } from "react"
import { useForm } from "@tanstack/react-form"
import {
  ArrowUpIcon,
  PaperclipIcon,
  PlusIcon,
} from "@phosphor-icons/react"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupTextarea,
} from "@/components/ui/input-group"

interface ChatComposerProps {
  onSend: (text: string) => void
  disabled: boolean
}

export function ChatComposer({ onSend, disabled }: ChatComposerProps) {
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
      <InputGroup className=" bg-muted px-2 py-1">
        <form.Field name="message">
          {(field) => (
            <InputGroupTextarea
              value={field.state.value}
              onChange={(event) => field.handleChange(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault()
                  form.handleSubmit()
                }
              }}
              placeholder="Escribe un mensaje..."
              disabled={disabled}
              rows={1}
              className="min-h-9 border-none bg-transparent px-2 py-1.5"
              aria-label="Mensaje para el asistente"
            />
          )}
        </form.Field>
        <InputGroupAddon align="block-end" className="pt-1">
          <DropdownMenu>
            <DropdownMenuTrigger render={<InputGroupButton aria-label="Add files" type="button" size="icon-sm" variant="outline"><PlusIcon /></InputGroupButton>} />
            <DropdownMenuContent
              align="start"
              side="top"
              className="w-44"
            >
              <DropdownMenuItem>
                <PaperclipIcon />
                Add Photos & Files
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <InputGroupButton
            type="submit"
            variant="fill"
            size="icon-sm"
            className="ml-auto"
          >
            <ArrowUpIcon />
            <span className="sr-only">Send</span>
          </InputGroupButton>
        </InputGroupAddon>
      </InputGroup>
    </form>
  )
}
