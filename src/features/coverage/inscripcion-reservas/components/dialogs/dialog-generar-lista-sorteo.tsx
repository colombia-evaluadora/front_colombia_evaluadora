import { useState } from "react"
import { useMutation } from "@tanstack/react-query"
import { format, parseISO } from "date-fns"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { FilePdfIcon, ShuffleIcon } from "@/components/ui/icons"
import { Skeleton } from "@/components/ui/skeleton"
import { Spinner } from "@/components/ui/spinner"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { getErrorMessage } from "@/lib/api-client"
import { downloadReport } from "@/lib/report-client"

import { useEjecutarSorteo } from "@/features/coverage/inscripcion-reservas/api/mutations/acciones-inscripcion"
import { useListaSorteoQuery } from "@/features/coverage/inscripcion-reservas/api/query/use-inscripciones-query"
import type { ListaSorteo } from "@/features/coverage/inscripcion-reservas/api/types/inscripcion"
import { ESTADO_OPCION_UI } from "@/features/coverage/inscripcion-reservas/api/ui-mappings-inscripcion"

/**
 * Generar lista del sorteo (Sección 3.7, Regla 53): la lista publicable, sin
 * datos personales, para cartelera o acta. Solo con Desempate Sorteo y desde
 * la Fecha de cierre de inscripción. Si el sorteo no se ha hecho, primero se confirma
 * (es único e irrepetible); después el modal muestra el documento antes de descargarlo.
 */
