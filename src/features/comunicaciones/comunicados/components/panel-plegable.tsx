import { useState, type ReactNode } from "react"

import { CaretDownIcon, CaretRightIcon } from "@/components/ui/icons"

/**
 * Panel plegable con encabezado gris y flecha, como los del prototipo (Nuevo y Modificar comunicado).
 * Sin `onAlternar` se pliega solo. Plegado se oculta, no se desmonta: conserva su estado.
 */
export function Panel({
  titulo,
  abierto,
  onAlternar,
  accion,
  children,
}: {
  titulo: string
  abierto?: boolean
  onAlternar?: () => void
  accion?: ReactNode
  children: ReactNode
}) {
  const [propio, setPropio] = useState(true)
  const visible = onAlternar ? !!abierto : propio
  return (
    <section className="border-b last:border-b-0">
      <div className="flex items-center gap-2 bg-muted/40 px-3 py-2">
        <button
          type="button"
          aria-expanded={visible}
          className="flex min-w-0 flex-1 items-center gap-2 py-1 text-left text-sm"
          onClick={() => (onAlternar ? onAlternar() : setPropio((v) => !v))}
        >
          {visible ? (
            <CaretDownIcon aria-hidden className="size-4 shrink-0" />
          ) : (
            <CaretRightIcon aria-hidden className="size-4 shrink-0" />
          )}
          <span className="min-w-0 break-words">{titulo}</span>
        </button>
        {accion}
      </div>
      <div className="border-t p-4" hidden={!visible}>
        {children}
      </div>
    </section>
  )
}
