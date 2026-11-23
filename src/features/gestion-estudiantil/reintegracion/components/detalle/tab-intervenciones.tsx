import { useCallback, useMemo, useState } from "react"

import { DataTable } from "@/components/data-table"
import { useNotify } from "@/components/notice/notice-context"
import { Button } from "@/components/ui/button"
import { ControlPointIcon } from "@/components/ui/icons"
import { downloadReport } from "@/lib/report-client"

import type { CasoDetalle, IntervencionRow } from "@/features/gestion-estudiantil/reintegracion/api/types"
import { buildColumnsIntervenciones } from "@/features/gestion-estudiantil/reintegracion/components/detalle/columns-intervenciones"
import { DialogoDetalleIntervencion } from "@/features/gestion-estudiantil/reintegracion/components/dialogos/dialogo-detalle-intervencion"
import { DialogoModificarIntervencion } from "@/features/gestion-estudiantil/reintegracion/components/dialogos/dialogo-modificar-intervencion"
import { useTablaLocal } from "@/features/gestion-estudiantil/reintegracion/hooks/use-tabla-local"

const getRowId = (f: IntervencionRow) => String(f.id)
const nada = () => {}

type Abierto = { accion: "ver" | "modificar"; id: number } | null

/**
 * Pestaña Intervenciones (§10.3, G.9.INT.2): tabla cronológica con Ver detalle, Modificar y Descargar ficha por
 * fila; «Registrar intervención» se habilita con la bandera del caso.
 */
export function TabIntervenciones({ caso, onRegistrar }: { caso: CasoDetalle; onRegistrar: () => void }) {
  const { notify } = useNotify()
  const [abierto, setAbierto] = useState<Abierto>(null)
  const [descargando, setDescargando] = useState<number | null>(null)
  const filas = caso.intervenciones

  const descargar = useCallback(
    async (fila: IntervencionRow) => {
      setDescargando(fila.id)
      const r = await downloadReport("reintegracion-ficha-visita", {
        format: "pdf",
        filters: { FK_CASO: caso.id, FK_INTERVENCION: fila.id },
      })
      setDescargando(null)
      if (r.status !== "ok") notify(r.message, { variant: "error" })
    },
    [caso.id, notify],
  )

  const columns = useMemo(
    () =>
      buildColumnsIntervenciones({
        onVer: (f) => setAbierto({ accion: "ver", id: f.id }),
        onModificar: (f) => setAbierto({ accion: "modificar", id: f.id }),
        onDescargar: descargar,
        descargando,
      }),
    [descargar, descargando],
  )
  const table = useTablaLocal({ columns, data: filas, getRowId, storageKey: "reintegracion-intervenciones-column-visibility" })
  const cerrar = useCallback(() => setAbierto(null), [])

  return (
    <div className="flex flex-col gap-3 py-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground" aria-live="polite">
          {filas.length} {filas.length === 1 ? "intervención" : "intervenciones"}
        </p>
        <Button size="sm" type="button" disabled={!caso.banderas.puede_registrar_intervencion} onClick={onRegistrar}>
          <ControlPointIcon data-icon="inline-start" />
          Registrar intervención
        </Button>
      </div>
      <DataTable
        table={table}
        isPending={false}
        isError={false}
        onRetry={nada}
        emptyMessage="El caso aún no tiene intervenciones."
      />
      {abierto?.accion === "ver" && <DialogoDetalleIntervencion caso={caso} intervencionId={abierto.id} onClose={cerrar} />}
      {abierto?.accion === "modificar" && (
        <DialogoModificarIntervencion caso={caso} intervencionId={abierto.id} onClose={cerrar} />
      )}
    </div>
  )
}