export function GenerarListaSorteoDialog({
  grupoId,
  grupoNombre,
  sorteoEjecutado,
  grado,
  jornada,
  disabled,
  motivoDeshabilitado,
}: {
  grupoId: string
  grupoNombre: string
  sorteoEjecutado: boolean
  grado: string
  jornada: string | undefined
  disabled: boolean
  motivoDeshabilitado: string
}) {
  const [open, setOpen] = useState(false)
  // El encabezado tarda en refrescarse tras sortear: el modal pasa al documento sin esperarlo.
  const [recienSorteado, setRecienSorteado] = useState(false)
  const conSorteo = sorteoEjecutado || recienSorteado
  const sortear = useEjecutarSorteo()
  const lista = useListaSorteoQuery(grupoId, grado, jornada, open && conSorteo)
  // Plantilla inscripcion-lista-sorteo del reporting-service: solo PDF, va a cartelera o al acta.
  const generar = useMutation({
    mutationFn: () =>
      downloadReport("inscripcion-lista-sorteo", {
        format: "pdf",
        filters: { FK_TGRUPO_ADMISION: grupoId, GRADO: grado, JORNADA: jornada ?? null },
      }),
    onSuccess: (res) => {
      if (res.status === "ok") {
        toast.success(res.message)
        setOpen(false)
      } else {
        toast.error(res.message)
      }
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  })
  const sinFilas = !lista.data?.rows.length

  const boton = (
    <Button
      variant="outline"
      color="neutral"
      disabled={disabled || !grado}
      onClick={() => setOpen(true)}
    >
      <ShuffleIcon data-icon="inline-start" />
      Generar lista del sorteo
    </Button>
  )

  return (
    <>
      {disabled ? (
        <Tooltip>
          <TooltipTrigger render={<span className="w-fit" />}>{boton}</TooltipTrigger>
          <TooltipContent>{motivoDeshabilitado}</TooltipContent>
        </Tooltip>
      ) : (
        boton
      )}
      <Dialog
        open={open}
        onOpenChange={(o) => !generar.isPending && !sortear.isPending && setOpen(o)}
      >
        {!conSorteo ? (
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Generar lista del sorteo</DialogTitle>
              <DialogDescription>
                Se sorteará el orden de las inscripciones de cada opción del grupo {grupoNombre}. El
                sorteo se hace una sola vez y no se puede repetir.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                variant="outline"
                color="neutral"
                disabled={sortear.isPending}
                onClick={() => setOpen(false)}
              >
                Cancelar
              </Button>
              <Button
                disabled={sortear.isPending}
                onClick={() =>
                  sortear.mutate(grupoId, {
                    onSuccess: () => setRecienSorteado(true),
                    onError: (e) => toast.error(getErrorMessage(e)),
                  })
                }
              >
                {sortear.isPending && <Spinner data-icon="inline-start" />}
                Generar lista del sorteo
              </Button>
            </DialogFooter>
          </DialogContent>
        ) : (
          <DialogContent className="sm:max-w-4xl">
            <DialogHeader>
              <DialogTitle>Generar lista del sorteo</DialogTitle>
            </DialogHeader>

            <div className="max-h-[65vh] overflow-y-auto rounded-lg border border-border p-6">
              {lista.isPending ? (
                <div className="grid gap-3">
                  <Skeleton className="h-14 w-2/3" />
                  <Skeleton className="h-5 w-1/2" />
                  <Skeleton className="h-48 w-full" />
                </div>
              ) : lista.isError ? (
                <p className="text-sm text-red">{getErrorMessage(lista.error)}</p>
              ) : (
                <DocumentoListaSorteo lista={lista.data} />
              )}
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                color="neutral"
                disabled={generar.isPending}
                onClick={() => setOpen(false)}
              >
                Cerrar
              </Button>
              <Button disabled={generar.isPending || sinFilas} onClick={() => generar.mutate()}>
                {generar.isPending ? (
                  <Spinner data-icon="inline-start" />
                ) : (
                  <FilePdfIcon data-icon="inline-start" />
                )}
                Descargar PDF
              </Button>
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>
    </>
  )
}

/** El documento tal como se publica: encabezado del establecimiento, contexto del sorteo y la lista. */
function DocumentoListaSorteo({ lista }: { lista: ListaSorteo }) {
  const ee = lista.establecimiento
  const iniciales = ee.nombre
    .replace(/^Instituci[oó]n Educativa\s*/i, "")
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0])
    .join("")
    .toUpperCase()
  const contexto = [
    `Grupo de admisión ${lista.grupoAdmision}`,
    `Grado ${lista.grado}`,
    lista.jornada ? `Jornada ${lista.jornada}` : "Todas las jornadas",
    `Sorteo del ${format(parseISO(lista.fechaSorteo), "dd/MM/yyyy")}`,
  ].join(" · ")

  return (
    <article className="grid gap-5 text-sm">
      <header className="flex items-start gap-4 border-b border-border pb-5">
        <div className="grid size-14 shrink-0 place-items-center rounded-lg bg-blue-22 font-semibold text-blue">
          {iniciales || "IE"}
        </div>
        <div className="grid flex-1 gap-1">
          <p className="text-base font-medium">{ee.nombre}</p>
          <p className="text-muted-foreground">
            DANE {ee.dane} · NIT {ee.nit}
          </p>
          <p className="text-muted-foreground">{ee.municipio}</p>
        </div>
        <div className="text-right text-muted-foreground">
          <p>Generado el</p>
          <p className="text-foreground">
            {format(parseISO(lista.generadoEl), "dd/MM/yyyy · HH:mm")}
          </p>
        </div>
      </header>

      <div className="grid gap-1.5">
        <h3 className="font-semibold tracking-wide uppercase">
          Lista del sorteo · Orden de admisión
        </h3>
        <p className="text-muted-foreground">{contexto}</p>
      </div>
      <p className="text-xs text-muted-foreground">
        Lista sin datos personales, en el orden de admisión: primero por prioridad y luego por
        número de sorteo.
      </p>

      {lista.rows.length === 0 ? (
        <p className="rounded-lg border border-border p-6 text-center text-muted-foreground">
          No hay opciones inscritas en este grado y jornada.
        </p>
      ) : (
        <div className="overflow-hidden rounded-lg border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Posición</TableHead>
                <TableHead>N.º de inscripción</TableHead>
                <TableHead>Grupo de prioridad</TableHead>
                <TableHead>N.º de sorteo</TableHead>
                <TableHead>Estado de la opción</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lista.rows.map((r) => (
                <TableRow key={r.posicion}>
                  <TableCell>{r.posicion}</TableCell>
                  <TableCell>{r.numeroInscripcion}</TableCell>
                  <TableCell>{r.prioridad ?? "Sin prioridad"}</TableCell>
                  <TableCell>{r.numeroSorteo ?? "—"}</TableCell>
                  <TableCell>{ESTADO_OPCION_UI[r.estadoOpcion].label}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        La semilla del sorteo queda guardada en la bitácora para que una auditoría pueda regenerar
        los mismos números.
      </p>
    </article>
  )
}
