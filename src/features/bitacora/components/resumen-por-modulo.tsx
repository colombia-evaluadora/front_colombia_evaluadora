import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { InfoIcon } from "@/components/ui/icons"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { getErrorMessage, isNotFoundError } from "@/lib/api-client"

import { useBitacoraResumenQuery } from "@/features/bitacora/api/query/use-bitacora-resumen-query"
import { BITACORA_MODULOS } from "@/features/bitacora/api/types/bitacora"
import { AccionBadge } from "@/features/bitacora/components/accion-badge"
import type { BitacoraFilters } from "@/features/bitacora/hooks/use-bitacora-filters"

const numero = new Intl.NumberFormat("es-CO")

/**
 * Pestaña Resumen por módulo (B.1.LIS.1a / B.1.LIS.2a): cuántos eventos de cada acción hubo en cada módulo, con
 * los filtros de la consulta salvo el módulo. El nombre del módulo va solo en su primera fila para leerlo en
 * bloques. Mientras el backend no publique `/bitacora/resumen` (404) lo dice, sin inventar cifras.
 */
export function ResumenPorModulo({ filters, enabled }: { filters: BitacoraFilters; enabled: boolean }) {
  const { data, isPending, isError, error, refetch } = useBitacoraResumenQuery(filters, enabled)

  if (isError && isNotFoundError(error)) {
    return (
      <Alert variant="info">
        <InfoIcon aria-hidden />
        <AlertDescription>
          El resumen por módulo todavía no está disponible: falta el servicio en el backend
          (<code>/bitacora/resumen</code>). La pestaña Registros funciona normalmente.
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="overflow-hidden rounded-lg border border-border">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="text-foreground">Módulo</TableHead>
            <TableHead className="text-foreground">Acción</TableHead>
            <TableHead className="text-center text-foreground">Cantidad</TableHead>
            <TableHead aria-hidden className="w-full p-0" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {isPending ? (
            Array.from({ length: 6 }, (_, i) => (
              <TableRow key={i}>
                <TableCell colSpan={4}>
                  <Skeleton className="h-5 w-full" />
                </TableCell>
              </TableRow>
            ))
          ) : isError ? (
            <TableRow>
              <TableCell colSpan={4} className="h-24 text-center whitespace-normal">
                {getErrorMessage(error)}{" "}
                <Button size="sm" variant="link" onClick={() => refetch()}>
                  Reintentar
                </Button>
              </TableCell>
            </TableRow>
          ) : !data.length ? (
            <TableRow>
              <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                No hay eventos que coincidan con los filtros aplicados.
              </TableCell>
            </TableRow>
          ) : (
            data.map((f, i) => {
              const primeraDelModulo = i === 0 || data[i - 1]!.modulo !== f.modulo
              return (
                <TableRow
                  key={`${f.modulo}-${f.accion}`}
                  className={primeraDelModulo && i > 0 ? "border-t-2 border-t-border" : undefined}
                >
                  <TableCell className="font-medium whitespace-nowrap">{primeraDelModulo ? BITACORA_MODULOS[f.modulo] : ""}</TableCell>
                  <TableCell>
                    <AccionBadge accion={f.accion} />
                  </TableCell>
                  <TableCell className="text-center tabular-nums">{numero.format(f.cantidad)}</TableCell>
                  <TableCell aria-hidden className="p-0" />
                </TableRow>
              )
            })
          )}
        </TableBody>
      </Table>
    </div>
  )
}
