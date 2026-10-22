import { format } from "date-fns"
import { es } from "date-fns/locale"

import { ConfirmRemoveButton } from "@/components/confirm-remove-button"
import { Button } from "@/components/ui/button"
import { resolveKeepMine } from "@/lib/offline/outbox/engine"
import { discardSaga, retrySagaFrom, sagaOf, skipSagaStep, type SagaView } from "@/lib/offline/outbox/saga"
import type { OutboxOp } from "@/lib/offline/outbox/types"
import { cn } from "@/lib/utils"

import { PendingStatusBadge } from "@/features/offline/components/pending-badge"
import { SagaStatusBadge } from "@/features/offline/components/saga-badge"

/**
 * Guardados multi-paso (sagas del planeador, Fase 3) en "Cambios
 * pendientes": cada saga con sus pasos en orden, el estado de cada uno y el
 * motivo del rechazo. Desde el paso que falló se puede reintentar, omitirlo
 * (siguen los demás) o descartar lo que falta.
 */
export function SagaList({ sagas }: { sagas: SagaView[] }) {
  if (sagas.length === 0) return null
  return (
    <ul className="flex flex-col gap-3 px-4 py-3" aria-label="Guardados en varios pasos">
      {sagas.map((saga) => (
        <li key={saga.id} className="rounded-md border p-3" data-slot="saga" data-status={saga.status}>
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-semibold">{saga.titulo}</p>
            {saga.status === "done" ? (
              <span className="text-green text-xs">Sincronizado</span>
            ) : (
              <SagaStatusBadge status={saga.status} />
            )}
            <span className="text-muted-foreground text-xs">{format(saga.createdAt, "d MMM, HH:mm", { locale: es })}</span>
            {saga.status !== "done" && (
              <div className="ml-auto">
                <ConfirmRemoveButton
                  title="Descartar lo que falta"
                  label={`Descartar ${saga.titulo}`}
                  description="¿Descartar los pasos que aún no llegan al servidor? Lo que ya se guardó se conserva."
                  onConfirm={() => discardSaga(saga.id)}
                />
              </div>
            )}
          </div>
          <ol className="mt-2 flex flex-col gap-1">
            {saga.steps.map((op) => (
              <SagaStep key={op.id} op={op} />
            ))}
          </ol>
        </li>
      ))}
    </ul>
  )
}

/**
 * Conflicto por VERSION (BE-3B): cuál editó el docente y cuál tiene hoy el
 * servidor. "Conservar mis cambios" reenvía sobre la versión actual (pisa lo
 * que haya cambiado otra persona en los campos que el docente editó).
 */
function ConflictoVersion({ op }: { op: OutboxOp }) {
  const base = (op.payload as { check?: { baseVersion?: number | null } } | null)?.check?.baseVersion
  const actual = op.conflict?.serverVersion
  if (base == null || !actual || !/^[0-9]+$/.test(actual)) return null
  return (
    <span className="text-muted-foreground basis-full pl-7 text-xs" data-slot="saga-conflict-version">
      Editaste la versión {base} y en el servidor ya va en la {actual}. "Conservar mis cambios" los aplica sobre la
      versión actual; si prefieres lo del servidor, descarta lo que falta.
    </span>
  )
}

function SagaStep({ op }: { op: OutboxOp }) {
  const meta = sagaOf(op)
  const problema = op.status === "rejected" || op.status === "conflict" || op.status === "blocked"
  return (
    <li className="flex flex-wrap items-center gap-2 text-sm" data-slot="saga-step" data-status={op.status}>
      <span className="text-muted-foreground w-5 text-right tabular-nums">{(meta?.step ?? 0) + 1}.</span>
      <span>{meta?.label}</span>
      {op.status === "done" ? (
        <span className="text-green text-xs">{op.resultNote ?? "Guardado"}</span>
      ) : (
        <PendingStatusBadge status={op.status} />
      )}
      {op.lastError && op.status !== "done" && (
        <span className={cn("basis-full pl-7 text-xs", problema ? "text-red" : "text-muted-foreground")}>
          {op.lastError.message}
        </span>
      )}
      {op.status === "done" && op.resultNote && op.resultNote !== "Paso omitido por el docente." && (
        <span className="text-muted-foreground basis-full pl-7 text-xs">{op.resultNote}</span>
      )}
      {op.status === "conflict" && <ConflictoVersion op={op} />}
      {(op.status === "rejected" || op.status === "conflict") && (
        <div className="flex basis-full flex-wrap gap-1 pl-7">
          {op.status === "conflict" ? (
            <Button size="sm" variant="soft" color="warning" onClick={() => void resolveKeepMine(op.id)}>
              Conservar mis cambios
            </Button>
          ) : (
            <Button size="sm" variant="soft" color="primary" onClick={() => void retrySagaFrom(op.id)}>
              Reintentar desde aquí
            </Button>
          )}
          {(meta?.step ?? 0) > 0 && (
            <Button size="sm" variant="ghost" color="neutral" onClick={() => void skipSagaStep(op.id)}>
              Omitir este paso
            </Button>
          )}
        </div>
      )}
    </li>
  )
}
