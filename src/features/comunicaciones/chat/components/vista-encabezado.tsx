import type { ReactNode } from "react"

import { ArrowLeftIcon } from "@/components/ui/icons"

// Encabezado de las vistas del panel derecho (Archivos, Borradores…).
export function VistaEncabezado({
  titulo,
  onVolver,
  children,
}: {
  titulo: string
  onVolver: () => void
  children?: ReactNode
}) {
  return (
    <header className="flex h-16 shrink-0 items-center gap-3 border-b px-3 md:px-5">
      <button
        type="button"
        onClick={onVolver}
        aria-label="Volver a conversaciones"
        className="grid size-9 shrink-0 place-items-center rounded-full hover:bg-muted/60 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none md:hidden"
      >
        <ArrowLeftIcon className="size-5" />
      </button>
      <h2 className="shrink-0 text-lg font-semibold">{titulo}</h2>
      {children}
    </header>
  )
}
