import { useState, type ReactNode } from "react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { FileDownloadOutlinedIcon, FileXlsIcon, SpinnerIcon, TrashIcon, WarningIcon, XIcon } from "@/components/ui/icons"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { NoticeBanner } from "@/components/notice/notice-banner"
import { useNotify } from "@/components/notice/notice-context"
import { getErrorMessage } from "@/lib/api-client"
import { cn } from "@/lib/utils"

import {
  useDescargarListaSorteo,
  useEliminarConvocatoria,
  useListaSorteoQuery,
  useResultadoQuery,
} from "@/features/coverage/matricula-complementaria/api/convocatorias"
import type { Convocatoria } from "@/features/coverage/matricula-complementaria/api/types"
import { ESTADO_OPCION, Marca, fecha, nombreCupo } from "@/features/coverage/matricula-complementaria/api/ui-mappings"
import { Aviso, CampoSelect } from "@/features/coverage/matricula/components/dialogs/acciones/compartido"

type Error = { id: number; message: string } | null

function Cargando() {
  return (
    <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
      <SpinnerIcon className="animate-spin" aria-hidden />
      Cargando…
    </div>
  )
}

const num = "text-center tabular-nums"

/** Ver resultado (solo forma Abierta y Modo Automática): una fila por cupo, de consulta. */
export function DialogResultadoSeleccion({
  convocatoria: c,
  onOpenChange,
}: {
  convocatoria: Convocatoria
  onOpenChange: (open: boolean) => void
}) {
  const { data, isPending, isError, error } = useResultadoQuery(c.id)
  const orden = c.desempate === "SORTEO" ? "Continuidad primero y luego sorteo" : "Continuidad primero y luego orden de inscripción"
  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Resultado de la selección automática — Convocatoria {c.anio}</DialogTitle>
          {data ? (
            <DialogDescription>
              Ejecutada el {fecha(data.ejecutadaEl)}. Orden: {orden}. {data.postulaciones} postulaciones.
            </DialogDescription>
          ) : null}
        </DialogHeader>
        {isPending ? (
          <Cargando />
        ) : isError ? (
          <Aviso tono="advertencia" titulo="No se pudo cargar el resultado.">
            {getErrorMessage(error)}
          </Aviso>
        ) : (
          <div className="overflow-x-auto rounded-md border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cupo</TableHead>
                  <TableHead className={num}>Postulaciones</TableHead>
                  <TableHead className={num}>Registrados</TableHead>
                  <TableHead className={num}>De ellos, con continuidad</TableHead>
                  <TableHead className={num}>En lista de espera</TableHead>
                  <TableHead className={num}>Descartadas</TableHead>
                  <TableHead className={num}>Lugares libres</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.cupos.map((r) => (
                  <TableRow key={r.cupo}>
                    <TableCell className="font-medium whitespace-normal">{r.cupo}</TableCell>
                    <TableCell className={num}>{r.postulaciones}</TableCell>
                    <TableCell className={num}>{r.registrados}</TableCell>
                    <TableCell className={num}>{r.continuidad}</TableCell>
                    <TableCell className={num}>{r.enListaEspera}</TableCell>
                    <TableCell className={num}>{r.descartadas}</TableCell>
                    <TableCell className={num}>{r.libres}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
        <DialogFooter>
          <Button type="button" variant="fill" color="primary" size="sm" onClick={() => onOpenChange(false)}>
            Cerrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/**
 * Generar lista del sorteo (Regla 53): por cupo, las postulaciones en el orden
 * de selección con su número de postulación, su número de sorteo y el estado de
 * su opción, sin datos personales, para publicar o adjuntar a un acta.
 */
export function DialogListaSorteo({
  convocatoria: c,
  cupoInicial,
  onOpenChange,
}: {
  convocatoria: Convocatoria
  cupoInicial?: number
  onOpenChange: (open: boolean) => void
}) {
  const [cupoId, setCupoId] = useState<number | null>(cupoInicial ?? c.cupos[0]?.id ?? null)
  const cupo = c.cupos.find((x) => x.id === cupoId)
  const { data, isPending, isError, error } = useListaSorteoQuery(c.id, cupoId)
  const descargar = useDescargarListaSorteo()
  const [aviso, setAviso] = useState<Error>(null)

  function bajar(formato: "pdf" | "excel") {
    if (cupoId == null) return
    descargar.mutate(
      { id: c.id, cupoId, formato },
      { onError: (err) => setAviso({ id: Date.now(), message: getErrorMessage(err) }) },
    )
  }

  return (
    <Dialog open onOpenChange={(o) => !descargar.isPending && onOpenChange(o)}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Lista del sorteo{cupo ? ` — ${nombreCupo(cupo)}` : ""}</DialogTitle>
          {data ? (
            <DialogDescription>
              Convocatoria {c.anio}. Sorteo ejecutado el {fecha(data.ejecutadaEl)} (Fecha de cierre de postulación). La
              semilla quedó registrada en la Bitácora.
            </DialogDescription>
          ) : null}
        </DialogHeader>
        <NoticeBanner notice={aviso} onClose={() => setAviso(null)} variant="error" />

        {c.cupos.length > 1 ? (
          <CampoSelect
            id="sorteo-cupo"
            label="Cupo"
            required
            value={cupoId == null ? "" : String(cupoId)}
            onChange={(v) => setCupoId(v ? Number(v) : null)}
            opciones={c.cupos.map((x) => ({ value: String(x.id), label: nombreCupo(x) }))}
            className="sm:max-w-sm"
          />
        ) : null}

        {isPending ? (
          <Cargando />
        ) : isError ? (
          <Aviso tono="advertencia" titulo="No se pudo cargar la lista.">
            {getErrorMessage(error)}
          </Aviso>
        ) : (
          <div className="max-h-96 overflow-auto rounded-md border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className={num}>Posición</TableHead>
                  <TableHead>Postulación</TableHead>
                  <TableHead className={num}>Número de sorteo</TableHead>
                  <TableHead>Estado de la opción</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.filas.map((f) => (
                  <TableRow key={f.postulacion}>
                    <TableCell className={num}>{f.posicion}</TableCell>
                    <TableCell className="tabular-nums">{f.postulacion}</TableCell>
                    <TableCell className={num}>{f.sorteo}</TableCell>
                    <TableCell>
                      <Marca {...ESTADO_OPCION[f.estado]} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
        <Aviso tono="info" titulo="Sin datos personales: solo números de postulación y de sorteo." />

        <DialogFooter>
          <Button type="button" variant="outline" color="neutral" size="sm" onClick={() => onOpenChange(false)}>
            Cerrar
          </Button>
          <Button
            type="button"
            variant="outline"
            color="neutral"
            size="sm"
            disabled={!data || descargar.isPending}
            onClick={() => bajar("excel")}
          >
            <FileXlsIcon data-icon="inline-start" />
            Descargar Excel
          </Button>
          <Button
            type="button"
            variant="fill"
            color="primary"
            size="sm"
            disabled={!data || descargar.isPending}
            onClick={() => bajar("pdf")}
          >
            {descargar.isPending ? (
              <SpinnerIcon data-icon="inline-start" className="animate-spin" />
            ) : (
              <FileDownloadOutlinedIcon data-icon="inline-start" />
            )}
            Descargar PDF
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/** Eliminar: solo sin postulaciones; la Bitácora guarda una copia completa. */
export function DialogEliminarConvocatoria({
  convocatoria: c,
  onOpenChange,
}: {
  convocatoria: Convocatoria
  onOpenChange: (open: boolean) => void
}) {
  const { notify } = useNotify()
  const eliminar = useEliminarConvocatoria()
  const [aviso, setAviso] = useState<Error>(null)
  return (
    <Dialog open onOpenChange={(o) => !eliminar.isPending && onOpenChange(o)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <WarningIcon className="size-6 shrink-0 text-red" aria-hidden />
            <DialogTitle>Eliminar la convocatoria {c.anio}</DialogTitle>
          </div>
          <DialogDescription>
            Se eliminan la convocatoria y sus {c.cupos.length} cupos. No se puede deshacer; la Bitácora guarda una copia
            completa.
          </DialogDescription>
        </DialogHeader>
        <NoticeBanner notice={aviso} onClose={() => setAviso(null)} variant="error" />
        <DialogFooter>
          <Button variant="outline" color="neutral" type="button" size="sm" onClick={() => onOpenChange(false)}>
            <XIcon data-icon="inline-start" />
            Cancelar
          </Button>
          <Button
            type="button"
            variant="fill"
            color="destructive"
            size="sm"
            disabled={eliminar.isPending}
            onClick={() =>
              eliminar.mutate(c.id, {
                onSuccess: () => {
                  notify(`Se eliminó la convocatoria ${c.anio}.`, { variant: "success" })
                  onOpenChange(false)
                },
                onError: (err) => setAviso({ id: Date.now(), message: getErrorMessage(err) }),
              })
            }
          >
            {eliminar.isPending ? (
              <SpinnerIcon data-icon="inline-start" className="animate-spin" />
            ) : (
              <TrashIcon data-icon="inline-start" />
            )}
            Eliminar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/** Recuadro de cifras de un cupo («Cupo: 8 · Seleccionados: 0 · Postuladas: 11»). */
export function Cifras({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("flex items-center rounded-md border border-border bg-muted/40 px-3 py-2 text-sm", className)}>
      {children}
    </div>
  )
}
