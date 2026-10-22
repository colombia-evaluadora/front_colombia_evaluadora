import { useState } from "react"

import { CaretDownIcon, PushPinFillIcon } from "@/components/ui/icons"
import type { Mensaje } from "@/features/comunicaciones/chat/api/types"
import { textoPlano } from "@/features/comunicaciones/chat/lib/menciones"
import { mensajesFijados } from "@/features/comunicaciones/chat/lib/estado-mensaje"

/**
 * Barra de mensajes fijados bajo el encabezado (diseño 4576:70856): muestra el fijado más reciente;
 * clic lleva al mensaje y la flecha pasa al siguiente fijado (vuelve al primero al terminar).
 */
export function FijadosBarra({ mensajes, onIr }: { mensajes: Mensaje[]; onIr: (id: number) => void }) {
  const fijados = mensajesFijados(mensajes)
  const [indice, setIndice] = useState(0)
  if (fijados.length === 0) return null
  const actual = fijados[indice % fijados.length]
  const resumen = textoPlano(actual.texto, actual.menciones) || actual.adjunto?.nombre || "Mensaje fijado"

  return (
    <div
      role="region"
      aria-label="Mensajes fijados"
      className="flex h-10 shrink-0 items-center gap-2 border-b bg-chat-panel px-3 text-sm md:px-5"
    >
      <PushPinFillIcon aria-hidden className="size-4 shrink-0 text-muted-foreground" />
      <button
        type="button"
        onClick={() => onIr(actual.id)}
        title="Ir al mensaje fijado"
        className="min-w-0 flex-1 truncate rounded text-left text-muted-foreground hover:text-foreground focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
      >
        {fijados.length > 1 && (
          <span className="mr-1.5 font-medium text-foreground tabular-nums">
            {(indice % fijados.length) + 1}/{fijados.length}
          </span>
        )}
        <span className="sr-only">Fijado: </span>
        {resumen}
      </button>
      {fijados.length > 1 && (
        <button
          type="button"
          onClick={() => setIndice((i) => (i + 1) % fijados.length)}
          aria-label="Siguiente mensaje fijado"
          className="grid size-7 shrink-0 place-items-center rounded-md text-muted-foreground hover:bg-muted/60 hover:text-foreground focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
        >
          <CaretDownIcon className="size-5" />
        </button>
      )}
    </div>
  )
}
