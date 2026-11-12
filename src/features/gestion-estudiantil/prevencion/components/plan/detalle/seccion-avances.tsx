import { Button } from "@/components/ui/button"
import { ControlPointIcon } from "@/components/ui/icons"
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table"

import { SeccionPlegable } from "@/features/gestion-estudiantil/commons/components/seccion-plegable"
import { abreviarPersona, formatFecha } from "@/features/gestion-estudiantil/commons/utils/formatos"
import type { AvancePlan } from "@/features/gestion-estudiantil/prevencion/hooks/use-plan-detalle"

interface Props {
  avances: AvancePlan[]
  puedeRegistrar: boolean
  onRegistrar: () => void
}

/** Avances de todas las acciones, del más reciente al más antiguo. */
export function SeccionAvances({ avances, puedeRegistrar, onRegistrar }: Props) {
  return (
    <SeccionPlegable
      encuadrada
      comoSeccion
      titulo={`Avances (${avances.length})`}
      contentClassName="px-4 py-2"
      accion={
        <Button size="sm" type="button" variant="outline" disabled={!puedeRegistrar} onClick={onRegistrar}>
          <ControlPointIcon data-icon="inline-start" />
          Registrar avance
        </Button>
      }
    >
      {avances.length === 0 ? (
        <p className="py-2 text-sm text-muted-foreground">Aún no hay avances registrados.</p>
      ) : (
        <Table>
          <TableBody>
            {avances.map((v) => (
              <TableRow key={v.id}>
                <TableCell className="w-28">{formatFecha(v.fecha)}</TableCell>
                <TableCell className="font-medium">{v.accion.tipo_nombre}</TableCell>
                <TableCell className="whitespace-normal">{v.descripcion}</TableCell>
                <TableCell>{abreviarPersona(v.registrado_por)}</TableCell>
                <TableCell>{v.cumplida ? "Acción cumplida" : ""}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </SeccionPlegable>
  )
}
