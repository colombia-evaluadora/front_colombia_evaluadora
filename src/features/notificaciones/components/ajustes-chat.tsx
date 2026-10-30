import { useId } from "react"
import { ErrorNoticeBanner } from "@/components/notice/error-notice-banner"

import { useNotify } from "@/components/notice/notice-context"
import { Skeleton } from "@/components/ui/skeleton"
import { Switch } from "@/components/ui/switch"
import { getErrorMessage } from "@/lib/api-client"

import { useGuardarAjustesChat } from "@/features/comunicaciones/chat/api/mutations/use-ajustes-chat"
import { useAjustesChatQuery } from "@/features/comunicaciones/chat/api/query/use-ajustes-chat-query"
import type { AjustesChat } from "@/features/comunicaciones/chat/api/types"

const OPCIONES: Array<{ clave: keyof AjustesChat; titulo: string; descripcion: string }> = [
  {
    clave: "sonido",
    titulo: "Sonido de los avisos",
    descripcion:
      "Reproduce un sonido al llegar un aviso nuevo. No suena en tu horario silencioso, en Ocupado ni en conversaciones silenciadas.",
  },
  {
    clave: "confirmacionLecturaPermitir",
    titulo: "Enviar confirmación de lectura",
    descripcion: "Quien te escribe pidiendo confirmación sabrá cuándo leíste su mensaje.",
  },
  {
    clave: "confirmacionLecturaSolicitar",
    titulo: "Solicitar confirmación de lectura por defecto",
    descripcion: "Tus mensajes nuevos piden confirmación; puedes cambiarlo en cada mensaje.",
  },
]

/**
 * Ajustes del chat en Preferencias de notificaciones (HU 7): sonido y confirmación de lectura.
 * Cada interruptor se guarda al cambiarlo (comms-service `PUT /comunicaciones/ajustes`).
 */
export function AjustesChatSeccion({ disabled }: { disabled?: boolean }) {
  const id = useId()
  const { notify } = useNotify()
  const ajustes = useAjustesChatQuery()
  const guardar = useGuardarAjustesChat({
    mutationConfig: {
      onSuccess: () => notify("Ajustes del chat actualizados."),
      onError: (error) => notify(getErrorMessage(error), { variant: "error" }),
    },
  })

  return (
    <section className="flex flex-col gap-3" aria-labelledby={`${id}-titulo`}>
      <div>
        <h2 id={`${id}-titulo`} className="text-base font-semibold">
          Sonido y confirmación de lectura
        </h2>
        <p className="text-sm text-muted-foreground">Se aplican a todos tus avisos y conversaciones.</p>
      </div>
      {ajustes.isPending ? (
        <Skeleton className="h-24 w-full" />
      ) : ajustes.isError ? (
        <ErrorNoticeBanner error={ajustes.error} />
      ) : (
        <ul className="divide-y rounded-md border">
          {OPCIONES.map((o) => (
            <li key={o.clave} className="flex items-center gap-3 px-3 py-2">
              <div className="min-w-0 flex-1">
                <p id={`${id}-${o.clave}`} className="text-sm font-medium">
                  {o.titulo}
                </p>
                <p className="text-xs text-muted-foreground">{o.descripcion}</p>
              </div>
              <Switch
                round
                checked={ajustes.data[o.clave]}
                disabled={disabled || guardar.isPending}
                aria-labelledby={`${id}-${o.clave}`}
                onCheckedChange={(checked) => guardar.mutate({ ...ajustes.data, [o.clave]: checked })}
              />
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
