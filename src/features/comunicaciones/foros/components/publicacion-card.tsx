import { CheckCircleIcon, ChatCircleTextIcon, LockIcon, PushPinIcon, SmileyIcon } from "@/components/ui/icons"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"
import { fechaCorta, iniciales } from "@/features/comunicaciones/chat/lib/chat-format"
import type { Publicacion } from "@/features/comunicaciones/foros/api/types"
import { EtiquetaChip } from "@/features/comunicaciones/foros/components/etiqueta-chip"
import { extractoPlano } from "@/features/comunicaciones/foros/lib/foros"

// Fila del listado de publicaciones (estilo de foro de Discord: título, extracto, etiquetas, contadores).
export function PublicacionCard({ publicacion: p, onAbrir }: { publicacion: Publicacion; onAbrir: (id: number) => void }) {
  return (
    <article
      className={cn(
        "group relative rounded-lg border bg-card p-4 transition-colors hover:border-primary/50 focus-within:ring-2 focus-within:ring-primary",
        p.fijada && "border-primary/40 bg-primary/5",
      )}
    >
      <div className="flex items-start gap-3">
        <Avatar size="sm" className="mt-0.5 shrink-0">
          <AvatarFallback className="bg-navy-22 text-[0.65rem] font-semibold text-navy">
            {iniciales(p.autor.nombre)}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <h3 className="flex items-center gap-1.5 font-semibold">
            {p.fijada && <PushPinIcon aria-label="Fijada" className="size-4 shrink-0 text-primary" />}
            {p.cerrada && <LockIcon aria-label="Cerrada" className="size-4 shrink-0 text-muted-foreground" />}
            {p.resuelta && <CheckCircleIcon aria-label="Resuelta" className="size-4 shrink-0 text-green" />}
            {/* El botón cubre toda la tarjeta: un solo destino de tabulación por fila. */}
            <button
              type="button"
              onClick={() => onAbrir(p.id)}
              className="min-w-0 truncate text-left outline-none after:absolute after:inset-0 after:content-['']"
            >
              {p.titulo}
            </button>
          </h3>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {p.autor.nombre} · {fechaCorta(p.fecha)}
          </p>
          {p.extracto && <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{extractoPlano(p.extracto)}</p>}
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
            {p.etiquetas.length > 0 && (
              <ul aria-label="Etiquetas" className="flex flex-wrap gap-1.5">
                {p.etiquetas.map((e) => (
                  <li key={e.id}>
                    <EtiquetaChip etiqueta={e} />
                  </li>
                ))}
              </ul>
            )}
            <span className="flex items-center gap-1 text-xs text-muted-foreground tabular-nums">
              <ChatCircleTextIcon aria-hidden className="size-4" />
              <span className="sr-only">Respuestas:</span>
              {p.respuestas}
            </span>
            {p.reacciones > 0 && (
              <span className="flex items-center gap-1 text-xs text-muted-foreground tabular-nums">
                <SmileyIcon aria-hidden className="size-4" />
                <span className="sr-only">Reacciones:</span>
                {p.reacciones}
              </span>
            )}
            <span className="text-xs text-muted-foreground">Actividad {fechaCorta(p.ultimaActividad)}</span>
          </div>
        </div>
      </div>
    </article>
  )
}
