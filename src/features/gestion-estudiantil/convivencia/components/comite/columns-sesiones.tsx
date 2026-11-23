import type { ColumnDef } from "@tanstack/react-table"

import { columnaOrden } from "@/features/gestion-estudiantil/commons/components/encabezado-orden"
import type { MapaOrden } from "@/features/gestion-estudiantil/commons/utils/orden-servidor"
import type { SesionFila } from "@/features/gestion-estudiantil/convivencia/api/comite-types"
import { formatFecha } from "@/features/gestion-estudiantil/commons/utils/formatos"
import { BadgeQuorum } from "@/features/gestion-estudiantil/convivencia/components/comite/badge-quorum"
import { anchoAccionesFila } from "@/features/gestion-estudiantil/commons/utils/acciones-fila"
import { ACCIONES_SESION, MenuAccionesSesion, type AccionSesion } from "@/features/gestion-estudiantil/convivencia/components/comite/menu-acciones-sesion"
import { textoAsistentes } from "@/features/gestion-estudiantil/convivencia/utils/comite"

/** Columnas que el backend ordena (`BODY.ORDEN`): id de columna → valor de ORDEN. */
export const ORDEN_SESIONES: MapaOrden = {
  fecha: "fecha",
  tipo: "tipo",
}

interface Opciones {
  puedeModificar: boolean
  onAccion: (sesion: SesionFila, accion: AccionSesion) => void
}

/** Columnas de «Sesiones» (G.2.COM.SES.1): Fecha, Tipo, Asistentes, Quórum y Casos tratados. */
export function buildColumnsSesiones({ puedeModificar, onAccion }: Opciones): ColumnDef<SesionFila>[] {
  return [
    {
      ...columnaOrden<SesionFila>(ORDEN_SESIONES, "fecha", "Fecha"),
      accessorKey: "fecha",
      enableHiding: false,
      cell: ({ row }) => (
        <span className="flex flex-col gap-0.5">
          <span className="font-medium">{formatFecha(row.original.fecha)}</span>
        </span>
      ),
    },
    {
      ...columnaOrden<SesionFila>(ORDEN_SESIONES, "tipo", "Tipo"),
      accessorKey: "tipo_nombre",
    },
    {
      ...columnaOrden<SesionFila>(ORDEN_SESIONES, "asistentes", "Asistentes"),
      accessorKey: "asistentes",
      cell: ({ row }) => textoAsistentes(row.original.asistentes, row.original.integrantes_vigentes),
    },
    {
      ...columnaOrden<SesionFila>(ORDEN_SESIONES, "quorum", "Quórum"),
      accessorKey: "con_quorum",
      cell: ({ row }) => <BadgeQuorum conQuorum={row.original.con_quorum} />,
    },
    {
      ...columnaOrden<SesionFila>(ORDEN_SESIONES, "casos", "Casos tratados"),
      accessorKey: "casos_tratados",
    },
    {
      id: "actions",
      header: () => <span className="sr-only">Acciones</span>,
      enableSorting: false,
      enableHiding: false,
      size: anchoAccionesFila(ACCIONES_SESION),
      cell: ({ row }) => (
        <MenuAccionesSesion
          numero={row.original.numero}
          puedeModificar={puedeModificar}
          onAccion={(accion) => onAccion(row.original, accion)}
        />
      ),
    },
  ]
}
