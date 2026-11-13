import { Badge } from "@/components/ui/badge"
import { ControlPointIcon } from "@/components/ui/icons"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

import { AccionesFila } from "@/features/gestion-estudiantil/commons/components/acciones-fila"
import { SeccionPlegable } from "@/features/gestion-estudiantil/commons/components/seccion-plegable"
import { abreviarPersona, formatFecha } from "@/features/gestion-estudiantil/commons/utils/formatos"
import type { AccionPlan, EstadoAccion } from "@/features/gestion-estudiantil/prevencion/api/types"

const ACCION_ETIQUETA: Record<EstadoAccion, string> = { PENDIENTE: "Pendiente", VENCIDA: "Vencida", CUMPLIDA: "Cumplida" }
const ACCION_COLOR = { PENDIENTE: "warning", VENCIDA: "destructive", CUMPLIDA: "success" } as const

interface Props {
  acciones: AccionPlan[]
  onRegistrarAvance: (accionId: number) => void
}

/** Acciones del plan con su estado y, por fila, registrar avance. */
export function SeccionAccionesPlan({ acciones, onRegistrarAvance }: Props) {
  return (
    <SeccionPlegable encuadrada comoSeccion titulo={`Acciones (${acciones.length})`} contentClassName="px-4 py-2">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Acción</TableHead>
            <TableHead>Responsable</TableHead>
            <TableHead>Estrategia</TableHead>
            <TableHead>Plazo</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead className="w-12">
              <span className="sr-only">Acciones</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {acciones.map((a) => (
            <TableRow key={a.id}>
              <TableCell className="whitespace-normal">
                <strong>{a.tipo_nombre}</strong>
                <span className="block text-muted-foreground">{a.descripcion}</span>
              </TableCell>
              <TableCell>{abreviarPersona(a.responsable_nombre)}</TableCell>
              <TableCell className="whitespace-normal">{a.estrategia_nombre ?? "—"}</TableCell>
              <TableCell>{formatFecha(a.plazo)}</TableCell>
              <TableCell>
                <Badge variant="soft" color={ACCION_COLOR[a.estado]}>
                  <span>{ACCION_ETIQUETA[a.estado]}</span>
                </Badge>
              </TableCell>
              <TableCell>
                <AccionesFila
                  etiqueta={`Acciones de ${a.tipo_nombre}`}
                  acciones={[
                    {
                      id: "avance",
                      label: "Registrar avance",
                      icon: <ControlPointIcon />,
                      disabled: !a.puede_registrar_avance,
                      onSelect: () => onRegistrarAvance(a.id),
                    },
                  ]}
                />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </SeccionPlegable>
  )
}
