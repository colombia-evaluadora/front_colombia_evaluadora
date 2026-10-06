import { useEffect, useState } from "react"
import { format } from "date-fns"
import { useQueryClient } from "@tanstack/react-query"

import { Skeleton } from "@/components/ui/skeleton"
import {
  ArrowCounterClockwiseIcon,
  BallotIcon,
  CalendarBlankIcon,
  CheckCircleFillIcon,
  MedalIcon,
  XIcon,
} from "@/components/ui/icons"
import { cn } from "@/lib/utils"
import type { Eleccion } from "@/features/comunicaciones/chat/api/types"
import { chatKeys } from "@/features/comunicaciones/chat/api/query-keys"
import {
  cuentaRegresiva,
  estadoEleccion,
  porcentaje,
  resultados,
  totalVotos,
  type EstadoEleccion,
  type FilaResultado,
} from "@/features/comunicaciones/chat/lib/eleccion"
import { FotoCandidato } from "@/features/comunicaciones/chat/components/crear-eleccion-dialog"

// Un color fijo por candidato (según su orden de inscripción) para que no
// cambie cuando se reordenan por votos.
const COLORES = ["bg-orange", "bg-blue", "bg-green", "bg-purple", "bg-red", "bg-yellow"]

const ETIQUETA_ESTADO: Record<EstadoEleccion, string> = {
  PROGRAMADA: "Programada",
  ACTIVA: "Activa",
  FINALIZADA: "Finalizada",
}

// Reloj de un segundo para la cuenta regresiva y el "hace N segundos".
function useAhora() {
  const [ahora, setAhora] = useState(() => Date.now())
  useEffect(() => {
    const t = setInterval(() => setAhora(Date.now()), 1000)
    return () => clearInterval(t)
  }, [])
  return ahora
}

export function EleccionEstado({ eleccion: e }: { eleccion: Eleccion }) {
  const ahora = useAhora()
  const queryClient = useQueryClient()
  const estado = estadoEleccion(e, ahora)

  // Al llegar a cero se pide el conteo final.
  useEffect(() => {
    if (estado === "FINALIZADA") {
      void queryClient.invalidateQueries({ queryKey: chatKeys.eleccion(e.conversacionId) })
    }
  }, [estado, e.conversacionId, queryClient])

  const objetivo = estado === "PROGRAMADA" ? e.fechaInicio : e.fechaCierre

  return (
    <div className="flex shrink-0 flex-wrap items-center gap-x-5 gap-y-1 border-b px-3 py-2 text-xs text-muted-foreground md:px-5">
      <span className="flex items-center gap-1">
        {estado === "ACTIVA" && <CheckCircleFillIcon aria-hidden className="size-4 text-green" />}
        Estado: {ETIQUETA_ESTADO[estado]}
      </span>
      {e.fechaCierre && (
        <span className="flex items-center gap-1">
          <CalendarBlankIcon aria-hidden className="size-4" />
          Fecha cierre: {format(new Date(e.fechaCierre), "dd/MM/yyyy h:mm a")}
        </span>
      )}
      <span className="ml-auto">
        {estado === "FINALIZADA" ? (
          <span className="rounded-full bg-muted/50 px-3 py-1">Votación cerrada</span>
        ) : objetivo ? (
          <span className="rounded-full bg-orange-22 px-3 py-1 text-foreground">
            {estado === "PROGRAMADA" ? "Abre en: " : "Cierra en: "}
            <strong className="font-semibold text-orange tabular-nums" aria-live="off">
              {cuentaRegresiva(Date.parse(objetivo) - ahora)}
            </strong>
          </span>
        ) : (
          <span>Sin fecha de cierre</span>
        )}
      </span>
    </div>
  )
}

export function EleccionResultados({
  eleccion: e,
  actualizadoEn,
  isPending,
}: {
  eleccion: Eleccion | null | undefined
  actualizadoEn: number
  isPending: boolean
}) {
  const ahora = useAhora()

  if (isPending) return <Skeleton className="mb-4 h-64 w-full" />
  if (!e) return null

  const estado = estadoEleccion(e, ahora)
  const finalizada = estado === "FINALIZADA"
  const votaron = totalVotos(e)
  const pendientes = Math.max(0, e.totalHabilitados - votaron)
  const visibles = finalizada || e.verResultadosEnVivo
  const segundos = Math.max(0, Math.round((ahora - actualizadoEn) / 1000))
  const indice = new Map(e.candidatos.map((c, i) => [c.id, i]))

  return (
    <section
      aria-label={`Resultados de ${e.nombre}`}
      className="mb-4 rounded-xl border bg-card p-3 md:p-4"
    >
      <p className="mb-2 flex items-center gap-1 text-xs text-muted-foreground">
        <ArrowCounterClockwiseIcon aria-hidden className="size-3.5" />
        Actualizado hace {segundos} {segundos === 1 ? "segundo" : "segundos"}
      </p>
      <dl className="mb-3 space-y-1 text-sm">
        <div className="flex flex-wrap gap-x-2">
          <dt className="font-medium">Participación:</dt>
          <dd className="text-muted-foreground">
            Total habilitados: {e.totalHabilitados} | Ya votaron: {votaron} (
            {porcentaje(votaron, e.totalHabilitados)}%) | Pendientes: {pendientes} (
            {porcentaje(pendientes, e.totalHabilitados)}%)
          </dd>
        </div>
        <div className="flex flex-wrap gap-x-2">
          <dt className="font-medium">Visibilidad del canal:</dt>
          <dd className="text-muted-foreground">
            Han visto el canal: {e.vieronCanal} | No han visto:{" "}
            {Math.max(0, e.totalHabilitados - e.vieronCanal)}
          </dd>
        </div>
      </dl>

      {visibles ? (
        <ol className="space-y-2">
          {resultados(e, finalizada).map((fila) => (
            <li key={fila.candidato?.id ?? "blanco"}>
              <FilaCandidato
                fila={fila}
                color={
                  fila.candidato
                    ? COLORES[(indice.get(fila.candidato.id) ?? 0) % COLORES.length]
                    : "bg-muted-foreground/60"
                }
              />
            </li>
          ))}
        </ol>
      ) : (
        <p className="rounded-lg border border-dashed px-4 py-6 text-center text-sm text-muted-foreground">
          Los resultados se publican cuando cierre la votación.
        </p>
      )}
    </section>
  )
}

