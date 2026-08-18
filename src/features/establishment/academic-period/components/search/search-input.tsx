import { MagnifyingGlassIcon, XIcon } from "@/components/ui/icons"

import { cn } from "@/lib/utils"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group"

interface SearchInputProps {
  value: string
  onValueChange: (value: string) => void
  id?: string
  placeholder?: string
  label?: string
  className?: string
}

export function SearchInput({
  value,
  onValueChange,
  id,
  placeholder = "Buscar",
  label = "Buscar",
  className,
}: SearchInputProps) {
  return (
    <InputGroup
      className={cn(
        "h-9 w-full rounded-md border-input has-[[data-slot=input-group-control]:focus-visible]:border-ring has-[[data-slot=input-group-control]:focus-visible]:ring-2 has-[[data-slot=input-group-control]:focus-visible]:ring-ring/20 sm:w-72",
        className,
      )}
    >
      <InputGroupAddon align="inline-start" className="ml-2">
        <MagnifyingGlassIcon className="size-4 text-muted-foreground" />
      </InputGroupAddon>

      <InputGroupInput
        id={id}
        // `type="search"` en Chrome/Edge agrega su propia "x" de limpiar
        // nativa —con texto cargado quedaban dos, la del navegador y la de
        // abajo—. `text` deja una sola, la de este componente.
        type="text"
        autoComplete="off"
        placeholder={placeholder}
        aria-label={label}
        value={value}
        onChange={(e) => onValueChange(e.target.value)}
      />

      {value && (
        <InputGroupAddon align="inline-end" className="mr-1">
          <InputGroupButton
            size="icon-xs"
            aria-label="Limpiar búsqueda"
            className="text-muted-foreground hover:text-primary"
            onClick={() => onValueChange("")}
          >
            <XIcon />
          </InputGroupButton>
        </InputGroupAddon>
      )}
    </InputGroup>
  )
}
