import { useState } from "react"
import { Link } from "@tanstack/react-router"
import { format } from "date-fns"
import { es } from "date-fns/locale"

import { ConfirmRemoveButton } from "@/components/confirm-remove-button"
import {
  TableScreen,
  TableScreenActions,
  TableScreenBody,
  TableScreenHeader,
  TableScreenTitle,
  TableScreenToolbar,
} from "@/components/layout/table-screen"
import { Button } from "@/components/ui/button"
import { ArrowCounterClockwiseIcon, FileDownloadOutlinedIcon } from "@/components/ui/icons"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { paths } from "@/config/paths"
import { discardOp, retryAll, retryOp, syncNow } from "@/lib/offline/outbox/engine"
import { useOutboxOps, useOutboxSummary } from "@/lib/offline/outbox/hooks"
import { dependentsOf } from "@/lib/offline/outbox/policy"
import { getOutboxHandler } from "@/lib/offline/outbox/registry"
import { groupSagas, sagaOf, type SagaView } from "@/lib/offline/outbox/saga"
import { getOutboxUser, readLog } from "@/lib/offline/outbox/store"
import type { OutboxOp } from "@/lib/offline/outbox/types"
import { useConnectivity } from "@/lib/offline/use-connectivity"
import { cn } from "@/lib/utils"

import { ConflictDialog, legible } from "@/features/offline/components/conflict-dialog"
import { PendingStatusBadge } from "@/features/offline/components/pending-badge"
import { SagaList } from "@/features/offline/components/saga-list"
import type { PendientesSearch } from "@/features/offline/schema"
import { pendientesRoute } from "@/router"

const FILTROS: { value: NonNullable<PendientesSearch["estado"]> | "todos"; label: string }[] = [
  { value: "todos", label: "Todos" },
  { value: "pendientes", label: "Pendientes" },
  { value: "error", label: "Con problemas" },
  { value: "conflictos", label: "Conflictos" },
  { value: "sincronizados", label: "Sincronizados (24 h)" },
]

function filtrar(ops: OutboxOp[], estado: PendientesSearch["estado"]): OutboxOp[] {
  switch (estado) {
    case "pendientes":
      return ops.filter((o) => ["pending", "retry", "inflight"].includes(o.status))
    case "error":
      return ops.filter((o) => o.status === "rejected" || o.status === "blocked")
    case "conflictos":
      return ops.filter((o) => o.status === "conflict")
    case "sincronizados":
      return ops.filter((o) => o.status === "done")
    default:
      return ops.filter((o) => o.status !== "done")
  }
}

/** Sagas (guardados multi-paso, Fase 3) con el mismo filtro que las ops sueltas. */
function filtrarSagas(sagas: SagaView[], estado: PendientesSearch["estado"]): SagaView[] {
  switch (estado) {
    case "pendientes":
      return sagas.filter((s) => s.status === "pending" || s.status === "syncing")
    case "error":
      return sagas.filter((s) => s.status === "partial" || s.status === "rejected")
    case "conflictos":
      return sagas.filter((s) => s.status === "conflict")
    case "sincronizados":
      return sagas.filter((s) => s.status === "done")
    default:
      return sagas.filter((s) => s.status !== "done")
  }
}

/** Descarga outbox (sin blobs) + log: lo que soporte necesita para diagnosticar. */
async function exportarRegistro(ops: OutboxOp[]) {
  const sub = getOutboxUser()
  const log = sub ? await readLog(sub) : []
  const data = {
    exportadoEn: new Date().toISOString(),
    // Sin datos personales por defecto: el payload no se incluye, solo el tipo y su estado.
    outbox: ops.map(({ payload: _payload, ...op }) => op),
    log,
  }
  const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }))
  const a = document.createElement("a")
  a.href = url
  a.download = `ce-pendientes-${format(new Date(), "yyyy-MM-dd")}.json`
  a.click()
  URL.revokeObjectURL(url)
}

