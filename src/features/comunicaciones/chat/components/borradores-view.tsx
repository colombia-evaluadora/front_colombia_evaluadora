import { useState, type ReactNode } from "react"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Skeleton } from "@/components/ui/skeleton"
import { useNotify } from "@/components/notice/notice-context"
import { getErrorMessage } from "@/lib/api-client"
import { cn } from "@/lib/utils"
import type { Borrador, EstadoBorrador } from "@/features/comunicaciones/chat/api/types"
import { useBorradoresQuery } from "@/features/comunicaciones/chat/api/query/use-borradores-query"
import {
  useEliminarBorrador,
  useEnviarBorrador,
} from "@/features/comunicaciones/chat/api/mutations/use-acciones-borrador"
import { fechaCorta } from "@/features/comunicaciones/chat/lib/chat-format"
import {
  HashIcon,
  PencilSimpleIcon,
  TrashIcon,
  PaperPlaneTiltIcon,
} from "@/components/ui/icons"
import { VistaEncabezado } from "@/features/comunicaciones/chat/components/vista-encabezado"

const PESTANAS: Array<{ estado: EstadoBorrador; etiqueta: string; vacio: string }> = [
  {
    estado: "BORRADOR",
    etiqueta: "Borradores",
    vacio: "No tienes borradores. Lo que escribas sin enviar quedará guardado aquí.",
  },
  {
    estado: "PROGRAMADO",
    etiqueta: "Programados",
    vacio: "No tienes mensajes programados.",
  },
  {
    estado: "ENVIADO",
    etiqueta: "Enviados",
    vacio: "Aún no has enviado mensajes.",
  },
]

const ETIQUETA_ESTADO: Record<EstadoBorrador, { texto: string; clase: string }> = {
  BORRADOR: { texto: "Borrador", clase: "text-orange" },
  PROGRAMADO: { texto: "Programado", clase: "text-blue" },
  ENVIADO: { texto: "Enviado", clase: "text-green" },
}

interface BorradoresViewProps {
  onVolver: () => void
  // Abre el canal con el texto del borrador en el editor.
  onEditar: (borrador: Borrador) => void
}

