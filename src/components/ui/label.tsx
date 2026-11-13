"use client"

import * as React from "react"

import { cn } from "@/lib/utils"

/**
 * Pinta en rojo el `*` de obligatorio al final del label, venga como sea:
 * en el mismo texto (`"Estudiantes*"`, `"Sede *"`) o como nodo aparte
 * (`{label}{required && "*"}`, lo que hacen los campos de `@/lib/forms`).
 *
 * El texto y el `*` se envuelven en un único `span`: el `label` es `flex` con
 * `gap-2`, y si el `*` quedara como hijo suelto se separaría 8px del texto.
 */
function marcarObligatorio(children: React.ReactNode): React.ReactNode {
  const hijos = React.Children.toArray(children)
  let i = hijos.length - 1
  while (i >= 0 && typeof hijos[i] === "string" && (hijos[i] as string).trim() === "") i--
  const ultimo = hijos[i]
  if (typeof ultimo !== "string" || !ultimo.trimEnd().endsWith("*")) return children

  // Texto contiguo anterior (p. ej. el `label` antes del `"*"` suelto).
  let j = i
  while (j > 0 && (typeof hijos[j - 1] === "string" || typeof hijos[j - 1] === "number")) j--
  const texto = hijos.slice(j, i).join("") + ultimo.trimEnd().slice(0, -1)

  return [
    ...hijos.slice(0, j),
    <span key="label-obligatorio">
      {texto}
      <span className="text-red">*</span>
    </span>,
    ...hijos.slice(i + 1),
  ]
}

function Label({ className, children, ...props }: React.ComponentProps<"label">) {
  return (
    <label
      data-slot="label"
      className={cn(
        "flex items-center gap-2 text-xs font-semibold tracking-wide uppercase select-none group-data-[disabled=true]:pointer-events-none group-data-[disabled=true]:opacity-50 peer-disabled:cursor-not-allowed peer-disabled:opacity-50 peer-data-[slot=checkbox]:text-sm peer-data-[slot=checkbox]:font-normal peer-data-[slot=checkbox]:tracking-normal peer-data-[slot=checkbox]:normal-case peer-data-[slot=radio-group-item]:text-sm peer-data-[slot=radio-group-item]:font-normal peer-data-[slot=radio-group-item]:tracking-normal peer-data-[slot=radio-group-item]:normal-case peer-data-[slot=switch]:text-sm peer-data-[slot=switch]:font-normal peer-data-[slot=switch]:tracking-normal peer-data-[slot=switch]:normal-case",
        className,
      )}
      {...props}
    >
      {marcarObligatorio(children)}
    </label>
  )
}

export { Label }