function FilaCandidato({ fila, color }: { fila: FilaResultado; color: string }) {
  const c = fila.candidato
  return (
    <article
      className={cn(
        "flex items-center gap-3 rounded-lg border px-3 py-2.5",
        fila.ganador && "border-primary bg-primary text-primary-foreground",
      )}
    >
      {c && (
        <>
          <span
            className={cn(
              "w-7 shrink-0 font-bold tabular-nums",
              !fila.ganador && "text-muted-foreground",
            )}
          >
            {c.numero}
          </span>
          <FotoCandidato url={c.fotoUrl} nombre={c.nombre} className="size-14" />
        </>
      )}
      <div className="min-w-0 flex-1">
        <h4 className="truncate font-semibold">{c ? c.nombre : "Voto en blanco"}</h4>
        {c?.lema && (
          <p className={cn("truncate text-sm", fila.ganador ? "opacity-90" : "text-muted-foreground")}>
            {c.lema}
          </p>
        )}
        <div className="mt-1 flex items-center gap-3">
          <div
            role="meter"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={fila.porcentaje}
            aria-label={`${c ? c.nombre : "Voto en blanco"}: ${fila.porcentaje}%`}
            className={cn(
              "h-3 max-w-72 flex-1 overflow-hidden rounded-sm",
              fila.ganador
                ? "bg-white/30"
                : "bg-[repeating-linear-gradient(135deg,var(--muted)_0_2px,transparent_2px_5px)]",
            )}
          >
            <div
              className={cn("h-full rounded-sm transition-[width] duration-500 motion-reduce:transition-none", color)}
              style={{ width: `${fila.porcentaje}%` }}
            />
          </div>
          <span className={cn("w-10 text-sm tabular-nums", !fila.ganador && "text-muted-foreground")}>
            {fila.porcentaje}%
          </span>
        </div>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1 self-stretch">
        {fila.ganador && (
          <span className="flex items-center gap-1 text-lg font-semibold">
            <MedalIcon aria-hidden className="size-5 text-yellow" />
            Ganador
          </span>
        )}
        <span className="mt-auto flex items-center gap-1 text-sm font-semibold whitespace-nowrap">
          <BallotIcon aria-hidden className={cn("size-4", !fila.ganador && "text-muted-foreground")} />
          {fila.votos} {fila.votos === 1 ? "voto" : "votos"}
        </span>
      </div>
    </article>
  )
}

// Recordar el cierre es una preferencia del navegador; si falla, se vuelve a mostrar.
const claveBienvenida = (id: number) => `chat-bienvenida-cerrada-${id}`

function leerCerrada(id: number) {
  try {
    return localStorage.getItem(claveBienvenida(id)) === "1"
  } catch {
    return false
  }
}

// Mensaje de inicio que todo canal de elección trae al crearse.
export function EleccionBienvenida({ eleccion: e }: { eleccion: Eleccion }) {
  const [cerrada, setCerrada] = useState(() => leerCerrada(e.conversacionId))
  if (cerrada) return null

  const cerrar = () => {
    setCerrada(true)
    try {
      localStorage.setItem(claveBienvenida(e.conversacionId), "1")
    } catch {
      // Sin almacenamiento solo dura hasta recargar.
    }
  }

  return (
    <section
      aria-label="Bienvenida"
      className="relative mb-4 rounded-xl border bg-card py-3 pr-10 pl-4"
    >
      <h3 className="font-semibold">
        <span aria-hidden>👋 </span>Te damos la bienvenida a {e.nombre}
      </h3>
      <p className="text-sm text-muted-foreground">
        {e.esCreador ? "Creaste este canal." : `${e.creadoPor} creó este canal.`} Este es el
        principio del canal {e.nombre}.
      </p>
      <button
        type="button"
        aria-label="Cerrar bienvenida"
        onClick={cerrar}
        className="absolute top-2.5 right-2.5 grid size-7 place-items-center rounded-md text-muted-foreground hover:bg-muted/60 hover:text-foreground focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
      >
        <XIcon className="size-4" />
      </button>
    </section>
  )
}