export function BorradoresView({ onVolver, onEditar }: BorradoresViewProps) {
  const { notify } = useNotify()
  const { data = [], isPending, isError, refetch } = useBorradoresQuery()
  const [pestana, setPestana] = useState<EstadoBorrador>("BORRADOR")
  const [porEliminar, setPorEliminar] = useState<Borrador | null>(null)
  const enviar = useEnviarBorrador()
  const eliminar = useEliminarBorrador()

  const onError = (error: unknown) => notify(getErrorMessage(error), { variant: "error" })
  const lista = data
    .filter((b) => b.estado === pestana)
    .sort((a, b) => b.fecha.localeCompare(a.fecha))
  const actual = PESTANAS.find((p) => p.estado === pestana)

  return (
    <>
      <VistaEncabezado titulo="Borradores y enviados" onVolver={onVolver} />

      <div role="tablist" aria-label="Estado de los mensajes" className="flex shrink-0 gap-6 border-b px-3 md:px-5">
        {PESTANAS.map((p) => {
          const total = data.filter((b) => b.estado === p.estado).length
          const activa = p.estado === pestana
          return (
            <button
              key={p.estado}
              type="button"
              role="tab"
              aria-selected={activa}
              onClick={() => setPestana(p.estado)}
              className={cn(
                "-mb-px flex h-11 items-center gap-1.5 border-b-2 text-sm transition-colors focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none",
                activa
                  ? "border-primary font-semibold text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              {p.etiqueta}
              {total > 0 && <span className="text-xs text-muted-foreground tabular-nums">{total}</span>}
            </button>
          )
        })}
      </div>

      <div role="tabpanel" aria-label={actual?.etiqueta} className="min-h-0 flex-1 overflow-y-auto px-3 py-4 md:px-5">
        {isPending ? (
          <div className="space-y-2" aria-busy>
            {Array.from({ length: 2 }, (_, i) => (
              <Skeleton key={i} className="h-17 w-full" />
            ))}
          </div>
        ) : isError ? (
          <div className="py-10 text-center text-sm">
            <p className="text-muted-foreground">No se pudieron cargar los mensajes.</p>
            <button type="button" onClick={() => void refetch()} className="mt-2 font-medium text-primary underline">
              Reintentar
            </button>
          </div>
        ) : lista.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">{actual?.vacio}</p>
        ) : (
          <ul className="space-y-2">
            {lista.map((b) => (
              <li key={b.id}>
                <TarjetaBorrador
                  borrador={b}
                  enviando={enviar.isPending && enviar.variables === b.id}
                  onEditar={() => onEditar(b)}
                  onEnviar={() =>
                    enviar.mutate(b.id, {
                      onSuccess: () => notify(`Mensaje enviado a #${b.conversacionNombre}.`),
                      onError,
                    })
                  }
                  onEliminar={() => setPorEliminar(b)}
                />
              </li>
            ))}
          </ul>
        )}
      </div>

      <AlertDialog
        open={!!porEliminar}
        onOpenChange={(open) => !open && !eliminar.isPending && setPorEliminar(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar este borrador?</AlertDialogTitle>
            <AlertDialogDescription>
              Se perderá el texto que escribiste para #{porEliminar?.conversacionNombre}. Esta acción
              no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel variant="fill" color="neutral" disabled={eliminar.isPending}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              color="destructive"
              disabled={eliminar.isPending}
              aria-busy={eliminar.isPending}
              onClick={() =>
                porEliminar && eliminar.mutate(porEliminar.id, {
                  onSuccess: () => {
                    notify("Borrador eliminado.")
                    setPorEliminar(null)
                  },
                  onError,
                })
              }
            >
              Eliminar borrador
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

function TarjetaBorrador({
  borrador: b,
  enviando,
  onEditar,
  onEnviar,
  onEliminar,
}: {
  borrador: Borrador
  enviando: boolean
  onEditar: () => void
  onEnviar: () => void
  onEliminar: () => void
}) {
  const estado = ETIQUETA_ESTADO[b.estado]
  const editable = b.estado !== "ENVIADO"
  return (
    <article className="group/borrador relative flex items-center gap-3 rounded-lg border bg-card px-4 py-3 transition-colors hover:border-primary/40">
      <span aria-hidden className="grid size-10 shrink-0 place-items-center rounded-md bg-muted/50">
        <HashIcon className="size-5 text-muted-foreground" />
      </span>
      <div className="min-w-0 flex-1">
        <h3 className="truncate text-sm font-medium"># {b.conversacionNombre}</h3>
        <p className="truncate text-xs text-muted-foreground">{b.texto}</p>
      </div>
      <p className="shrink-0 self-start text-xs text-muted-foreground">
        <time dateTime={b.fecha}>{fechaCorta(b.fecha)}</time>{" "}
        <span className={cn("font-medium", estado.clase)}>{estado.texto}</span>
      </p>

      {editable && (
        // Aparecen al pasar el mouse o con foco, sobre la fecha (como en la lista de chats).
        <div className="absolute top-1/2 right-3 flex -translate-y-1/2 items-center gap-0.5 rounded-lg border bg-card p-0.5 shadow-sm opacity-0 transition-opacity group-focus-within/borrador:opacity-100 group-hover/borrador:opacity-100 max-md:static max-md:translate-y-0 max-md:opacity-100">
          <AccionBoton etiqueta="Editar" onClick={onEditar}>
            <PencilSimpleIcon className="size-4.5" />
          </AccionBoton>
          <AccionBoton etiqueta="Enviar ahora" onClick={onEnviar} disabled={enviando}>
            <PaperPlaneTiltIcon className="size-4.5" />
          </AccionBoton>
          <AccionBoton etiqueta="Eliminar" onClick={onEliminar}>
            <TrashIcon className="size-4.5" />
          </AccionBoton>
        </div>
      )}
    </article>
  )
}

function AccionBoton({
  etiqueta,
  onClick,
  disabled,
  children,
}: {
  etiqueta: string
  onClick: () => void
  disabled?: boolean
  children: ReactNode
}) {
  return (
    <button
      type="button"
      aria-label={etiqueta}
      title={etiqueta}
      onClick={onClick}
      disabled={disabled}
      className="grid size-8 place-items-center rounded-md text-muted-foreground hover:bg-muted/60 hover:text-foreground focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none disabled:opacity-50"
    >
      {children}
    </button>
  )
}
