import { useState } from "react"

import { ErrorNoticeBanner } from "@/components/notice/error-notice-banner"
import { Button } from "@/components/ui/button"
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { PaperclipIcon } from "@/components/ui/icons"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { getErrorMessage } from "@/lib/api-client"
import { fetchArchivoViewUrl } from "@/lib/files"

import { Dato } from "@/features/gestion-estudiantil/commons/components/dato"
import { formatFecha } from "@/features/gestion-estudiantil/commons/utils/formatos"
import { useSesionQuery } from "@/features/gestion-estudiantil/actividades-extracurriculares/api/query/use-actividades-query"
import { formatHoras } from "@/features/gestion-estudiantil/actividades-extracurriculares/utils/formatos-actividad"

/** Ver una sesión (solo lectura): fecha, duración, observación, soporte descargable y asistentes con sus horas. */
export function DialogoVerSesion({ sesionId, onClose }: { sesionId: number; onClose: () => void }) {
  const q = useSesionQuery(sesionId)
  const [errorSoporte, setErrorSoporte] = useState<string | null>(null)
  const s = q.data

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Sesión{s ? ` — ${s.actividad}` : ""}</DialogTitle>
          <DialogDescription>Detalle de la sesión y de sus asistentes.</DialogDescription>
        </DialogHeader>
        <ErrorNoticeBanner error={q.error} />
        {q.isPending ? (
          <Skeleton className="h-48" />
        ) : s ? (
          <div className="flex max-h-[60vh] flex-col gap-4 overflow-y-auto">
            <dl className="grid grid-cols-1 gap-x-8 gap-y-3 sm:grid-cols-3">
              <Dato label="Fecha">{formatFecha(s.fecha)}</Dato>
              <Dato label="Duración (horas)">{formatHoras(s.duracion_horas)}</Dato>
              <Dato label="Asistentes">
                {s.asistentes.length} de {s.inscritos}
              </Dato>
              <div className="sm:col-span-3">
                <Dato label="Observación">{s.observacion}</Dato>
              </div>
              {s.fk_tarchivo_soporte != null && (
                <div className="sm:col-span-3">
                  <Dato label="Soporte">
                    <Button
                      variant="link"
                      size="sm"
                      onClick={() => {
                        setErrorSoporte(null)
                        fetchArchivoViewUrl(s.fk_tarchivo_soporte!)
                          .then((t) => window.open(t.url, "_blank", "noopener"))
                          .catch((e) => setErrorSoporte(getErrorMessage(e)))
                      }}
                    >
                      <PaperclipIcon data-icon="inline-start" />
                      Abrir el soporte
                    </Button>
                    {errorSoporte && <span className="text-xs text-red">{errorSoporte}</span>}
                  </Dato>
                </div>
              )}
            </dl>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Estudiante</TableHead>
                  <TableHead>Documento</TableHead>
                  <TableHead className="text-right">Horas</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {s.asistentes.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-muted-foreground">
                      Sin asistentes.
                    </TableCell>
                  </TableRow>
                ) : (
                  s.asistentes.map((x) => (
                    <TableRow key={x.participante}>
                      <TableCell>{x.estudiante}</TableCell>
                      <TableCell>{x.estudiante_documento ?? "—"}</TableCell>
                      <TableCell className="text-right tabular-nums">{formatHoras(x.horas)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        ) : null}
        <DialogFooter>
          <DialogClose render={<Button size="sm" type="button" variant="outline" color="neutral" />}>Cerrar</DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
