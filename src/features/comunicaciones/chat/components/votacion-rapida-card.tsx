import { useEffect, useState, useSyncExternalStore } from "react"

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
import { Button } from "@/components/ui/button"
import {
  ClockIcon,
  LightningIcon,
  LockIcon,
  PencilSimpleIcon,
  TrashIcon,
  WarningIcon,
  XIcon,
} from "@/components/ui/icons"
import { haceCuanto, votacionModificada } from "@/features/comunicaciones/chat/lib/estado-mensaje"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { getErrorMessage } from "@/lib/api-client"
import { cn } from "@/lib/utils"
import type { Mensaje, VotacionRapida } from "@/features/comunicaciones/chat/api/types"
import { useEliminarMensaje } from "@/features/comunicaciones/chat/api/mutations/use-acciones-mensaje"
import { useVotarRapido } from "@/features/comunicaciones/chat/api/mutations/use-votacion-rapida"
import { VotacionRapidaDialog } from "@/features/comunicaciones/chat/components/votacion-rapida-dialog"
import {
  cuentaRegresiva,
  resultadosVotacionRapida,
  segundosRestantes,
} from "@/features/comunicaciones/chat/lib/votacion-rapida"

// Reloj de un segundo que se detiene al llegar al cierre.
function useAhora(hasta: string) {
  const [ahora, setAhora] = useState(Date.now)
  const fin = new Date(hasta).getTime()
  useEffect(() => {
    if (Date.now() >= fin) return
    const t = setInterval(() => {
      const n = Date.now()
      setAhora(n)
      if (n >= fin) clearInterval(t)
    }, 1000)
    return () => clearInterval(t)
  }, [fin])
  return ahora
}

const BARRA = ["bg-green", "bg-navy/70"]

/**
 * Opción elegida (aún sin votar) por id de mensaje, FUERA del árbol de React.
 * Cuando la votación llega en vivo, la lista se re-renderiza varias veces seguidas
 * (`mensaje.creado`, no leídos, marcar leído) y la tarjeta puede volver a
 * montarse: con un `useState` local el primer clic se perdía (QA E2E testv2).
 */
const seleccionPorMensaje = new Map<number, number>()
const oyentesSeleccion = new Set<() => void>()
const suscribirSeleccion = (l: () => void) => {
  oyentesSeleccion.add(l)
  return () => oyentesSeleccion.delete(l)
}

function useSeleccionVotacion(mensajeId: number) {
  const elegida = useSyncExternalStore(suscribirSeleccion, () => seleccionPorMensaje.get(mensajeId) ?? null)
  const elegir = (opcionId: number) => {
    seleccionPorMensaje.set(mensajeId, opcionId)
    for (const l of oyentesSeleccion) l()
  }
  return [elegida, elegir] as const
}

export function VotacionRapidaCard({ mensaje: m, votacion: v }: { mensaje: Mensaje; votacion: VotacionRapida }) {
  const restantes = segundosRestantes(v, useAhora(v.cierraEn))
  const cerrada = restantes === 0
  // El aviso se puede cerrar; vuelve si la votación se edita otra vez (otro cierre).
  const [avisoCerrado, setAvisoCerrado] = useState<string | null>(null)
  const modificada = votacionModificada(m, v, !cerrada) && avisoCerrado !== v.cierraEn

  return (
    <article
      aria-label={`Votación rápida: ${v.pregunta}`}
      className="w-full max-w-sm space-y-3 rounded-xl border bg-card p-4"
    >
      {modificada && (
        <p role="status" className="flex items-start gap-2 rounded-md border border-orange-stroke bg-orange-22 px-2.5 py-1.5 text-xs text-orange">
          <WarningIcon aria-hidden className="mt-0.5 size-3.5 shrink-0" />
          <span className="flex-1">
            La votación fue modificada y se reiniciaron los votos. Por favor vota nuevamente.
          </span>
          <button
            type="button"
            aria-label="Cerrar aviso"
            onClick={() => setAvisoCerrado(v.cierraEn)}
            className="grid size-5 shrink-0 place-items-center rounded hover:bg-orange/10 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
          >
            <XIcon className="size-3.5" />
          </button>
        </p>
      )}
      <header className="flex items-center gap-2">
        <LightningIcon aria-hidden className="size-5 self-start text-yellow" />
        <span className="flex-1 leading-tight">
          <span className="block text-sm font-medium">Votación rápida</span>
          {m.editado && m.editadoEn && (
            <span className="block text-[11px] text-muted-foreground italic">Editado {haceCuanto(m.editadoEn)}</span>
          )}
        </span>
        {!cerrada && (
          <span
            role="timer"
            aria-label={`Quedan ${cuentaRegresiva(restantes)}`}
            className="flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-sm font-semibold tabular-nums"
          >
            <ClockIcon aria-hidden className="size-4 text-muted-foreground" />
            {cuentaRegresiva(restantes)}
          </span>
        )}
        {!cerrada && m.esPropio && <AccionesCreador mensaje={m} />}
      </header>

      <h3 className="text-lg leading-snug font-semibold">{v.pregunta}</h3>

      {cerrada ? <Resultados votacion={v} /> : <Votar mensaje={m} votacion={v} />}
    </article>
  )
}

