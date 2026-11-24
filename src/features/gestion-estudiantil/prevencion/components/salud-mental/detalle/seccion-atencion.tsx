"use no memo"

import { useCallback, useMemo, useState } from "react"

import { DataTable } from "@/components/data-table"
import { useNotify } from "@/components/notice/notice-context"
import { Button } from "@/components/ui/button"
import { ControlPointIcon } from "@/components/ui/icons"
import { downloadReport } from "@/lib/report-client"

import {
  DialogoGestionRemision,
  DialogoRespuestaRemision,
  type ResumenRemision,
} from "@/features/gestion-estudiantil/commons/components/remisiones/dialogos-remision"
import { SeccionPlegable } from "@/features/gestion-estudiantil/commons/components/seccion-plegable"
import { prevencionKeys } from "@/features/gestion-estudiantil/prevencion/api/query-keys"
import type { SenalSMAtencion, SenalSMDetalle } from "@/features/gestion-estudiantil/prevencion/api/types"
import {
  buildColumnsAtenciones,
  type AccionAtencion,
} from "@/features/gestion-estudiantil/prevencion/components/salud-mental/detalle/columns-atenciones"
import type { useSenalDetalle } from "@/features/gestion-estudiantil/prevencion/hooks/use-senal-detalle"
import { DialogoDetalleRemision } from "@/features/gestion-estudiantil/reintegracion/components/dialogos/dialogo-detalle-remision"
import { useTablaLocal } from "@/features/gestion-estudiantil/reintegracion/hooks/use-tabla-local"

interface Props {
  senal: SenalSMDetalle
  d: ReturnType<typeof useSenalDetalle>
}

const getRowId = (a: SenalSMAtencion) => String(a.id)

type Abierto = { accion: "ver" | "gestion" | "respuesta"; atencion: SenalSMAtencion } | null

/**
 * Atención (G.8.SAL.4, 6, 8 y 9): tabla de acciones en orden cronológico; las que se remitieron a una entidad
 * enlazan su remisión externa común (ver detalle, descargar, registrar gestión y respuesta). Se registra después de valorar.
 */
export function SeccionAtencion({ senal: s, d }: Props) {
  const { notify } = useNotify()
  const sinValorar = s.estado === "POR_VALORAR"
  const [abierto, setAbierto] = useState<Abierto>(null)
  const [descargando, setDescargando] = useState<number | null>(null)

  const onAccion = useCallback(
    async (atencion: SenalSMAtencion, accion: AccionAtencion) => {
      const r = atencion.remision
      if (!r) return
      if (accion === "descargar") {
        setDescargando(r.id)
        const res = await downloadReport("remision-externa", { format: "pdf", filters: { FK_REMISION: r.id } })
        setDescargando(null)
        if (res.status !== "ok") notify(res.message, { variant: "error" })
      } else setAbierto({ accion, atencion })
    },
    [notify],
  )
  const columns = useMemo(() => buildColumnsAtenciones({ onAccion, descargando }), [onAccion, descargando])
  const table = useTablaLocal({
    columns,
    data: s.atenciones,
    getRowId,
    storageKey: "prevencion-salud-mental-atenciones-column-visibility",
  })
  const cerrar = useCallback(() => setAbierto(null), [])

  const r = abierto?.atencion.remision
  const resumen: ResumenRemision | null = r
    ? {
        id: r.id,
        entidad_nombre: r.entidad_nombre,
        estudiante_nombre: s.estudiante_nombre,
        fecha_remision: r.fecha_remision,
        fecha_esperada: r.fecha_esperada,
        estado_etiqueta: r.estado_etiqueta,
        vencida: r.vencida,
      }
    : null

  return (
    <SeccionPlegable
      encuadrada
      comoSeccion
      titulo={sinValorar ? "Atención (se registra después de valorar)" : "Atención"}
      accion={
        !sinValorar && (
          <Button size="sm" type="button" variant="outline" color="neutral" disabled={!s.puede_atender} onClick={d.abrirAtencion}>
            <ControlPointIcon data-icon="inline-start" />
            Registrar atención
          </Button>
        )
      }
      contentClassName="flex flex-col gap-3 px-4 py-4"
    >
      <DataTable table={table} isPending={false} isError={false} onRetry={() => {}} emptyMessage="Aún no hay acciones registradas." />
      {abierto?.accion === "ver" && r && (
        <DialogoDetalleRemision remision={{ ...r, puede_gestionar: false, origen: "SALUD_MENTAL" }} onClose={cerrar} />
      )}
      {abierto?.accion === "gestion" && resumen && (
        <DialogoGestionRemision remision={resumen} onClose={cerrar} invalidar={prevencionKeys.all} />
      )}
      {abierto?.accion === "respuesta" && resumen && (
        <DialogoRespuestaRemision remision={resumen} onClose={cerrar} invalidar={prevencionKeys.all} />
      )}
    </SeccionPlegable>
  )
}
