import type { ReactNode } from "react"

import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { CaretDownIcon } from "@/components/ui/icons"

// Sección colapsable de los formularios del período. `keepMounted` para que los
// campos sigan registrados (y validándose) aunque la sección esté cerrada.
export function FormSection({
  title,
  defaultOpen = true,
  children,
}: {
  title: string
  defaultOpen?: boolean
  children: ReactNode
}) {
  return (
    <Collapsible
      defaultOpen={defaultOpen}
      className="group/section overflow-hidden rounded-lg border border-border bg-background"
    >
      <CollapsibleTrigger className="flex w-full items-center gap-2 bg-muted/60 px-4 py-3 text-left text-base font-medium outline-none focus-visible:ring-2 focus-visible:ring-ring/40">
        <CaretDownIcon className="size-5 shrink-0 -rotate-90 text-muted-foreground transition-transform group-data-[open]/section:rotate-0 motion-reduce:transition-none" />
        {title}
      </CollapsibleTrigger>
      <CollapsibleContent keepMounted className="px-4 pt-5 pb-5 data-[closed]:hidden">
        {children}
      </CollapsibleContent>
    </Collapsible>
  )
}