function Votar({ mensaje: m, votacion: v }: { mensaje: Mensaje; votacion: VotacionRapida }) {
  const [elegida, setOpcion] = useSeleccionVotacion(m.id)
  const opcion = v.miVoto ?? elegida
  const votar = useVotarRapido()
  const yaVoto = v.miVoto != null

  return (
    <>
      <RadioGroup
        value={opcion != null ? String(opcion) : ""}
        onValueChange={(o) => setOpcion(Number(o))}
        disabled={yaVoto}
        aria-label="Opciones"
        className="flex flex-wrap gap-x-6 gap-y-2"
      >
        {v.opciones.map((o) => (
          <label
            key={o.id}
            className="flex items-center gap-2 text-sm"
            // Se elige ya en el pointerdown: si el compositor tenía el foco, al perderlo
            // oculta su barra de formato, el chat se reacomoda y el mouseup cae en otro
            // lado, así el `click` nunca llegaba y el primer clic se perdía (QA E2E
            // testv2). El teclado sigue por `onValueChange`.
            onPointerDown={(e) => {
              if (!yaVoto && e.button === 0) setOpcion(o.id)
            }}
          >
            <RadioGroupItem value={String(o.id)} />
            {o.etiqueta}
          </label>
        ))}
      </RadioGroup>
      <p className="text-xs text-muted-foreground">
        {yaVoto
          ? "Tu voto quedó registrado. Verás los resultados cuando se cierre."
          : (
              <>
                Esta es una votación rápida.
                <br />
                {`Se cerrará automáticamente en ${v.minutos} ${v.minutos === 1 ? "minuto" : "minutos"}.`}
              </>
            )}
      </p>
      {votar.isError && (
        <p role="alert" className="text-sm text-red">
          {getErrorMessage(votar.error)}
        </p>
      )}
      <Button
        type="button"
        className="w-full"
        disabled={yaVoto || opcion == null || votar.isPending}
        aria-busy={votar.isPending}
        onClick={() => opcion != null && votar.mutate({ mensajeId: m.id, opcionId: opcion })}
      >
        {yaVoto ? "Votaste" : "Votar"}
      </Button>
    </>
  )
}

function Resultados({ votacion }: { votacion: VotacionRapida }) {
  const { total, opciones } = resultadosVotacionRapida(votacion)
  return (
    <div className="space-y-3 text-sm">
      <p className="flex items-center gap-1.5">
        <LockIcon aria-hidden className="size-4 text-red" />
        Votación cerrada
      </p>
      <div className="space-y-1.5">
        <p className="text-muted-foreground">Resultados finales:</p>
        <dl className="grid grid-cols-[auto_1fr_auto] items-center gap-x-2 gap-y-1">
          {opciones.map((o, i) => (
            <div key={o.id} className="contents">
              <dt className="text-muted-foreground">{o.etiqueta}</dt>
              <dd className="h-4 overflow-hidden rounded-sm bg-muted">
                <div
                  className={cn("h-full", BARRA[i] ?? "bg-primary")}
                  style={{ width: `${o.porcentaje}%` }}
                />
              </dd>
              <dd className="text-right text-muted-foreground tabular-nums">
                {o.porcentaje}% ({o.votos})
              </dd>
            </div>
          ))}
        </dl>
      </div>
      <p className="text-muted-foreground">Total participantes: {total}</p>
    </div>
  )
}

function AccionesCreador({ mensaje: m }: { mensaje: Mensaje }) {
  const [editando, setEditando] = useState(false)
  const [borrando, setBorrando] = useState(false)
  const eliminar = useEliminarMensaje()

  return (
    <>
      <button
        type="button"
        onClick={() => setEditando(true)}
        aria-label="Editar votación"
        title="Editar"
        className="grid size-7 place-items-center rounded text-muted-foreground hover:text-foreground focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
      >
        <PencilSimpleIcon className="size-4.5" />
      </button>
      <button
        type="button"
        onClick={() => setBorrando(true)}
        aria-label="Eliminar votación"
        title="Eliminar"
        className="grid size-7 place-items-center rounded text-muted-foreground hover:text-red focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
      >
        <TrashIcon className="size-4.5" />
      </button>

      <VotacionRapidaDialog
        key={m.id}
        conversacionId={m.conversacionId}
        editar={m}
        open={editando}
        onClose={() => setEditando(false)}
      />

      <AlertDialog open={borrando} onOpenChange={(o) => !o && !eliminar.isPending && setBorrando(false)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar la votación rápida?</AlertDialogTitle>
            <AlertDialogDescription>
              Se quitará del chat junto con los votos que ya tenga; en su lugar queda el aviso de mensaje eliminado.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {eliminar.isError && (
            <p role="alert" className="text-sm text-red">
              {getErrorMessage(eliminar.error)}
            </p>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel variant="fill" color="neutral" disabled={eliminar.isPending}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              color="destructive"
              disabled={eliminar.isPending}
              aria-busy={eliminar.isPending}
              onClick={() => eliminar.mutate(m.id, { onSuccess: () => setBorrando(false) })}
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