export function PendientesPage() {
  const { estado } = pendientesRoute.useSearch()
  const navigate = pendientesRoute.useNavigate()
  const ops = useOutboxOps()
  const summary = useOutboxSummary()
  const { status } = useConnectivity()
  const [conflicto, setConflicto] = useState<OutboxOp | null>(null)
  const [detalle, setDetalle] = useState<string | null>(null)
  // Los pasos de una saga se muestran agrupados (SagaList), no como filas sueltas.
  const visibles = filtrar(
    ops.filter((o) => !sagaOf(o)),
    estado,
  )
  const sagas = filtrarSagas(groupSagas(ops), estado)
  const offline = status === "offline"

  return (
    <TableScreen>
      <TableScreenHeader>
        <TableScreenTitle
          description="Lo que hiciste sin conexión y aún no llega al servidor."
          action={
            <Button
              variant="fill"
              color="primary"
              size="sm"
              disabled={offline || summary.syncing || summary.total === 0}
              onClick={() => void syncNow()}
            >
              {offline ? "Sin conexión" : summary.syncing ? "Sincronizando…" : "Sincronizar ahora"}
            </Button>
          }
        >
          Cambios pendientes
        </TableScreenTitle>
        <TableScreenToolbar>
          <nav className="flex flex-wrap gap-1" aria-label="Filtrar por estado">
            {FILTROS.map((f) => (
              <Button
                key={f.value}
                size="sm"
                variant={(estado ?? "todos") === f.value ? "soft" : "ghost"}
                color="primary"
                onClick={() =>
                  void navigate({ search: { estado: f.value === "todos" ? undefined : f.value }, replace: true })
                }
              >
                {f.label}
              </Button>
            ))}
          </nav>
          <TableScreenActions>
            <Button variant="outline" color="neutral" size="sm" onClick={() => void retryAll()}>
              <ArrowCounterClockwiseIcon data-icon="inline-start" />
              Reintentar todos
            </Button>
            <Button
              variant="outline"
              color="neutral"
              size="sm"
              title="Comparte este archivo con soporte si algo no se sincroniza."
              onClick={() => void exportarRegistro(ops)}
            >
              <FileDownloadOutlinedIcon data-icon="inline-start" />
              Exportar registro
            </Button>
          </TableScreenActions>
        </TableScreenToolbar>
      </TableScreenHeader>
      <TableScreenBody>
        <SagaList sagas={sagas} />
        {visibles.length === 0 && sagas.length > 0 ? null : visibles.length === 0 ? (
          <p className="text-muted-foreground px-4 py-10 text-center text-sm" data-slot="pendientes-vacio">
            No tienes cambios pendientes. Todo está sincronizado.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha</TableHead>
                <TableHead>Qué</TableHead>
                <TableHead>Dónde</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Intentos</TableHead>
                <TableHead>Último error</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visibles.map((op) => {
                const d = getOutboxHandler(op.kind)?.describe(op.payload as never)
                const dependientes = dependentsOf(ops, op.id).length
                return (
                  <TableRow key={op.id} data-slot="pendiente-row" data-status={op.status}>
                    <TableCell className="whitespace-nowrap">
                      {format(op.createdAt, "d MMM, HH:mm", { locale: es })}
                    </TableCell>
                    <TableCell>
                      <button
                        type="button"
                        className="text-left hover:underline"
                        onClick={() => setDetalle(detalle === op.id ? null : op.id)}
                      >
                        {d?.titulo ?? op.kind}
                      </button>
                      {d?.detalle && <p className="text-muted-foreground text-xs">{d.detalle}</p>}
                      {op.resultNote && <p className="text-xs">{op.resultNote}</p>}
                      {detalle === op.id && (
                        <div className="mt-1 text-xs">
                          <p className="break-words">{legible(op.payload)}</p>
                          <details>
                            <summary>Detalles técnicos</summary>
                            <pre className="max-w-md overflow-auto">{JSON.stringify(op, null, 2)}</pre>
                          </details>
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      {d?.ruta ? (
                        <Link to={d.ruta} className="text-primary text-sm hover:underline">
                          Abrir
                        </Link>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell>
                      {op.status === "done" ? (
                        <span className="text-green text-xs">Sincronizado</span>
                      ) : (
                        <PendingStatusBadge status={op.status} />
                      )}
                    </TableCell>
                    <TableCell className="tabular-nums">{op.attempts}</TableCell>
                    <TableCell className={cn("max-w-xs text-xs", op.lastError && "text-red")}>
                      {op.lastError?.message ?? "—"}
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        {op.status === "conflict" && (
                          <Button size="sm" variant="soft" color="warning" onClick={() => setConflicto(op)}>
                            Resolver
                          </Button>
                        )}
                        {["retry", "rejected", "blocked", "pending"].includes(op.status) && (
                          <Button size="sm" variant="ghost" color="neutral" onClick={() => void retryOp(op.id)}>
                            Reintentar
                          </Button>
                        )}
                        {op.status !== "done" && op.status !== "inflight" && (
                          <ConfirmRemoveButton
                            title="Descartar"
                            label={`Descartar ${d?.titulo ?? "cambio"}`}
                            description={
                              dependientes > 0
                                ? `¿Descartar este cambio? Se perderá y no se enviará al servidor. También se descartarán ${dependientes} cambios que dependen de este.`
                                : "¿Descartar este cambio? Se perderá y no se enviará al servidor."
                            }
                            onConfirm={() => discardOp(op.id)}
                          />
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        )}
        <p className="text-muted-foreground px-4 py-3 text-xs">
          <Link to={paths.app.root.getHref()} className="hover:underline">
            Volver al inicio
          </Link>
        </p>
      </TableScreenBody>
      <ConflictDialog op={conflicto} onClose={() => setConflicto(null)} />
    </TableScreen>
  )
}
