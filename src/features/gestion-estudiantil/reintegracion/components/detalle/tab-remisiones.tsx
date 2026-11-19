import { ErrorNoticeBanner } from "@/components/notice/error-notice-banner"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

import { formatFecha } from "@/features/gestion-estudiantil/commons/utils/formatos"
import { useRemisionesQuery } from "@/features/gestion-estudiantil/reintegracion/api/query/use-remisiones-query"

/** Pestaña Remisiones (§10.4), de solo lectura: el registro y la gestión llegan con sus diálogos. */
export function TabRemisiones({ casoId }: { casoId: number }) {
  const q = useRemisionesQuery(casoId)
  const filas = q.data ?? []

  if (q.isPending) return <Skeleton className="my-4 h-32" />
  if (q.isError) return <ErrorNoticeBanner error={q.error} className="my-4" />

  return (
    <div className="py-4">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Fecha de remisión</TableHead>
            <TableHead>Entidad</TableHead>
            <TableHead>Motivo</TableHead>
            <TableHead>Fecha esperada</TableHead>
            <TableHead>Estado</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filas.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="text-center text-muted-foreground">
                El caso aún no tiene remisiones.
              </TableCell>
            </TableRow>
          ) : (
            filas.map((r) => (
              <TableRow key={r.id}>
                <TableCell>{formatFecha(r.fecha_remision)}</TableCell>
                <TableCell>{r.entidad_nombre}</TableCell>
                <TableCell className="max-w-96 whitespace-normal">{r.motivo}</TableCell>
                <TableCell>{formatFecha(r.fecha_esperada) || "—"}</TableCell>
                <TableCell>
                  <div className="flex flex-wrap items-center gap-1">
                    <Badge variant="soft" color={r.estado === "RESPONDIDA" ? "success" : "info"}>
                      <span>{r.estado_etiqueta}</span>
                    </Badge>
                    {r.vencida && (
                      <Badge variant="soft" color="destructive">
                        <span>Vencida</span>
                      </Badge>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  )
}
