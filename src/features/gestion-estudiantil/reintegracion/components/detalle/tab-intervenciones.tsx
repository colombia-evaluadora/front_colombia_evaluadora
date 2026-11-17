import { Button } from "@/components/ui/button"
import { ControlPointIcon } from "@/components/ui/icons"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

import { formatFecha } from "@/features/gestion-estudiantil/commons/utils/formatos"
import type { CasoDetalle, IntervencionRow } from "@/features/gestion-estudiantil/reintegracion/api/types"

const fechaDe = (i: IntervencionRow) => i.fecha_realizacion ?? i.fecha_programada ?? ""

/** «Programada para el …» mientras no se realiza; «Realizada el …» después. */
const realizacion = (i: IntervencionRow) =>
  i.fecha_realizacion
    ? `Realizada el ${formatFecha(i.fecha_realizacion)}`
    : i.fecha_programada
      ? `Programada para el ${formatFecha(i.fecha_programada)}`
      : "—"

/** Pestaña Intervenciones (§10.3), de solo lectura; «Registrar intervención» se habilita con la bandera del caso. */
export function TabIntervenciones({ caso, onRegistrar }: { caso: CasoDetalle; onRegistrar: () => void }) {
  const filas = caso.intervenciones
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
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Fecha</TableHead>
            <TableHead>Tipo</TableHead>
            <TableHead>Realización</TableHead>
            <TableHead>Resultado</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filas.length === 0 ? (
            <TableRow>
              <TableCell colSpan={4} className="text-center text-muted-foreground">
                El caso aún no tiene intervenciones.
              </TableCell>
            </TableRow>
          ) : (
            filas.map((i) => (
              <TableRow key={i.id}>
                <TableCell>{formatFecha(fechaDe(i))}</TableCell>
                <TableCell>{i.tipo_nombre}</TableCell>
                <TableCell>{realizacion(i)}</TableCell>
                <TableCell>{i.resultado_nombre ?? "—"}</TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  )
}
