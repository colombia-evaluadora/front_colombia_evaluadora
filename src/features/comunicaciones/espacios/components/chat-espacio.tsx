import { format } from "date-fns"
import { Skeleton } from "@/components/ui/skeleton"
import { useNotify } from "@/components/notice/notice-context"
import { getErrorMessage } from "@/lib/api-client"
import { useEnviarChatEspacio } from "@/features/comunicaciones/espacios/api/mutations/use-acciones-espacio"
import { useChatEspacioQuery } from "@/features/comunicaciones/espacios/api/query/use-espacios-query"
import type { EspacioDetalle } from "@/features/comunicaciones/espacios/api/types"
import { ComposerEspacio } from "@/features/comunicaciones/espacios/components/composer-espacio"
import { ParticipacionItem } from "@/features/comunicaciones/espacios/components/participacion-item"

/** Chat en orden cronológico, común o de un equipo. Sin redacción si no se puede escribir (Sección 5.2). */
export function ChatEspacio({
  detalle,
  equipo = null,
  puedeEscribir,
}: {
  detalle: EspacioDetalle
  equipo?: number | null
  puedeEscribir: boolean
}) {
  const id = detalle.espacio.id
  const { notify } = useNotify()
  const { data: mensajes = [], isPending, isError } = useChatEspacioQuery(id, equipo)
  const enviar = useEnviarChatEspacio(id, equipo)
  const fijados = mensajes.filter((m) => m.fijada && !m.oculta && !m.retirada)
  const esDocente = detalle.espacio.rol === "PROPIETARIO"

  if (isPending) return <Skeleton className="h-40 w-full" />
  if (isError) return <p className="text-sm text-red">No se pudo cargar el chat.</p>

  return (
    <div className="space-y-3">
      {fijados.length > 0 && (
        <section aria-label="Mensajes fijados" className="rounded-md bg-blue-22 p-2 text-sm">
          {fijados.map((m) => (
            <a key={m.id} href={`#participacion-${m.id}`} className="block truncate underline-offset-2 hover:underline">
              <span className="font-medium">Fijado:</span> {m.texto || "Adjunto"}{" "}
              <span className="text-muted-foreground">
                — {m.autor} · {format(new Date(m.fecha), "dd/MM")}
              </span>
            </a>
          ))}
        </section>
      )}
      {mensajes.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">Todavía no hay mensajes.</p>
      ) : (
        <div className="space-y-2">
          {mensajes.map((m) => (
            <ParticipacionItem key={m.id} espacio={detalle} p={m} esDocente={esDocente} />
          ))}
        </div>
      )}
      {puedeEscribir && (
        <ComposerEspacio
          espacioId={id}
          equipo={equipo}
          etiqueta="Escriba su mensaje"
          textoBoton="Enviar"
          pendiente={enviar.isPending}
          onEnviar={(datos, listo) =>
            enviar.mutate(datos, {
              onSuccess: listo,
              onError: (error) => notify(getErrorMessage(error), { variant: "error" }),
            })
          }
        />
      )}
    </div>
  )
}
