import { useEffect, useState } from "react"
import { Link } from "@tanstack/react-router"
import { useQueryClient } from "@tanstack/react-query"
import { format } from "date-fns"
import { es } from "date-fns/locale"

import { PrepareOfflineDialog } from "@/components/offline/prepare-offline-dialog"
import { Button } from "@/components/ui/button"
import { CloudSyncIcon } from "@/components/ui/icons"
import { Progress } from "@/components/ui/progress"
import { paths } from "@/config/paths"
import { retryAll, syncNow } from "@/lib/offline/outbox/engine"
import { useOutboxOps, useOutboxSummary } from "@/lib/offline/outbox/hooks"
import { getOutboxHandler } from "@/lib/offline/outbox/registry"
import { useConnectivity } from "@/lib/offline/use-connectivity"
import { buildSyncReport, type SyncReportItem } from "@/features/offline/lib/sync-report"

type Fase = "listo" | "sincronizando" | "refrescando" | "terminado"

function titulo(item: SyncReportItem, payloadOf: (id: string) => unknown) {
  const d = getOutboxHandler(item.kind)?.describe(payloadOf(item.id) as never)
  return d?.titulo ?? item.kind
}

/**
 * "Sincronizar ahora" (offline de meses, D-11). El día que el docente llega a
 * la ciudad: sube toda la cola en lotes (el motor ya envía de a 3, reintenta
 * con backoff y sobrevive a cortes porque las ops viven en IndexedDB), muestra
 * qué subió, qué quedó en conflicto y qué se rechazó y por qué, y después
 * refresca todos los datos guardados.
 */
export function SincronizarPage() {
  const queryClient = useQueryClient()
  const { status } = useConnectivity()
  const summary = useOutboxSummary()
  const ops = useOutboxOps()
  const [fase, setFase] = useState<Fase>("listo")
  const [inicio, setInicio] = useState<string[]>([])
  const [prepareOpen, setPrepareOpen] = useState(false)
  const offline = status === "offline"

  async function sincronizar() {
    setInicio(ops.filter((op) => op.status !== "done").map((op) => op.id))
    setFase("sincronizando")
    await retryAll()
    // Varios lotes seguidos: un lote termina cuando no queda nada listo, pero
    // una conexión mala deja ops en `retry` con backoff; `syncNow` encadena.
    await syncNow()
  }

  // Al terminar el envío (sin lote en curso) se refresca todo lo persistible.
  useEffect(() => {
    if (fase !== "sincronizando" || summary.syncing) return
    setFase("refrescando")
    void queryClient
      .refetchQueries({ predicate: (query) => Boolean(query.meta?.offline), type: "all" })
      .catch(() => undefined)
      .finally(() => setFase("terminado"))
  }, [fase, summary.syncing, queryClient])

  const report = fase === "terminado" ? buildSyncReport(inicio, ops) : null
  const payloadOf = (id: string) => ops.find((op) => op.id === id)?.payload
  const progreso = summary.batchTotal ? Math.round((summary.batchDone / summary.batchTotal) * 100) : 0

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 p-4">
      <h1 className="text-xl font-semibold">Sincronizar ahora</h1>
      <p className="text-muted-foreground text-sm">
        Sube a la plataforma todo lo que registraste sin conexión ({summary.total} cambios pendientes). Si la
        conexión se corta, vuelve a intentarlo: lo que ya subió no se repite y lo pendiente sigue guardado en este
        equipo.
      </p>

      {summary.needsLogin && (
        <p role="alert" className="rounded-md bg-orange-22 px-3 py-2 text-sm text-orange">
          Tu sesión venció. <a href={paths.auth.login.getHref("/app/sincronizar")} className="underline">Inicia sesión</a> para enviar los cambios; no se pierde nada.
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        <Button disabled={offline || fase === "sincronizando" || fase === "refrescando"} onClick={() => void sincronizar()}>
          <CloudSyncIcon data-icon="inline-start" />
          {fase === "terminado" ? "Sincronizar de nuevo" : "Sincronizar ahora"}
        </Button>
        <Button variant="outline" color="primary" disabled={offline} onClick={() => setPrepareOpen(true)}>
          Preparar todo para trabajar sin conexión
        </Button>
      </div>
      {offline && <p className="text-muted-foreground text-sm">Necesitas conexión para sincronizar.</p>}

      {(fase === "sincronizando" || fase === "refrescando") && (
        <Progress value={fase === "refrescando" ? 100 : progreso} aria-label="Progreso de la sincronización">
          <span>
            {fase === "refrescando"
              ? "Actualizando los datos guardados…"
              : `Enviando ${summary.batchDone} de ${summary.batchTotal}…`}
          </span>
        </Progress>
      )}

      {report && (
        <section aria-label="Resumen de la sincronización" className="flex flex-col gap-3 rounded-md border p-3 text-sm">
          <p className="font-semibold">Resumen</p>
          <ul className="flex flex-col gap-1">
            <li className="text-green">Subidos: {report.subidos}</li>
            <li className={report.conflictos.length ? "text-orange" : undefined}>Conflictos: {report.conflictos.length}</li>
            <li className={report.rechazados.length ? "text-red" : undefined}>Rechazados: {report.rechazados.length}</li>
            {report.pendientes > 0 && <li>Siguen pendientes (reintento automático): {report.pendientes}</li>}
          </ul>
          {[...report.conflictos, ...report.rechazados].length > 0 && (
            <ul className="flex flex-col gap-1">
              {[...report.conflictos, ...report.rechazados].map((item) => (
                <li key={item.id}>
                  <span className="font-medium">{titulo(item, payloadOf)}</span>{" "}
                  <span className="text-muted-foreground">
                    ({format(item.createdAt, "d MMM, HH:mm", { locale: es })})
                  </span>
                  {item.motivo && <span>: {item.motivo}</span>}
                </li>
              ))}
            </ul>
          )}
          {[...report.conflictos, ...report.rechazados].length > 0 && (
            <Link to={paths.app.pendientes.getHref()} className="text-primary underline">
              Resolver en Cambios pendientes
            </Link>
          )}
          <p className="text-muted-foreground">Los datos guardados en este equipo ya están actualizados.</p>
        </section>
      )}
      <PrepareOfflineDialog open={prepareOpen} onOpenChange={setPrepareOpen} />
    </div>
  )
}
