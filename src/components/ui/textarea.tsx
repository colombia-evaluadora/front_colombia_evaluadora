import * as React from "react"

import { cn } from "@/lib/utils"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        // `text-sm` fijo, igual que `inputVariants` — ver la nota en input.tsx.
        "flex field-sizing-content min-h-16 w-full resize-none rounded-none border border-transparent border-b-input bg-transparent px-0 py-3 text-sm transition-[color,border-color] outline-none placeholder:text-muted-foreground focus-visible:border-b-ring disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-b-red dark:aria-invalid:border-b-red/50",
        className,
      )}
      {...props}
    />
  )
}

/** `Textarea` no hereda la variante `outlined` del `Field` (sí lo hace
 *  `Input`, que la toma del contexto): estas clases —copiadas de
 *  `inputVariants({variant: "outlined"})`— la igualan a mano. */
const TEXTAREA_OUTLINED =
  "rounded-md border border-input px-3 py-2 hover:border-ring focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/20 aria-invalid:border-red aria-invalid:focus-visible:border-red aria-invalid:focus-visible:ring-red/20"

export { Textarea, TEXTAREA_OUTLINED }
