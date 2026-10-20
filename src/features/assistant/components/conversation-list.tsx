import { formatDistanceToNow } from "date-fns"
import { es } from "date-fns/locale"

import { ClockCounterClockwiseIcon, SpinnerIcon } from "@/components/ui/icons"
import { ConfirmRemoveButton } from "@/components/confirm-remove-button"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

import { mensajeErrorAgente } from "@/features/assistant/api/agente-client"
import { useArchivarConversacion, useConversacionesQuery } from "@/features/assistant/api/queries"
import type { ConversacionResumen } from "@/features/assistant/api/types"
import { fechaServidor } from "@/features/assistant/lib/fecha-servidor"

interface ConversationListProps {
  activa: string | null
  bloqueado: boolean
  onAbrir: (id: string) => void
  onArchivada: (id: string) => void
}

function cuando(c: ConversacionResumen): string {
  const fecha = fechaServidor(c.ultimoMensajeAt ?? c.createdAt)
  return Number.isNaN(fecha.getTime()) ? "" : formatDistanceToNow(fecha, { addSuffix: true, locale: es })
}

// El backend no cambia el título inicial: se muestra el id corto para distinguirlas.
const TITULO_INICIAL = "Nueva conversación"

function titulo(c: ConversacionResumen): string {
  const propio = c.titulo?.trim()
  return propio && propio !== TITULO_INICIAL ? propio : `Conversación ${c.id.slice(0, 8)}`
}

export function ConversationList({ activa, bloqueado, onAbrir, onArchivada }: ConversationListProps) {
  const query = useConversacionesQuery({ enabled: !bloqueado })
  const archivar = useArchivarConversacion()

  if (query.isPending && !bloqueado) {
    return (
      <div className="flex flex-1 items-center justify-center text-muted-foreground">
        <SpinnerIcon className="size-5 animate-spin" />
      </div>
    )
  }

  if (query.isError) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-2 p-6 text-center">
        <p className="text-sm text-red">{mensajeErrorAgente(query.error)}</p>
        <Button variant="outline" color="neutral" size="xs" onClick={() => query.refetch()}>
          Reintentar
        </Button>
      </div>
    )
  }

  const conversaciones = query.data ?? []
  if (conversaciones.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-2 p-6 text-center">
        <span className="mb-1 flex size-10 items-center justify-center rounded-full bg-primary-22 text-primary">
          <ClockCounterClockwiseIcon className="size-5" />
        </span>
        <p className="text-sm font-semibold">Aún no tienes conversaciones</p>
        <p className="max-w-[30ch] text-sm text-muted-foreground">
          Cuando le escribas al asistente, tus conversaciones quedarán aquí.
        </p>
      </div>
    )
  }

  return (
    <ul className="flex flex-1 flex-col gap-1 overflow-y-auto p-3">
      {conversaciones.map((c) => (
        <li
          key={c.id}
          className={cn(
            "flex items-center gap-2 rounded-md px-2 hover:bg-muted",
            c.id === activa && "bg-muted",
          )}
        >
          <button
            type="button"
            className="flex min-w-0 flex-1 flex-col items-start py-2 text-left"
            onClick={() => onAbrir(c.id)}
          >
            <span className="w-full truncate text-sm font-medium">{titulo(c)}</span>
            <span className="text-xs text-muted-foreground">{cuando(c)}</span>
          </button>
          <ConfirmRemoveButton
            title="Archivar conversación"
            label="Archivar conversación"
            description="La conversación sale del historial. No se puede volver a abrir desde el asistente."
            disabled={bloqueado}
            onConfirm={async () => {
              try {
                await archivar.mutateAsync(c.id)
                onArchivada(c.id)
              } catch {
                return false
              }
            }}
          />
        </li>
      ))}
    </ul>
  )
}
