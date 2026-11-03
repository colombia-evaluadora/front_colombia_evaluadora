import { createContext, useContext, type ReactNode } from "react"
import type { ColumnDef } from "@tanstack/react-table"

import { InfoIcon } from "@/components/ui/icons"
import { cn } from "@/lib/utils"

// Regla 16: un período Cerrado (o abierto con "Ver") se muestra en solo
// lectura con todas sus pestañas. La página lo decide y cada pestaña lo lee.
export type PeriodReadOnlyReason = "cerrado" | "ver" | null

const PeriodReadOnlyContext = createContext<PeriodReadOnlyReason>(null)

export function PeriodReadOnlyProvider({
  reason,
  children,
}: {
  reason: PeriodReadOnlyReason
  children: ReactNode
}) {
  return <PeriodReadOnlyContext value={reason}>{children}</PeriodReadOnlyContext>
}

export function usePeriodReadOnly() {
  const reason = useContext(PeriodReadOnlyContext)
  return { readOnly: reason != null, reason }
}

/** Sin la columna de acciones ni la de selección: en solo lectura no hay qué hacer por fila. */
export function withoutRowActions<T>(columns: ColumnDef<T>[], readOnly: boolean): ColumnDef<T>[] {
  if (!readOnly) return columns
  return columns.filter((c) => c.id !== "actions" && c.id !== "select")
}

/** Aviso general de la pantalla (no uno por pestaña): por qué no se puede modificar. */
export function PeriodReadOnlyNotice({
  what,
  plural = false,
  className,
}: {
  what: string
  plural?: boolean
  className?: string
}) {
  const { reason } = usePeriodReadOnly()
  if (reason == null) return null
  const verb = plural ? "son" : "es"
  return (
    <p
      className={cn(
        "flex items-start gap-2 rounded-md border border-blue-stroke bg-blue-22 px-3 py-2 text-sm",
        className,
      )}
    >
      <InfoIcon className="mt-0.5 size-4 shrink-0 text-blue" aria-hidden />
      {reason === "cerrado"
        ? `El período está cerrado: ${what} ${verb} de solo lectura.`
        : `Vista de consulta: ${what} ${verb} de solo lectura.`}
    </p>
  )
}
