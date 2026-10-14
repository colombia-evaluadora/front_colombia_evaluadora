import { SmileyIcon } from "@/components/ui/icons"
import { useNotify } from "@/components/notice/notice-context"
import { getErrorMessage } from "@/lib/api-client"
import { cn } from "@/lib/utils"
import type { Mensaje } from "@/features/comunicaciones/chat/api/types"
import { useReaccionarMensaje } from "@/features/comunicaciones/chat/api/mutations/use-acciones-mensaje"
import { ImagenEmoji } from "@/features/comunicaciones/chat/components/imagen-emoji"
import { SelectorEmoji } from "@/features/comunicaciones/chat/components/selector-emoji"

function useReaccionar(mensajeId: number) {
  const { notify } = useNotify()
  const reaccionar = useReaccionarMensaje()
  return {
    pendiente: reaccionar.isPending,
    alternar: (emoji: string) =>
      reaccionar.mutate(
        { id: mensajeId, emoji },
        { onError: (error) => notify(getErrorMessage(error), { variant: "error" }) },
      ),
  }
}

// Botón de la barra flotante que abre el selector para reaccionar.
export function BotonReaccionar({ mensaje: m }: { mensaje: Mensaje }) {
  const { alternar } = useReaccionar(m.id)
  return (
    <SelectorEmoji
      rapidos
      etiqueta="Reaccionar"
      side="top"
      align="end"
      onElegir={(emoji) => {
        // Elegir un emoji que ya puse no debe quitarlo.
        if (!m.reacciones?.some((r) => r.emoji === emoji && r.mia)) alternar(emoji)
      }}
      className="grid size-8 place-items-center rounded-md text-muted-foreground hover:bg-muted/60 hover:text-foreground focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none data-popup-open:text-foreground"
    >
      <SmileyIcon className="size-4.5" />
    </SelectorEmoji>
  )
}

// Chips bajo el mensaje: un clic suma o quita la reacción propia.
export function ReaccionesMensaje({ mensaje: m }: { mensaje: Mensaje }) {
  const { alternar, pendiente } = useReaccionar(m.id)
  if (!m.reacciones?.length) return null

  return (
    <ul aria-label="Reacciones" className={cn("mt-1.5 flex flex-wrap gap-1", m.esPropio && "justify-end")}>
      {m.reacciones.map((r) => (
        <li key={r.emoji}>
          <button
            type="button"
            aria-pressed={r.mia}
            disabled={pendiente}
            aria-label={`${r.emoji} ${r.total}${r.mia ? ", incluida la tuya" : ""}`}
            title={r.mia ? "Quitar tu reacción" : "Reaccionar igual"}
            onClick={() => alternar(r.emoji)}
            className="flex h-7 items-center gap-1 rounded-full border bg-card px-2 text-sm tabular-nums hover:border-primary/50 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none disabled:opacity-70 aria-pressed:border-primary aria-pressed:bg-primary/10 aria-pressed:text-primary"
          >
            <span aria-hidden>
              <ImagenEmoji emoji={r.emoji} className="size-4.5 text-base" />
            </span>
            <span aria-hidden className="text-xs font-medium">
              {r.total}
            </span>
          </button>
        </li>
      ))}
    </ul>
  )
}
