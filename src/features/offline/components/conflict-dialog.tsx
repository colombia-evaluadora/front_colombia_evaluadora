import { useNavigate } from "@tanstack/react-router"
import { format } from "date-fns"
import { es } from "date-fns/locale"

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { getOutboxHandler } from "@/lib/offline/outbox/registry"
import { resolveKeepMine, resolveUseServer } from "@/lib/offline/outbox/engine"
import type { OutboxOp } from "@/lib/offline/outbox/types"

/** Valor legible de un payload/valor del servidor (sin JSON crudo en primer plano). */
export function legible(value: unknown): string {
  if (value == null) return "—"
  if (typeof value === "string") {
    try {
      return legible(JSON.parse(value))
    } catch {
      return value
    }
  }
  if (typeof value !== "object") return String(value)
  return Object.entries(value as Record<string, unknown>)
    .filter(([k]) => !["input", "baseVersion", "version", "BASE_VERSION"].includes(k))
    .map(([k, v]) => `${k}: ${typeof v === "object" ? JSON.stringify(v) : String(v)}`)
    .join(" · ")
}

/**
 * Resolución de conflictos (plan §7.7): "Conservar el mío" reenvía sobre la
 * versión del servidor, "Usar el del servidor" descarta el cambio local y
 * "Editar" lleva a la pantalla del dato. Asistencia muestra filas por estudiante.
 */
export function ConflictDialog({ op, onClose }: { op: OutboxOp | null; onClose: () => void }) {
  const navigate = useNavigate()
  const handler = op ? getOutboxHandler(op.kind) : undefined
  const description = op && handler ? handler.describe(op.payload as never) : null
  const rows = op?.conflict?.rows ?? []

  return (
    <Dialog open={op != null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-xl" data-slot="conflict-dialog">
        <DialogHeader>
          <DialogTitle>Este dato cambió mientras estabas sin conexión</DialogTitle>
          <DialogDescription>{description ? `${description.titulo}. ${description.detalle}` : null}</DialogDescription>
        </DialogHeader>
        {op && (
          <div className="grid gap-3 text-sm sm:grid-cols-2">
            <div className="rounded-md border p-3">
              <p className="font-semibold">
                Tu cambio ({format(op.createdAt, "d MMM, HH:mm", { locale: es })})
              </p>
              <p className="text-muted-foreground mt-1 break-words">{legible(op.payload)}</p>
            </div>
            <div className="rounded-md border p-3">
              <p className="font-semibold">Versión actual en el servidor</p>
              <p className="text-muted-foreground mt-1 break-words">{legible(op.conflict?.server)}</p>
            </div>
            {rows.length > 0 && (
              <ul className="col-span-full space-y-1 text-xs">
                {rows.map((r) => (
                  <li key={r.key}>
                    {r.label ?? `Estudiante ${r.key}`}: tuyo {legible(r.local)} · servidor {legible(r.server)}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
        <DialogFooter>
          <Button
            variant="outline"
            color="neutral"
            onClick={() => {
              if (description?.ruta) void navigate({ to: description.ruta })
              onClose()
            }}
          >
            Editar
          </Button>
          <Button
            variant="outline"
            color="destructive"
            onClick={async () => {
              if (op) await resolveUseServer(op.id)
              onClose()
            }}
          >
            Usar el del servidor
          </Button>
          <Button
            variant="fill"
            color="primary"
            onClick={async () => {
              if (op) await resolveKeepMine(op.id)
              onClose()
            }}
          >
            Conservar el mío
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
