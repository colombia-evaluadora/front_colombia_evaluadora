import { useState } from "react"

import { CaretDownIcon, CheckIcon, PlusIcon } from "@/components/ui/icons"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"

interface EspecialidadSelectProps {
  value: string
  options: string[]
  onChange: (value: string) => void
  onAddOption: (value: string) => void
}

export function EspecialidadSelect({
  value,
  options,
  onChange,
  onAddOption,
}: EspecialidadSelectProps) {
  const [open, setOpen] = useState(false)
  const [nuevo, setNuevo] = useState("")

  function agregar() {
    const nombre = nuevo.trim()
    if (!nombre) return
    onAddOption(nombre)
    onChange(nombre)
    setNuevo("")
    setOpen(false)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <button
            type="button"
            className={cn(
              "flex h-9 w-full items-center justify-between gap-1.5 rounded-none border border-transparent border-b-input bg-transparent px-0 py-1 text-left text-sm outline-none transition-[color,border-color] hover:border-b-ring/50 data-[popup-open]:border-b-ring",
              value ? "text-foreground" : "text-muted-foreground"
            )}
          />
        }
      >
        <span className="flex-1 truncate">{value || "Seleccionar"}</span>
        <CaretDownIcon className="size-3.5 shrink-0 text-muted-foreground" />
      </PopoverTrigger>
      <PopoverContent align="start" className="w-56 p-1">
        <div className="flex flex-col">
          {options.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => {
                onChange(option)
                setOpen(false)
              }}
              className="hover:bg-foreground/10 flex items-center justify-between gap-2 rounded-none px-2 py-1.5 text-left text-sm"
            >
              {option}
              {option === value && <CheckIcon className="size-4 shrink-0" />}
            </button>
          ))}

          <div className="mt-1 flex items-center gap-1 border-t pt-2">
            <Input
              value={nuevo}
              onChange={(e) => setNuevo(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault()
                  agregar()
                }
              }}
              placeholder="Nueva especialidad"
              className="h-8"
            />
            <Button
              type="button"
              color="primary"
              size="icon-sm"
              aria-label="Agregar especialidad"
              disabled={!nuevo.trim()}
              onClick={agregar}
            >
              <PlusIcon weight="bold" />
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
