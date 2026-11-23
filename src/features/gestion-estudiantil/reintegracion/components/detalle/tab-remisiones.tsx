import { useCallback, useMemo, useState } from "react"

import { DataTable } from "@/components/data-table"
import { useNotify } from "@/components/notice/notice-context"
import { Skeleton } from "@/components/ui/skeleton"
import { getErrorMessage } from "@/lib/api-client"
import { downloadReport } from "@/lib/report-client"

import {
  DialogoGestionRemision,
  DialogoRespuestaRemision,
  type ResumenRemision,
} from "@/features/gestion-estudiantil/commons/components/remisiones/dialogos-remision"
import { useRemisionesQuery } from "@/features/gestion-estudiantil/reintegracion/api/query/use-remisiones-query"
import type { RemisionRow } from "@/features/gestion-estudiantil/reintegracion/api/types"
import { buildColumnsRemisiones } from "@/features/gestion-estudiantil/reintegracion/components/detalle/columns-remisiones"
import { DialogoDetalleRemision } from "@/features/gestion-estudiantil/reintegracion/components/dialogos/dialogo-detalle-remision"
import { useTablaLocal } from "@/features/gestion-estudiantil/reintegracion/hooks/use-tabla-local"

const getRowId = (f: RemisionRow) => String(f.id)
const SIN_FILAS: RemisionRow[] = []

type Abierto = { accion: "ver" | "respuesta" | "gestion"; fila: RemisionRow } | null

const resumenDe = (r: RemisionRow): ResumenRemision => ({
  id: r.id,
  entidad_nombre: r.entidad_nombre,
  fecha_remision: r.fecha_remision,
  fecha_esperada: r.fecha_esperada,
  estado_etiqueta: r.estado_etiqueta,
  vencida: r.vencida,
})

/**
 * Pestaña Remisiones (§10.4, G.9.REM.2): tabla con Ver detalle, Registrar respuesta, Registrar gestión y
 * Descargar remisión externa por fila; las de escritura se habilitan con las banderas de la fila.
 */
export function TabRemisiones({ casoId }: { casoId: number }) {
  const { notify } = useNotify()
  const q = useRemisionesQuery(casoId)
  const [abierto, setAbierto] = useState<Abierto>(null)
  const [descargando, setDescargando] = useState<number | null>(null)

  const descargar = useCallback(
    async (fila: RemisionRow) => {
      setDescargando(fila.id)
      const r = await downloadReport("remision-externa", { format: "pdf", filters: { FK_REMISION: fila.id } })
      setDescargando(null)
      if (r.status !== "ok") notify(r.message, { variant: "error" })
    },
    [notify],
  )

  const columns = useMemo(
    () =>
      buildColumnsRemisiones({
        onVer: (fila) => setAbierto({ accion: "ver", fila }),
        onResponder: (fila) => setAbierto({ accion: "respuesta", fila }),
        onGestion: (fila) => setAbierto({ accion: "gestion", fila }),
        onDescargar: descargar,
        descargando,
      }),
    [descargar, descargando],
  )
  const table = useTablaLocal({
    columns,
    data: q.data ?? SIN_FILAS,
    getRowId,
    storageKey: "reintegracion-remisiones-column-visibility",
  })
  const cerrar = useCallback(() => setAbierto(null), [])

  if (q.isPending) return <Skeleton className="my-4 h-32" />

  return (
    <div className="py-4">
      <DataTable
        table={table}
        isPending={false}
        isError={q.isError}
        onRetry={q.refetch}
        errorMessage={q.error ? getErrorMessage(q.error) : undefined}
        emptyMessage="El caso aún no tiene remisiones."
      />
      {abierto?.accion === "ver" && <DialogoDetalleRemision remision={abierto.fila} onClose={cerrar} />}
      {abierto?.accion === "respuesta" && <DialogoRespuestaRemision remision={resumenDe(abierto.fila)} onClose={cerrar} />}
      {abierto?.accion === "gestion" && <DialogoGestionRemision remision={resumenDe(abierto.fila)} onClose={cerrar} />}
    </div>
  )
}
