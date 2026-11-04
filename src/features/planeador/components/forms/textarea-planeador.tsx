import type { ChangeEvent, ComponentProps } from "react"

import { Textarea as TextareaBase } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"

/**
 * Quita los saltos y espacios del inicio y deja como máximo una línea en blanco
 * seguida. Sin esto, un campo se podía llenar solo de Enter: pasaba por texto
 * escrito, consumía el límite de caracteres y estiraba el formulario.
 */
export function normalizarSaltosDeLinea(value: string): string {
  return value.replace(/^\s+/, "").replace(/(?:\r?\n[ \t]*){3,}/g, "\n\n")
}

/** `Textarea` de planeador: normaliza los saltos y deja de crecer al llegar a `max-h-48` (luego hace scroll). */
export function Textarea({ className, onChange, ...props }: ComponentProps<typeof TextareaBase>) {
  const handleChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
    const { target } = event
    const limpio = normalizarSaltosDeLinea(target.value)
    if (limpio !== target.value) {
      // Asignar `value` manda el cursor al final: se restaura descontando lo eliminado.
      const cursor = Math.max(0, target.selectionStart - (target.value.length - limpio.length))
      target.value = limpio
      target.setSelectionRange(cursor, cursor)
    }
    onChange?.(event)
  }

  return <TextareaBase className={cn("max-h-48 overflow-y-auto", className)} onChange={handleChange} {...props} />
}
