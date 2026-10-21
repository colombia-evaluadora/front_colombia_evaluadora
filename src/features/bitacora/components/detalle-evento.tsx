import { Button } from "@/components/ui/button"
import { ArrowCounterClockwiseIcon, InfoIcon } from "@/components/ui/icons"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

import {
  BITACORA_ACCIONES,
  type BitacoraEstado,
  type BitacoraEvento,
} from "@/features/bitacora/api/types/bitacora"

const vacio = (v: string | null | undefined) => v ?? <span className="text-muted-foreground">Sin valor</span>

/** Restaurar se ofrece si el evento lo admite y el usuario tiene Guardar en la vista dueña. */
function puedeRestaurar(evento: BitacoraEvento, estado: BitacoraEstado | undefined) {
  return Boolean(evento.tipoRestauracion && !evento.motivoBloqueoEvento && estado?.puede)
}

/** Subfila de Ver detalle: todos los campos del evento y, a la derecha, Restaurar o el porqué no. */
export function DetalleEvento({
  evento,
  estado,
  onRestaurar,
}: {
  evento: BitacoraEvento
  estado: BitacoraEstado | undefined
  onRestaurar: (evento: BitacoraEvento) => void
}) {
  // Sin permiso (Guardar) no hay motivo que mostrar: simplemente no se ofrece.
  const bloqueo = evento.motivoBloqueoEvento ?? estado?.motivoBloqueo

  return (
    <section aria-label="Detalle del evento" className="flex flex-col gap-3">
      <h3 className="text-sm font-semibold">
        Detalle del evento: {evento.entidad} «{evento.registro}», {BITACORA_ACCIONES[evento.accion]?.toLowerCase()}
      </h3>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          {estado ? (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Campo</TableHead>
                  <TableHead>Valor anterior</TableHead>
                  <TableHead>Valor nuevo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {estado.cambios.map((c) => (
                  <TableRow key={c.campo} className="hover:bg-transparent">
                    <TableCell className="text-muted-foreground">{c.campo}</TableCell>
                    <TableCell>{vacio(c.anterior)}</TableCell>
                    <TableCell>{vacio(c.nuevo)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <Skeleton className="h-24 w-full" />
          )}
          {evento.motivo && (
            <p className="text-sm">
              <span className="text-muted-foreground">Motivo: </span>
              {evento.motivo}
            </p>
          )}
        </div>

        <div className="lg:w-72">
          {puedeRestaurar(evento, estado) ? (
            <Button color="primary" size="sm" onClick={() => onRestaurar(evento)}>
              <ArrowCounterClockwiseIcon data-icon="inline-start" />
              Restaurar
            </Button>
          ) : bloqueo ? (
            <p className="flex items-start gap-2 text-sm text-muted-foreground">
              <InfoIcon aria-hidden className="mt-0.5 size-4 shrink-0 text-blue" />
              <span>
                No se puede restaurar. {bloqueo}
                {estado?.vista && ` Para corregirlo use la acción del módulo ${estado.vista}.`}
              </span>
            </p>
          ) : null}
        </div>
      </div>
    </section>
  )
}
