import { SmileyIcon } from "@/components/ui/icons"
import { useNotify } from "@/components/notice/notice-context"
import { getErrorMessage } from "@/lib/api-client"
import type { Mensaje } from "@/features/comunicaciones/chat/api/types"
import { ImagenEmoji } from "@/features/comunicaciones/chat/components/imagen-emoji"
import { SelectorEmoji } from "@/features/comunicaciones/chat/components/selector-emoji"
import { useReaccionarForo } from "@/features/comunicaciones/foros/api/mutations/use-acciones-foro"

/**
 * Reacciones del cuerpo o de una respuesta: mismo endpoint y modelo que el chat
 * (`POST /comunicaciones/mensajes/:id/reacciones`), pero la cache es la del foro.
 */
export function ReaccionesForo({ mensaje: m, disabled }: { mensaje: Mensaje; disabled?: boolean }) {
  const { notify } = useNotify()
  const reaccionar = useReaccionarForo()
  const alternar = (emoji: string) =>
    reaccionar.mutate(
      { id: m.id, emoji },
      { onError: (error) => notify(getErrorMessage(error), { variant: "error" }) },
    )
  const bloqueado = disabled || reaccionar.isPending

  return (
    <ul aria-label="Reacciones" className="flex flex-wrap items-center gap-1">
      {(m.reacciones ?? []).map((r) => (
        <li key={r.emoji}>
          <button
            type="button"
            aria-pressed={r.mia}
            disabled={bloqueado}
            aria-label={`${r.emoji}: ${r.total}`}
            title={(r.personas ?? []).join(", ")}
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
      {!disabled && (
        <li>
          <SelectorEmoji
            rapidos
            etiqueta="Reaccionar"
            side="top"
            align="start"
            onElegir={(emoji) => {
              if (!m.reacciones?.some((r) => r.emoji === emoji && r.mia)) alternar(emoji)
            }}
            className="grid size-7 place-items-center rounded-full border border-dashed text-muted-foreground hover:text-foreground focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
          >
            <SmileyIcon className="size-4" />
          </SelectorEmoji>
        </li>
      )}
    </ul>
  )
}
